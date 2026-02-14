export class AudioRecorder {
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []

  async start() {
    this.chunks = []
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.recorder = new MediaRecorder(this.stream, { mimeType: 'audio/webm' })
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
        const blob = new Blob(this.chunks, { type: 'audio/webm' })
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
