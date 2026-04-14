import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const MENU_SYSTEM_PROMPT = `You are a German menu parser. Extract all items from this menu image.
For each item return: name (string), price (float in euros),
suggested_vat_rate (7 or 19 as integer based on German VAT rules:
food to eat in = 19%, food to take away = 7%, coffee/hot drinks = 19%,
cold drinks = 19%, bakery items takeaway = 7%, alcohol = 19%).
Return ONLY valid JSON array. No markdown. No explanation.
Example: [{"name":"Cappuccino","price":3.50,"suggested_vat_rate":19},
{"name":"Croissant","price":2.20,"suggested_vat_rate":7}]`

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { data: { user } } = await createClient().auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

    const formData = await req.formData()
    const image = formData.get('image') as File | null
    // merchant_id available for future per-merchant menu scoping
    formData.get('merchant_id')

    if (!image) return NextResponse.json({ error: 'Kein Bild hochgeladen' }, { status: 400 })
    if (image.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'Bild zu groß. Maximale Größe: 20 MB' }, { status: 400 })
    }

    // Convert to base64
    const bytes = await image.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = image.type || 'image/jpeg'

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: MENU_SYSTEM_PROMPT },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' } },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.1,
    })

    const content = response.choices[0]?.message?.content?.trim()
    if (!content) throw new Error('Keine Antwort von GPT-4o erhalten')

    // Parse JSON
    let items: Array<{ name: string; price: number; suggested_vat_rate: 7 | 19 }>
    try {
      items = JSON.parse(content)
    } catch {
      // Try to extract JSON from text
      const match = content.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('Ungültige Antwort — kein JSON gefunden')
      items = JSON.parse(match[0])
    }

    // Validate and clean
    const cleaned = items
      .filter(item => item.name && typeof item.price === 'number' && item.price > 0)
      .map(item => ({
        name: String(item.name).substring(0, 100),
        price: Math.round(item.price * 100) / 100,
        suggested_vat_rate: item.suggested_vat_rate === 7 ? 7 : 19 as 7 | 19,
      }))

    return NextResponse.json({ items: cleaned, count: cleaned.length })
  } catch (err) {
    console.error('Menu scan error:', err)
    const msg = err instanceof Error ? err.message : 'Scan fehlgeschlagen'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
