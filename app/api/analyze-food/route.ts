import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const FoodSchema = z.object({
  name: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number(),
  confidence: z.number().min(0).max(1),
})

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

export async function POST(request: Request) {
  try {
    // 1. Auth check
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Input validation
    const body = await request.json()
    const { enrichedPrompt, imageBase64 } = body

    if (!enrichedPrompt || typeof enrichedPrompt !== 'string') {
      return NextResponse.json({ error: 'enrichedPrompt is required' }, { status: 400 })
    }

    if (imageBase64) {
      if (typeof imageBase64 !== 'string') {
        return NextResponse.json({ error: 'Invalid image' }, { status: 400 })
      }
      if (imageBase64.length > MAX_IMAGE_SIZE_BYTES) {
        return NextResponse.json({ error: 'Image too large (max 5MB)' }, { status: 400 })
      }
    }

    // 3. Gemini analysis
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `You are a precise nutritional analyzer for a calorie tracking app.

${enrichedPrompt}

Based on the above food description, provide accurate nutritional information.
Be realistic with estimates. If quantities are approximate, use typical serving sizes.

Return ONLY valid JSON, no markdown:
{"name":"string","calories":number,"protein":number,"carbs":number,"fat":number,"fiber":number,"confidence":0.0-1.0}

confidence reflects how certain you are about the nutritional values (1.0 = exact data available, 0.5 = rough estimate)`

    let result
    if (imageBase64) {
      result = await model.generateContent([
        prompt,
        { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
      ])
    } else {
      result = await model.generateContent(prompt)
    }

    const text = result.response.text().trim()
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = FoodSchema.parse(JSON.parse(jsonStr))
    return NextResponse.json(parsed)

  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
