const VOICE_ID = 'UgBBYS2sOqTuMpoF3BR0'
const MODEL_ID = 'eleven_multilingual_v2'
const WS_URL = `wss://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream-input?model_id=${MODEL_ID}`

export class TtsStreamer {
  private ws: WebSocket | null = null
  private isReady = false
  private pendingChunks: string[] = []

  private audio: HTMLAudioElement | null = null
  private mediaSource: MediaSource | null = null
  private sourceBuffer: SourceBuffer | null = null
  private appendQueue: Uint8Array[] = []

  onError: ((error: string) => void) | null = null

  // ─── Lifecycle ───────────────────────────────────────────

  open(apiKey: string) {
    this.isReady = false
    this.pendingChunks = []
    this.appendQueue = []
    this.initMediaSource()

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
        this.appendAudio(msg.audio)
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
      this.endStream()
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
    if (this.audio) {
      this.audio.pause()
      this.audio.removeAttribute('src')
      this.audio.load()
      this.audio = null
    }
    this.mediaSource = null
    this.sourceBuffer = null
  }

  // ─── Audio Playback (MediaSource) ─────────────────────────

  private initMediaSource() {
    const mediaSource = new MediaSource()
    this.mediaSource = mediaSource

    const audio = new Audio()
    this.audio = audio
    audio.src = URL.createObjectURL(mediaSource)

    mediaSource.addEventListener('sourceopen', () => {
      const sb = mediaSource.addSourceBuffer('audio/mpeg')
      this.sourceBuffer = sb
      sb.addEventListener('updateend', () => this.processAppendQueue())
      console.log('[11labs] playback: MediaSource open, SourceBuffer ready')
      this.processAppendQueue()
    })
  }

  private appendAudio(base64Audio: string) {
    const binary = atob(base64Audio)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    this.appendQueue.push(bytes)
    this.processAppendQueue()
  }

  private processAppendQueue() {
    if (!this.sourceBuffer || this.sourceBuffer.updating || this.appendQueue.length === 0) return

    const chunk = this.appendQueue.shift()!
    this.sourceBuffer.appendBuffer(chunk)
    console.log('[11labs] playback: appended', chunk.byteLength, 'bytes, queue:', this.appendQueue.length)

    if (this.audio && this.audio.paused) {
      this.audio.play().catch(() => {})
    }
  }

  private endStream() {
    if (this.mediaSource && this.mediaSource.readyState === 'open') {
      // Wait for any pending appends before ending
      const finish = () => {
        if (this.sourceBuffer && this.sourceBuffer.updating) {
          this.sourceBuffer.addEventListener('updateend', finish, { once: true })
          return
        }
        if (this.appendQueue.length > 0) {
          this.processAppendQueue()
          if (this.sourceBuffer) {
            this.sourceBuffer.addEventListener('updateend', finish, { once: true })
          }
          return
        }
        if (this.mediaSource && this.mediaSource.readyState === 'open') {
          this.mediaSource.endOfStream()
          console.log('[11labs] playback: endOfStream')
        }
      }
      finish()
    }
  }
}
