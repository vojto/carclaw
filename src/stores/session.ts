import { Model, model, prop, modelAction, getRoot } from 'mobx-keystone'
import type { ChatEventPayload } from '../lib/claw-client'
import { AudioRecorder } from '../lib/audio-recorder'
import type { RootStore } from './root-store'

const CAR_PROMPT = `I'm using you from my car. Can you reply with such format that you wrap the plain text message you want to play as speech in <tts></tts> and you also include markdown that you wanna display on car screen in <screen></screen>. I'll take care of playing the speech and formatting markdown and showing it to user. Here follows my request:

\`\`\`
`

function extractRawText(message?: { content: { type: string; text?: string }[] }): string {
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

function extractTagContent(text: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`)
  const match = text.match(regex)
  return match ? match[1].trim() : ''
}

function extractScreenContent(text: string): string {
  return extractTagContent(text, 'screen') || text
}

function extractTtsContent(text: string): string {
  return extractTagContent(text, 'tts') || text
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

function wrapMessage(userText: string): string {
  return CAR_PROMPT + userText + '\n```'
}

@model('carclaw/Session')
export class Session extends Model({
  key: prop<string>(),
  displayName: prop<string>(''),
  derivedTitle: prop<string>(''),
  lastMessagePreview: prop<string>(''),
  lastAssistantText: prop<string>(''),
  updatedAt: prop<string>(''),
  loading: prop<boolean>(false).withSetter(),
  recording: prop<boolean>(false).withSetter(),
  transcribing: prop<boolean>(false).withSetter(),
}) {
  private recorder: AudioRecorder | null = null

  persistKeys() {
    return ['key', 'displayName', 'derivedTitle', 'lastMessagePreview', 'lastAssistantText', 'updatedAt']
  }

  private get root(): RootStore {
    return getRoot<RootStore>(this)
  }

  // ─── Server Sync ───────────────────────────────────────────

  @modelAction
  mergeFromServer(data: { displayName?: string; derivedTitle?: string; lastMessagePreview?: string; updatedAt?: string }) {
    if (data.displayName !== undefined) this.displayName = data.displayName
    if (data.derivedTitle !== undefined) this.derivedTitle = data.derivedTitle
    if (data.lastMessagePreview !== undefined) this.lastMessagePreview = data.lastMessagePreview
    if (data.updatedAt !== undefined) this.updatedAt = data.updatedAt
  }

  // ─── Chat Events ──────────────────────────────────────────

  @modelAction
  handleChatEvent(payload: ChatEventPayload) {
    if (payload.state === 'delta' || payload.state === 'final') {
      const raw = extractRawText(payload.message)
      if (raw) {
        const screen = extractScreenContent(raw)
        this.lastAssistantText = screen
        this.lastMessagePreview = extractTtsContent(raw).slice(0, 100)
      }
    }

    if (payload.state === 'final') {
      const raw = extractRawText(payload.message)
      if (raw) {
        const tts = extractTtsContent(raw)
        if (tts) speak(tts)
      }
    }
  }

  // ─── History ──────────────────────────────────────────────

  async loadHistory() {
    const client = this.root.client
    if (!client) return

    this.setLoading(true)
    try {
      const res = await client.chatHistory(this.key)
      const lastAssistant = [...res.messages]
        .reverse()
        .find((m) => m.role === 'assistant')
      if (lastAssistant) {
        const raw = extractRawText(lastAssistant)
        this.setLastAssistantText(extractScreenContent(raw))
      }
    } catch {
      // ignore — cached lastAssistantText is still displayed
    } finally {
      this.setLoading(false)
    }
  }

  @modelAction
  private setLastAssistantText(text: string) {
    this.lastAssistantText = text
  }

  // ─── Recording ────────────────────────────────────────────

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

      const client = this.root.client
      if (!client) return

      await client.sendMessage(this.key, wrapMessage(text.trim()))
    } finally {
      this.setTranscribing(false)
    }
  }
}
