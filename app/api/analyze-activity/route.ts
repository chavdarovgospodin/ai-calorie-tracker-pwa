import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const ActivityResultSchema = z.object({
  valid: z.boolean(),
  reason: z.string().nullable(),
  error_type: z
    .enum(['not_an_activity', 'too_vague', 'other'])
    .nullable()
    .optional(),
  result: z
    .object({
      activityName: z.string(),
      caloriesBurned: z.number(),
      durationMinutes: z.number(),
      confidence: z.number().min(0).max(1),
    })
    .nullable(),
});

export async function POST(request: Request) {
  try {
    // 1. Auth check
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          },
        },
      },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Input validation
    const body = await request.json();
    const { text, weightKg: rawWeight } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    if (text.length > 500) {
      return NextResponse.json({ error: 'Text too long' }, { status: 400 });
    }

    const weightKg =
      typeof rawWeight === 'number' &&
      isFinite(rawWeight) &&
      rawWeight >= 20 &&
      rawWeight <= 300
        ? Math.round(rawWeight)
        : 70;

    // 3. Gemini single-call validate + analyze
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a physical activity analyzer for a calorie tracking app. Your job is to:
1. Determine if the input describes a physical activity that can have calories burned estimated
2. If valid activity: calculate calories burned
3. If not valid: explain why

User input: <activity_input>${text}</activity_input>
User weight: ${weightKg}kg

Validation rules:
- Valid: any exercise, sport, physical activity, movement (running, walking, cycling, swimming, gym, yoga, dancing, hiking, cleaning, gardening, etc.)
- Valid: step counts ("10,000 steps", "walked 5km")
- Valid: vague but physical activities ("played with my kids for 1 hour", "stood all day at work")
- Invalid: sedentary activities (watching TV, reading, sleeping, sitting, driving) → error_type: "not_an_activity"
- Invalid: non-activity text (greetings, food descriptions, random text) → error_type: "not_an_activity"
- Invalid: too vague to estimate ("did some stuff", "was active today") → error_type: "too_vague"

If VALID:
- Use MET (Metabolic Equivalent of Task) values for accuracy
- Consider the user's weight in all calculations
- Be realistic — don't overestimate
- Set valid: true and populate result

If INVALID:
- Set valid: false
- Set result: null
- Set error_type to the appropriate category
- Write a friendly reason in the same language as the user's input

Return ONLY valid JSON, no markdown:
{
  "valid": boolean,
  "reason": string | null,
  "error_type": "not_an_activity" | "too_vague" | "other" | null,
  "result": {
    "activityName": "string",
    "caloriesBurned": number,
    "durationMinutes": number,
    "confidence": 0.0-1.0
  } | null
}`;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini timeout')), 25000),
    );
    const geminiResult = await Promise.race([
      model.generateContent(prompt),
      timeoutPromise,
    ]);

    const responseText = geminiResult.response.text().trim();
    const jsonStr = responseText.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = ActivityResultSchema.parse(JSON.parse(jsonStr));
    return NextResponse.json(parsed);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
