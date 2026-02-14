import { Model, model, prop, modelAction, getRoot } from 'mobx-keystone'
import { when } from 'mobx'
import { ChatEventPayloadSchema } from '../lib/claw-client'
import { AudioRecorder } from '../lib/audio-recorder'
import type { RootStore } from './root-store'

function extractText(message?: { content: { type: string; text?: string }[] }): string {
  if (!message) return ''
  return message.content
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text!)
    .join('\n')
    .split('\n')
    .filter((line) => !line.startsWith('MEDIA:'))
    .join('\n')
    .trim()
}

async function speak(text: string) {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) return

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audio.onended = () => URL.revokeObjectURL(url)
  await audio.play()
}

@model('carclaw/ChatStore')
export class ChatStore extends Model({
  loading: prop<boolean>(false).withSetter(),
  lastAssistantText: prop<string>('').withSetter(),
  recording: prop<boolean>(false).withSetter(),
  transcribing: prop<boolean>(false).withSetter(),
}) {
  private unsubscribe: (() => void) | null = null
  private cancelWhen: (() => void) | null = null
  private recorder: AudioRecorder | null = null

  persistKeys() {
    return ['lastAssistantText']
  }

  private get root(): RootStore {
    return getRoot<RootStore>(this)
  }

  // ─── Lifecycle ───────────────────────────────────────────────

  open(sessionKey: string) {
    this.close()
    this.cancelWhen = when(
      () => this.root.connected,
      () => this.load(sessionKey),
    )
  }

  close() {
    this.cancelWhen?.()
    this.cancelWhen = null
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
  }

  // ─── Data ────────────────────────────────────────────────────

  private async load(sessionKey: string) {
    const client = this.root.client
    if (!client) return

    this.setLoading(true)
    try {
      const res = await client.chatHistory(sessionKey)
      const lastAssistant = [...res.messages]
        .reverse()
        .find((m) => m.role === 'assistant')
      if (lastAssistant) {
        this.setLastAssistantText(extractText(lastAssistant))
      }
    } catch {
      // ignore — cached lastAssistantText is still displayed
    } finally {
      this.setLoading(false)
    }

    // Subscribe to live chat events
    this.unsubscribe = client.on('chat', (raw) => {
      const parsed = ChatEventPayloadSchema.safeParse(raw)
      if (!parsed.success) return
      const payload = parsed.data
      if (payload.sessionKey !== sessionKey) return

      if (payload.state === 'delta' || payload.state === 'final') {
        const text = extractText(payload.message)
        if (text) {
          this.setLastAssistantText(text)
        }
      }

      // Speak the final response
      if (payload.state === 'final') {
        const text = extractText(payload.message)
        if (text) speak(text)
      }
    })
  }

  // ─── Recording ───────────────────────────────────────────────

  @modelAction
  toggleRecording() {
    if (this.recording) {
      this.stopRecordingAndSend()
    } else {
      this.startRecording()
    }
  }

  async startRecording() {
    this.recorder = new AudioRecorder()
    await this.recorder.start()
    this.setRecording(true)
  }

  async stopRecordingAndSend() {
    if (!this.recorder) return

    const blob = await this.recorder.stop()
    this.recorder = null
    this.setRecording(false)
    this.setTranscribing(true)

    try {
      const form = new FormData()
      form.append('file', blob, 'recording.webm')

      const res = await fetch('/api/transcribe', { method: 'POST', body: form })
      if (!res.ok) throw new Error('Transcription failed')

      const { text } = (await res.json()) as { text: string }
      if (!text?.trim()) return

      const sessionKey = this.root.selectedSessionKey
      const client = this.root.client
      if (!sessionKey || !client) return

      await client.sendMessage(sessionKey, text.trim())
    } finally {
      this.setTranscribing(false)
    }
  }
}
