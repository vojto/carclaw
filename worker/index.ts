import { Hono } from 'hono'

type Bindings = {
  GROQ_API_KEY: string
}

const GROQ_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'

const app = new Hono<{ Bindings: Bindings }>()

app.get('/api/health', (c) => c.json({ ok: true }))

app.post('/api/transcribe', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']

  if (!(file instanceof File)) {
    return c.json({ error: 'Missing audio file' }, 400)
  }

  const form = new FormData()
  form.append('file', file, file.name || 'audio.webm')
  form.append('model', 'whisper-large-v3-turbo')
  form.append('response_format', 'verbose_json')

  const res = await fetch(GROQ_TRANSCRIPTION_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.env.GROQ_API_KEY}` },
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    return c.json({ error: 'Groq API error', status: res.status, detail: text }, 502)
  }

  const result = (await res.json()) as { text: string; language?: string }

  return c.json({
    text: result.text,
    language: result.language ?? null,
  })
})

export default app
