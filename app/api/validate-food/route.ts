import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const ValidatorSchema = z.object({
  valid: z.boolean(),
  reason: z.string().nullable(),
  enriched_prompt: z.string().nullable(),
});

const MAX_TEXT_LENGTH = 500;
const MAX_BASE64_LENGTH = Math.ceil((5 * 1024 * 1024 * 4) / 3);

export async function POST(request: Request) {
  try {
    // Auth check
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

    const body = await request.json();

    // Input validation
    if (
      body.text &&
      typeof body.text === 'string' &&
      body.text.length > MAX_TEXT_LENGTH
    ) {
      return NextResponse.json({ error: 'Text too long' }, { status: 400 });
    }
    if (body.imageBase64) {
      if (typeof body.imageBase64 !== 'string') {
        return NextResponse.json({ error: 'Invalid image' }, { status: 400 });
      }
      if (body.imageBase64.length > MAX_BASE64_LENGTH) {
        return NextResponse.json(
          { error: 'Image too large (max 5MB)' },
          { status: 400 },
        );
      }
    }
    const mimeType =
      typeof body.mimeType === 'string' && body.mimeType.startsWith('image/')
        ? body.mimeType
        : 'image/jpeg';

    if (!body.text && !body.imageBase64) {
      return NextResponse.json(
        { error: 'Text or image is required' },
        { status: 400 },
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const description =
      typeof body.description === 'string'
        ? body.description.slice(0, 200)
        : '';

    const textPrompt = `You are a food input validator for a calorie tracking app.

Analyze this input and determine if it describes food, a meal, a drink, or ingredients that can be nutritionally analyzed.

User input: <food_input>${body.text}</food_input>

Rules:
- Valid: any food, meal, drink, ingredient, or combination (even if vague quantities)
- Valid: water, coffee, tea, alcohol (macros may be near zero)
- Valid: menu items, product names, cuisine types with dishes
- Invalid: non-food text (greetings, questions, random text, emotions)
- Invalid: too vague to analyze ("something tasty", "a little bit of food")
- Invalid: non-food objects or activities

If VALID, create an enriched_prompt that:
1. Structures the food items clearly
2. Estimates standard portion sizes if not specified
3. Notes any ambiguities for the analyzer to consider
4. Is written in English regardless of input language

If INVALID, write a friendly reason in the same language as the user's input explaining what went wrong and what they should do instead.

Return ONLY valid JSON, no markdown:
{"valid": boolean, "reason": string | null, "enriched_prompt": string | null}`;

    const imagePrompt = `You are a food image validator for a calorie tracking app.

Analyze this image and determine if it shows food, a meal, a drink, ingredients, a food menu, or food packaging that can be nutritionally analyzed.

${description ? `User also provided this description: <description>${description}</description>` : ''}

Rules:
- Valid: any food, meal, drink, ingredients visible in the image
- Valid: restaurant menus, food packaging/labels
- Valid: partially eaten meals, messy plates
- Invalid: non-food objects (cars, people, animals, landscapes, etc.)
- Invalid: image too dark, blurry, or unclear to identify contents
- Invalid: empty plates with no food

If VALID, create an enriched_prompt that:
1. Describes what you see in the image in detail
2. Estimates portion sizes based on visual cues (plate size, context)
3. Lists all visible food items and components
4. Notes cooking methods if visible (fried, grilled, boiled)
5. Is written in English

If INVALID, write a friendly reason explaining what's wrong with the image and what the user should do instead. Match the language of any provided description, otherwise use English.

Return ONLY valid JSON, no markdown:
{"valid": boolean, "reason": string | null, "enriched_prompt": string | null}`;

    const prompt = body.imageBase64 ? imagePrompt : textPrompt;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini timeout')), 20000),
    );
    let result;
    if (body.imageBase64) {
      result = await Promise.race([
        model.generateContent([
          prompt,
          { inlineData: { mimeType: mimeType, data: body.imageBase64 } },
        ]),
        timeoutPromise,
      ]);
    } else {
      result = await Promise.race([
        model.generateContent(prompt),
        timeoutPromise,
      ]);
    }

    const text = result.response.text().trim();
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = ValidatorSchema.parse(JSON.parse(jsonStr));
    return NextResponse.json(parsed);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
  }
}
