import { Model, model, prop, modelAction, getRoot } from 'mobx-keystone'
import { reaction } from 'mobx'
import { ChatEventPayloadSchema } from '../lib/claw-client'
import { AudioRecorder } from '../lib/audio-recorder'
import type { RootStore } from './root-store'

function extractText(message?: { content: { type: string; text?: string }[] }): string {
  if (!message) return ''
  return message.content
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text!)
    .join('\n')
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
  private disposeReaction: (() => void) | null = null
  private recorder: AudioRecorder | null = null

  persistKeys() {
    return ['lastAssistantText']
  }

  private get root(): RootStore {
    return getRoot<RootStore>(this)
  }

  /** Load history + subscribe to live chat events for the given session. */
  open(sessionKey: string) {
    this.close()

    if (this.root.connected) {
      this.load(sessionKey)
      return
    }

    // Wait for connection, then load
    this.disposeReaction = reaction(
      () => this.root.connected,
      (connected) => {
        if (connected) {
          this.load(sessionKey)
          this.disposeReaction?.()
          this.disposeReaction = null
        }
      },
    )
  }

  close() {
    this.disposeReaction?.()
    this.disposeReaction = null
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
  }

  private load(sessionKey: string) {
    const client = this.root.client
    if (!client) return

    this.setLoading(true)

    // Load latest assistant message from history
    client.chatHistory(sessionKey).then((res) => {
      const lastAssistant = [...res.messages]
        .reverse()
        .find((m) => m.role === 'assistant')
      if (lastAssistant) {
        this.setLastAssistantText(extractText(lastAssistant))
      }
      this.setLoading(false)
    }).catch(() => {
      this.setLoading(false)
    })

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

  @modelAction
  toggleRecording() {
    // Actual async work delegated outside modelAction
    if (this.recording) {
      this.stopRecordingAndSend()
    } else {
      this.startRecording()
    }
  }
}
