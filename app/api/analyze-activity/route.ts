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
    const { enrichedPrompt, weightKg: rawWeight } = body

    if (!enrichedPrompt || typeof enrichedPrompt !== 'string') {
      return NextResponse.json({ error: 'enrichedPrompt is required' }, { status: 400 })
    }

    const MAX_ENRICHED_LENGTH = 2000
    if (enrichedPrompt.length > MAX_ENRICHED_LENGTH) {
      return NextResponse.json({ error: 'Prompt too long' }, { status: 400 })
    }

    const weightKg =
      typeof rawWeight === 'number' &&
      isFinite(rawWeight) &&
      rawWeight >= 20 &&
      rawWeight <= 300
        ? Math.round(rawWeight)
        : 70

    // 3. Gemini analysis
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

    const prompt = `You are a precise physical activity analyzer for a calorie tracking app.

${enrichedPrompt}

User weight: ${weightKg}kg

Based on the above activity description, estimate calories burned.
Use MET (Metabolic Equivalent of Task) values for accuracy.
Consider the user's weight in all calculations.
Be realistic — don't overestimate.

Return ONLY valid JSON, no markdown:
{"activityName":"string","caloriesBurned":number,"durationMinutes":number,"confidence":0.0-1.0}

confidence reflects how certain you are (1.0 = clear activity with duration and intensity, 0.5 = estimated duration or intensity)`

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini timeout')), 20000)
    )
    const result = await Promise.race([
      model.generateContent(prompt),
      timeoutPromise,
    ])
    const text = result.response.text().trim()
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = ActivitySchema.parse(JSON.parse(jsonStr))
    return NextResponse.json(parsed)

  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
