import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MENU_SYSTEM_PROMPT = `You are a German menu parser. Extract ALL menu items from this image or PDF page.
For each item return: name (string), price (float in euros),
suggested_vat_rate (7 or 19 as integer based on German VAT rules:
- food to eat in (Restaurant) = 19%
- food to take away = 7%
- coffee/hot drinks = 19%
- cold soft drinks = 19%
- bakery items takeaway = 7%
- alcohol = 19%
- default assumption: takeaway = 7%, dine-in = 19%).
Return ONLY a valid JSON array. No markdown, no explanation, no code blocks.
Example: [{"name":"Cappuccino","price":3.50,"suggested_vat_rate":19},{"name":"Croissant","price":2.20,"suggested_vat_rate":7}]`

export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  try {
    const { data: { user } } = await createClient().auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('image') as File | null
    const fileType = formData.get('file_type') as string | null

    if (!file) return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 })

    const isPdf = fileType === 'pdf' || file.type === 'application/pdf'

    if (isPdf && file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF zu groß. Maximale Größe: 10 MB' }, { status: 400 })
    }
    if (!isPdf && file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'Bild zu groß. Maximale Größe: 20 MB' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    let imageUrl: string
    if (isPdf) {
      // GPT-4o can read PDFs directly via base64 as application/pdf
      imageUrl = `data:application/pdf;base64,${base64}`
    } else {
      const mimeType = file.type || 'image/jpeg'
      imageUrl = `data:${mimeType};base64,${base64}`
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: MENU_SYSTEM_PROMPT },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          ],
        },
      ],
      max_tokens: 4000,
      temperature: 0.1,
    })

    const content = response.choices[0]?.message?.content?.trim()
    if (!content) throw new Error('Keine Antwort von GPT-4o erhalten')

    // Parse JSON — handle potential markdown wrapping
    let items: Array<{ name: string; price: number; suggested_vat_rate: 7 | 19 }>
    try {
      const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      items = JSON.parse(clean)
    } catch {
      const match = content.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('Ungültige Antwort — kein JSON gefunden. Bitte versuchen Sie ein klareres Bild.')
      items = JSON.parse(match[0])
    }

    if (!Array.isArray(items)) throw new Error('Ungültiges Format von GPT-4o')

    const cleaned = items
      .filter(item => item.name && typeof item.price === 'number' && item.price > 0)
      .map(item => ({
        name: String(item.name).substring(0, 100).trim(),
        price: Math.round(item.price * 100) / 100,
        suggested_vat_rate: item.suggested_vat_rate === 7 ? 7 : 19 as 7 | 19,
      }))
      .slice(0, 100) // max 100 items per scan

    return NextResponse.json({ items: cleaned, count: cleaned.length })
  } catch (err) {
    console.error('Menu scan error:', err)
    const msg = err instanceof Error ? err.message : 'Scan fehlgeschlagen'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
