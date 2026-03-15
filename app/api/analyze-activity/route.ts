import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ActivitySchema = z.object({
  activityName: z.string(),
  caloriesBurned: z.number(),
  durationMinutes: z.number(),
  confidence: z.number().min(0).max(1),
})

const MAX_DESCRIPTION_LENGTH = 500

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
    const { description } = body

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json({ error: 'Description too long' }, { status: 400 })
    }

    const rawWeight = body.weightKg
    const weightKg =
      typeof rawWeight === 'number' &&
      isFinite(rawWeight) &&
      rawWeight >= 20 &&
      rawWeight <= 300
        ? Math.round(rawWeight)
        : 70

    // 3. Gemini analysis
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `Analyze this workout/activity and estimate calories burned. Return ONLY valid JSON (no markdown, no code blocks).

Activity description: ${description.trim()}
User weight: ${weightKg}kg

Consider the user's weight when calculating calorie burn. Be realistic with estimates.

Return exactly this JSON structure:
{"activityName":"string","caloriesBurned":number,"durationMinutes":number,"confidence":0.0-1.0}`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = ActivitySchema.parse(JSON.parse(jsonStr))
    return NextResponse.json(parsed)

  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
