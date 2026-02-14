import { Hono } from 'hono'

type Bindings = {
  GROQ_API_KEY: string
  ELEVENLABS_API_KEY: string
}

const GROQ_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const ELEVENLABS_VOICE_ID = 'cgSgspJ2msm6clMCkdW9'
const ELEVENLABS_TTS_URL = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`

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

app.post('/api/tts', async (c) => {
  const { text } = (await c.req.json()) as { text: string }

  if (!text?.trim()) {
    return c.json({ error: 'Missing text' }, 400)
  }

  const res = await fetch(ELEVENLABS_TTS_URL, {
    method: 'POST',
    headers: {
      'xi-api-key': c.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      speed: 1.2,
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    return c.json({ error: 'ElevenLabs API error', status: res.status, detail }, 502)
  }

  return new Response(res.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-cache',
    },
  })
})

export default app
