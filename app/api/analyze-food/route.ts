import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const FoodSchema = z.object({
  name: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number(),
  confidence: z.number().min(0).max(1),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `Analyze this food and return ONLY valid JSON (no markdown, no code blocks):
${body.text ? `Food description: ${body.text}` : `Food image provided. Additional info: ${body.description || 'none'}`}

Return exactly this JSON structure:
{"name":"string","calories":number,"protein":number,"carbs":number,"fat":number,"fiber":number,"confidence":0.0-1.0}`

    let result
    if (body.imageBase64) {
      result = await model.generateContent([
        prompt,
        { inlineData: { mimeType: 'image/jpeg', data: body.imageBase64 } },
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
