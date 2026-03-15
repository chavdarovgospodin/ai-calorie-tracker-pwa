import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const ActivitySchema = z.object({
  activityName: z.string(),
  caloriesBurned: z.number(),
  durationMinutes: z.number(),
  confidence: z.number().min(0).max(1),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { description, weightKg = 70 } = body

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `Analyze this workout/activity and estimate calories burned. Return ONLY valid JSON (no markdown, no code blocks).

Activity description: ${description}
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
