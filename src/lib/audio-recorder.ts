// MIME types to try in order of preference.
// Tesla's Chromium-based browser may not support audio/webm.
const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/wav',
  '',  // empty = let browser pick default
]

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  for (const mime of MIME_CANDIDATES) {
    if (!mime || MediaRecorder.isTypeSupported(mime)) return mime
  }
  return ''
}

export class AudioRecorder {
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  mimeType = ''

  async start() {
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('MediaRecorder API not available in this browser')
    }

    this.chunks = []
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    this.mimeType = pickMimeType()
    const options: MediaRecorderOptions = {}
    if (this.mimeType) options.mimeType = this.mimeType

    this.recorder = new MediaRecorder(this.stream, options)
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }
    this.recorder.start()
  }

  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.recorder || this.recorder.state !== 'recording') {
        reject(new Error('Not recording'))
        return
      }

      this.recorder.onstop = () => {
        const type = this.mimeType || this.recorder?.mimeType || 'audio/webm'
        const blob = new Blob(this.chunks, { type })
        this.cleanup()
        resolve(blob)
      }

      this.recorder.stop()
    })
  }

  private cleanup() {
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop()
      this.stream = null
    }
    this.recorder = null
    this.chunks = []
  }
}
