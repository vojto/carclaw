const VOICE_ID = 'UgBBYS2sOqTuMpoF3BR0'
const MODEL_ID = 'eleven_multilingual_v2'
const WS_URL = `wss://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream-input?model_id=${MODEL_ID}`

export class TtsStreamer {
  private ws: WebSocket | null = null
  private audioCtx: AudioContext | null = null
  private nextStartTime = 0

  onError: ((error: string) => void) | null = null

  // ─── Lifecycle ───────────────────────────────────────────

  open(apiKey: string) {
    this.audioCtx = new AudioContext()
    this.nextStartTime = 0

    const ws = new WebSocket(WS_URL)
    this.ws = ws

    ws.onopen = () => {
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
    }

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)

      if (msg.audio) {
        this.playChunk(msg.audio)
      }

      if (msg.error) {
        this.onError?.(msg.message || msg.error)
      }
    }

    ws.onerror = () => {
      this.onError?.('ElevenLabs WebSocket connection failed')
    }
  }

  sendText(chunk: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify({ text: chunk }))
  }

  flush() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify({ text: '' }))
  }

  close() {
    this.ws?.close()
    this.ws = null
  }

  // ─── Audio Playback ──────────────────────────────────────

  private async playChunk(base64Audio: string) {
    const ctx = this.audioCtx
    if (!ctx) return

    try {
      const binary = atob(base64Audio)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }

      const audioBuffer = await ctx.decodeAudioData(bytes.buffer)
      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(ctx.destination)

      const now = ctx.currentTime
      const startAt = Math.max(now, this.nextStartTime)
      source.start(startAt)
      this.nextStartTime = startAt + audioBuffer.duration
    } catch {
      // skip undecodable chunks
    }
  }
}
