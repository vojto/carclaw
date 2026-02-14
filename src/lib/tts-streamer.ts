const VOICE_ID = 'UgBBYS2sOqTuMpoF3BR0'
const MODEL_ID = 'eleven_multilingual_v2'
const WS_URL = `wss://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream-input?model_id=${MODEL_ID}`

export class TtsStreamer {
  private ws: WebSocket | null = null
  private audioCtx: AudioContext | null = null
  private nextStartTime = 0
  private isReady = false
  private pendingChunks: string[] = []

  onError: ((error: string) => void) | null = null

  // ─── Lifecycle ───────────────────────────────────────────

  open(apiKey: string) {
    this.audioCtx = new AudioContext()
    this.nextStartTime = 0
    this.isReady = false
    this.pendingChunks = []

    const ws = new WebSocket(WS_URL)
    this.ws = ws

    ws.onopen = () => {
      console.log('[tts] ws open, sending init')
      ws.send(
        JSON.stringify({
          text: ' ',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
          },
          xi_api_key: apiKey,
        })
      )
      this.isReady = true

      // Flush any chunks that arrived before WS was open
      for (const chunk of this.pendingChunks) {
        console.log('[tts] sending queued chunk:', JSON.stringify(chunk).slice(0, 100))
        ws.send(JSON.stringify({ text: chunk }))
      }
      this.pendingChunks = []
    }

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)

      if (msg.audio) {
        console.log('[tts] received audio chunk, length:', msg.audio.length)
        this.playChunk(msg.audio)
      }

      if (msg.error) {
        console.error('[tts] error from server:', msg)
        this.isReady = false
        this.onError?.(msg.message || msg.error)
      }

      if (!msg.audio && !msg.error) {
        console.log('[tts] non-audio message:', JSON.stringify(msg).slice(0, 200))
      }
    }

    ws.onerror = (ev) => {
      console.error('[tts] ws error:', ev)
      this.onError?.('ElevenLabs WebSocket connection failed')
    }

    ws.onclose = (ev) => {
      console.log('[tts] ws closed, code:', ev.code, 'reason:', ev.reason)
      this.isReady = false
    }
  }

  sendText(chunk: string) {
    if (!this.ws) return
    if (!this.isReady) {
      // Only queue if WS is still connecting (readyState 0), not if it closed
      if (this.ws.readyState === WebSocket.CONNECTING) {
        console.log('[tts] sendText queued (ws connecting):', JSON.stringify(chunk).slice(0, 100))
        this.pendingChunks.push(chunk)
      }
      return
    }
    console.log('[tts] sendText:', JSON.stringify(chunk).slice(0, 100))
    this.ws.send(JSON.stringify({ text: chunk }))
  }

  flush() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('[tts] flush skipped, ws not open')
      return
    }
    console.log('[tts] flush (end of stream)')
    this.ws.send(JSON.stringify({ text: '' }))
  }

  close() {
    console.log('[tts] close')
    this.ws?.close()
    this.ws = null
    this.audioCtx?.close()
    this.audioCtx = null
  }

  // ─── Audio Playback ──────────────────────────────────────

  private async playChunk(base64Audio: string) {
    const ctx = this.audioCtx
    if (!ctx) {
      console.warn('[tts] playChunk: no AudioContext')
      return
    }

    console.log('[tts] playChunk: decoding', base64Audio.length, 'base64 chars, ctx.state:', ctx.state)

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
      console.log('[tts] playChunk: scheduled', audioBuffer.duration.toFixed(2), 's at', startAt.toFixed(2))
    } catch (err) {
      console.warn('[tts] playChunk: decode failed:', err)
    }
  }
}
