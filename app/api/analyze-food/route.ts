import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const FoodResultSchema = z.object({
  valid: z.boolean(),
  reason: z.string().nullable(),
  result: z
    .object({
      name: z.string(),
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
      fiber: z.number(),
      confidence: z.number().min(0).max(1),
    })
    .nullable(),
});

const MAX_BASE64_LENGTH = Math.ceil((5 * 1024 * 1024 * 4) / 3);

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
    const { text, imageBase64, description, mimeType: rawMimeType, locale } = body;
    const respondIn = locale === 'bg' ? 'Bulgarian' : 'English';
    const mimeType =
      typeof rawMimeType === 'string' && rawMimeType.startsWith('image/')
        ? rawMimeType
        : 'image/jpeg';

    if (body.text && typeof body.text === 'string' && body.text.length > 500) {
      return NextResponse.json({ error: 'Text too long' }, { status: 400 });
    }
    if (imageBase64) {
      if (typeof imageBase64 !== 'string') {
        return NextResponse.json({ error: 'Invalid image' }, { status: 400 });
      }
      if (imageBase64.length > MAX_BASE64_LENGTH) {
        return NextResponse.json(
          { error: 'Image too large (max 5MB)' },
          { status: 400 },
        );
      }
    }
    if (!text && !imageBase64) {
      return NextResponse.json(
        { error: 'Text or image is required' },
        { status: 400 },
      );
    }

    // 3. Gemini single-call validate + analyze
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const textPrompt = `You are a food analyzer for a calorie tracking app. Your job is to:
1. Determine if the input describes food, a meal, a drink, or ingredients
2. If valid food: analyze the nutritional content
3. If not valid food: explain why

User input: <food_input>${text}</food_input>

Validation rules:
- Valid: any food, meal, drink, ingredient, or combination (even if vague quantities)
- Valid: water, coffee, tea, alcohol (macros may be near zero)
- Valid: menu items, product names, cuisine types
- Invalid: non-food text (greetings, questions, random text, emotions)
- Invalid: too vague to analyze ("something tasty", "a little bit of food")
- Invalid: non-food objects or activities

If VALID:
- Estimate nutritional values accurately
- Use standard portion sizes if quantities not specified
- Set valid: true and populate result

If INVALID:
- Set valid: false
- Set result: null
- Write a friendly reason in ${respondIn} explaining what went wrong

Respond in ${respondIn}.

Return ONLY valid JSON, no markdown:
{
  "valid": boolean,
  "reason": string | null,
  "result": {
    "name": "string",
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number,
    "fiber": number,
    "confidence": 0.0-1.0
  } | null
}`;

    const descriptionStr =
      typeof description === 'string' ? description.slice(0, 200) : '';

    const imagePrompt = `You are a food image analyzer for a calorie tracking app. Your job is to:
1. Determine if the image shows food, a meal, a drink, ingredients, a food menu, or food packaging
2. If valid food image: analyze the nutritional content
3. If not valid: explain why

${descriptionStr ? `User also provided this description: <description>${descriptionStr}</description>` : ''}

Validation rules:
- Valid: any food, meal, drink, ingredients, restaurant menus, food packaging/labels
- Valid: partially eaten meals, messy plates
- Invalid: non-food objects (cars, people, animals, landscapes, etc.)
- Invalid: image too dark, blurry, or unclear to identify contents
- Invalid: empty plates with no food

If VALID:
- Describe what you see and estimate nutritional content
- Use visual cues (plate size, context) to estimate portions
- Set valid: true and populate result

If INVALID:
- Set valid: false
- Set result: null
- Write a friendly reason in ${respondIn}.

Respond in ${respondIn}.

Return ONLY valid JSON, no markdown:
{
  "valid": boolean,
  "reason": string | null,
  "result": {
    "name": "string",
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number,
    "fiber": number,
    "confidence": 0.0-1.0
  } | null
}`;

    const prompt = imageBase64 ? imagePrompt : textPrompt;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini timeout')), 25000),
    );

    let geminiResult;
    if (imageBase64) {
      geminiResult = await Promise.race([
        model.generateContent([
          prompt,
          { inlineData: { mimeType, data: imageBase64 } },
        ]),
        timeoutPromise,
      ]);
    } else {
      geminiResult = await Promise.race([
        model.generateContent(prompt),
        timeoutPromise,
      ]);
    }

    const responseText = geminiResult.response.text().trim();
    const jsonStr = responseText.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = FoodResultSchema.parse(JSON.parse(jsonStr));
    return NextResponse.json(parsed);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
