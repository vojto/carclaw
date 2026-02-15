import { Model, model, prop, modelAction, getRoot } from 'mobx-keystone'
import { when } from 'mobx'
import type { ChatEventPayload } from '../lib/claw-client'
import { AudioRecorder } from '../lib/audio-recorder'
import { TtsStreamer } from '../lib/tts-streamer'
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

function wrapMessage(userText: string): string {
  return CAR_PROMPT + userText + '\n```'
}

@model('carclaw/Session')
export class Session extends Model({
  key: prop<string>(),
  kind: prop<string>(''),
  displayName: prop<string>(''),
  derivedTitle: prop<string>(''),
  lastMessagePreview: prop<string>(''),
  lastAssistantText: prop<string>(''),
  updatedAt: prop<string>(''),
  isLoading: prop<boolean>(false).withSetter(),
  isRecording: prop<boolean>(false).withSetter(),
  isThinking: prop<boolean>(false).withSetter(),
  ttsError: prop<string>('').withSetter(),
}) {
  private recorder: AudioRecorder | null = null
  private ttsStreamer: TtsStreamer | null = null
  private deltaBuffer = ''
  private isTtsTagOpen = false
  private isTtsDone = false
  private ttsStreamedUpTo = 0
  private lastDeltaRunId = ''

  persistKeys() {
    return ['key', 'kind', 'displayName', 'derivedTitle', 'lastMessagePreview', 'lastAssistantText', 'updatedAt']
  }

  private get root(): RootStore {
    return getRoot<RootStore>(this)
  }

  // ─── Server Sync ───────────────────────────────────────────

  get preview(): string {
    return extractTtsContent(this.lastMessagePreview)
  }

  @modelAction
  mergeFromServer(data: { kind?: string; displayName?: string; derivedTitle?: string; lastMessagePreview?: string; updatedAt?: string }) {
    if (data.kind !== undefined) this.kind = data.kind
    if (data.displayName !== undefined) this.displayName = data.displayName
    if (data.derivedTitle !== undefined) this.derivedTitle = data.derivedTitle
    if (data.lastMessagePreview !== undefined) this.lastMessagePreview = data.lastMessagePreview
    if (data.updatedAt !== undefined) this.updatedAt = data.updatedAt
  }

  // ─── Chat Events ──────────────────────────────────────────

  @modelAction
  handleChatEvent(payload: ChatEventPayload) {
    if (payload.state === 'delta') {
      this.handleDelta(payload)
      return
    }

    if (payload.state === 'final') {
      this.handleFinal(payload)
      return
    }
  }

  // ─── Delta Streaming ──────────────────────────────────────

  private get isActiveChat(): boolean {
    return this.root.selectedSessionKey === this.key
  }

  private handleDelta(payload: ChatEventPayload) {
    const raw = extractRawText(payload.message)
    if (!raw) return

    // Only stream TTS when the user is viewing this session
    if (!this.isActiveChat) return

    // Open TTS streamer on first delta of a new run
    if (!this.ttsStreamer || this.lastDeltaRunId !== payload.runId) {
      const apiKey = this.root.elevenlabsApiKey
      if (!apiKey) return

      // Close previous streamer if switching runs
      if (this.ttsStreamer) {
        this.ttsStreamer.flush()
        this.ttsStreamer.close()
      }

      const streamer = new TtsStreamer()
      streamer.onError = (err) => this.setTtsError(err)
      streamer.open(apiKey)
      this.ttsStreamer = streamer
      this.deltaBuffer = ''
      this.isTtsTagOpen = false
      this.isTtsDone = false
      this.ttsStreamedUpTo = 0
      this.lastDeltaRunId = payload.runId
    }

    // Deltas are cumulative — replace buffer entirely
    this.deltaBuffer = raw
    if (this.isTtsDone) return
    this.processTtsBuffer()
  }

  private processTtsBuffer() {
    const buf = this.deltaBuffer

    if (!this.isTtsTagOpen) {
      const openIdx = buf.indexOf('<tts>')
      if (openIdx === -1) return
      this.isTtsTagOpen = true
      this.ttsStreamedUpTo = openIdx + 5 // after '<tts>'
    }

    // Stream content inside <tts> tag
    const closeIdx = buf.indexOf('</tts>', this.ttsStreamedUpTo)
    if (closeIdx !== -1) {
      // Tag closed — send remaining content and flush
      const remaining = buf.slice(this.ttsStreamedUpTo, closeIdx)
      if (remaining) this.ttsStreamer?.sendText(remaining)
      this.ttsStreamedUpTo = closeIdx + 6
      this.isTtsTagOpen = false
      this.isTtsDone = true
      this.ttsStreamer?.flush()
    } else {
      // Tag still open — stream what we have, leaving a small buffer
      // to avoid splitting '</tts>' across chunks
      const safeEnd = buf.length - 6
      if (safeEnd > this.ttsStreamedUpTo) {
        const chunk = buf.slice(this.ttsStreamedUpTo, safeEnd)
        if (chunk) this.ttsStreamer?.sendText(chunk)
        this.ttsStreamedUpTo = safeEnd
      }
    }
  }

  private handleFinal(payload: ChatEventPayload) {
    // Keep ttsStreamer reference alive so startRecording can close it.
    // The next run's first delta will replace it (different runId).
    this.deltaBuffer = ''
    this.isTtsTagOpen = false
    this.isTtsDone = false
    this.ttsStreamedUpTo = 0
    this.lastDeltaRunId = ''

    const raw = extractRawText(payload.message)
    if (!raw) return

    this.isThinking = false
    this.lastAssistantText = extractScreenContent(raw)
    this.lastMessagePreview = extractTtsContent(raw).slice(0, 100)
  }

  // ─── History ──────────────────────────────────────────────

  async loadHistory() {
    await when(() => this.root.connected)

    const client = this.root.client
    if (!client) return

    this.setIsLoading(true)
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
      this.setIsLoading(false)
    }
  }

  @modelAction
  private setLastAssistantText(text: string) {
    this.lastAssistantText = text
  }

  // ─── Recording ────────────────────────────────────────────

  @modelAction
  toggleRecording() {
    if (this.isRecording) {
      this.stopRecordingAndSend()
    } else {
      this.startRecording()
    }
  }

  async startRecording() {
    // Stop any in-progress TTS playback
    if (this.ttsStreamer) {
      this.ttsStreamer.close()
      this.ttsStreamer = null
    }

    this.recorder = new AudioRecorder()
    await this.recorder.start()
    this.setIsRecording(true)
  }

  async stopRecordingAndSend() {
    if (!this.recorder) return

    const blob = await this.recorder.stop()
    this.recorder = null
    this.setIsRecording(false)
    this.setLastAssistantText('')
    this.setIsThinking(true)
    this.setTtsError('')

    try {
      const groqApiKey = this.root.groqApiKey
      if (!groqApiKey) throw new Error('Groq API key not configured')

      const form = new FormData()
      form.append('file', blob, 'recording.webm')
      form.append('model', 'whisper-large-v3-turbo')
      form.append('response_format', 'verbose_json')

      const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqApiKey}` },
        body: form,
      })
      if (!res.ok) throw new Error('Transcription failed')

      const { text } = (await res.json()) as { text: string }
      if (!text?.trim()) return

      const client = this.root.client
      if (!client) return

      await client.sendMessage(this.key, wrapMessage(text.trim()))
    } catch {
      // ignore — screen stays empty until next response
    }
  }
}
