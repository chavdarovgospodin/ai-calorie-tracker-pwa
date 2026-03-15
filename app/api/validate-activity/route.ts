import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ValidatorSchema = z.object({
  valid: z.boolean(),
  error_type: z.enum(['not_an_activity', 'too_vague', 'other']).nullable().optional(),
  reason: z.string().nullable(),
  enriched_prompt: z.string().nullable(),
})

const MAX_TEXT_LENGTH = 500

export async function POST(request: Request) {
  try {
    // Auth check
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

    const body = await request.json()

    // Input validation
    if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }
    if (body.text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: 'Text too long' }, { status: 400 })
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

    const prompt = `You are a physical activity validator for a calorie tracking app.

Analyze this input and determine if it describes a physical activity, exercise, movement, or sport that can have calories burned estimated.

User input: <activity_input>${body.text}</activity_input>

Rules:
- Valid: any exercise, sport, physical activity, movement (running, walking, cycling, swimming, gym, yoga, dancing, hiking, cleaning, gardening, etc.)
- Valid: step counts ("10,000 steps", "walked 5km")
- Valid: vague but physical activities ("played with my kids for 1 hour", "stood all day at work")
- Valid: activities without duration if intensity is clear
- Invalid: sedentary activities (watching TV, reading, sleeping, sitting, driving) → error_type: "not_an_activity"
- Invalid: non-activity text (greetings, food descriptions, random text) → error_type: "not_an_activity"
- Invalid: too vague to estimate ("did some stuff", "was active today") → error_type: "too_vague"

If VALID, create an enriched_prompt that:
1. Identifies the specific activity type clearly
2. Extracts or estimates duration if mentioned
3. Notes intensity level if mentioned or implied
4. Converts step counts to approximate distance/duration if relevant
5. Structures everything for accurate calorie estimation
6. Is written in English regardless of input language

If INVALID, set error_type to the matching category and write a friendly reason in the same language as the user's input explaining what went wrong.

Return ONLY valid JSON, no markdown:
{"valid": boolean, "error_type": "not_an_activity" | "too_vague" | "other" | null, "reason": string | null, "enriched_prompt": string | null}`

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini timeout')), 20000)
    )
    const result = await Promise.race([
      model.generateContent(prompt),
      timeoutPromise,
    ])
    const text = result.response.text().trim()
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = ValidatorSchema.parse(JSON.parse(jsonStr))
    return NextResponse.json(parsed)

  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 })
  }
}
