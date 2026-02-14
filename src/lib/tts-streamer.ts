const VOICE_ID = 'UgBBYS2sOqTuMpoF3BR0'
const MODEL_ID = 'eleven_multilingual_v2'
const WS_URL = `wss://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream-input?model_id=${MODEL_ID}`

export class TtsStreamer {
  private ws: WebSocket | null = null
  private audioCtx: AudioContext | null = null
  private nextStartTime = 0
  private isReady = false
  private pendingChunks: string[] = []
  private decodeQueue: string[] = []
  private isDecoding = false

  onError: ((error: string) => void) | null = null

  // ─── Lifecycle ───────────────────────────────────────────

  open(apiKey: string) {
    this.audioCtx = new AudioContext()
    this.nextStartTime = 0
    this.isReady = false
    this.pendingChunks = []
    this.decodeQueue = []
    this.isDecoding = false

    const ws = new WebSocket(WS_URL)
    this.ws = ws

    ws.onopen = () => {
      const init = {
        text: ' ',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
        },
        xi_api_key: apiKey,
      }
      console.log('[11labs] ▶ init', JSON.stringify(init).slice(0, 120))
      ws.send(JSON.stringify(init))
      this.isReady = true

      for (const chunk of this.pendingChunks) {
        console.log('[11labs] ▶ text (queued):', JSON.stringify(chunk).slice(0, 120))
        ws.send(JSON.stringify({ text: chunk }))
      }
      this.pendingChunks = []
    }

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)

      if (msg.audio) {
        console.log('[11labs] ◀ audio chunk:', msg.audio.length, 'base64 chars')
        this.enqueueAudio(msg.audio)
      } else {
        console.log('[11labs] ◀', JSON.stringify(msg).slice(0, 200))
      }

      if (msg.error) {
        this.isReady = false
        this.onError?.(msg.message || msg.error)
      }
    }

    ws.onerror = () => {
      console.error('[11labs] ws error')
      this.onError?.('ElevenLabs WebSocket connection failed')
    }

    ws.onclose = (ev) => {
      console.log('[11labs] ws closed, code:', ev.code, 'reason:', ev.reason)
      this.isReady = false
    }
  }

  sendText(chunk: string) {
    if (!this.ws) return
    if (!this.isReady) {
      if (this.ws.readyState === WebSocket.CONNECTING) {
        this.pendingChunks.push(chunk)
      }
      return
    }
    console.log('[11labs] ▶ text:', JSON.stringify(chunk).slice(0, 120))
    this.ws.send(JSON.stringify({ text: chunk }))
  }

  flush() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    console.log('[11labs] ▶ flush (empty string)')
    this.ws.send(JSON.stringify({ text: '' }))
  }

  close() {
    this.ws?.close()
    this.ws = null
    this.audioCtx?.close()
    this.audioCtx = null
  }

  // ─── Audio Playback ──────────────────────────────────────

  private enqueueAudio(base64Audio: string) {
    this.decodeQueue.push(base64Audio)
    if (!this.isDecoding) {
      this.processQueue()
    }
  }

  private async processQueue() {
    this.isDecoding = true
    while (this.decodeQueue.length > 0) {
      const base64Audio = this.decodeQueue.shift()!
      await this.decodeAndPlay(base64Audio)
    }
    this.isDecoding = false
  }

  private async decodeAndPlay(base64Audio: string) {
    const ctx = this.audioCtx
    if (!ctx) return

    try {
      const binary = atob(base64Audio)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }

      const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0))
      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(ctx.destination)

      const now = ctx.currentTime
      const startAt = Math.max(now, this.nextStartTime)
      source.start(startAt)
      this.nextStartTime = startAt + audioBuffer.duration
      console.log('[11labs] playback: scheduled', audioBuffer.duration.toFixed(2) + 's, ctx.state:', ctx.state)
    } catch (err) {
      console.warn('[11labs] playback: decode failed:', err)
    }
  }
}
