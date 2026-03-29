import type { Disposable } from '../types/common.js'

const MAX_DURATION_MS = 60_000
const MAX_BYTES = 50 * 1024 * 1024 // 50 MB
const VIDEO_BITRATE = 3_000_000 // 3 Mbps

const CODEC_PRIORITY = [
  'video/webm;codecs=vp8,opus',
  'video/mp4;codecs=avc1.42E01E',
  'video/webm;codecs=vp9,opus',
  'video/webm',
] as const

function detectMimeType(): string {
  for (const mime of CODEC_PRIORITY) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return ''
}

function getExtension(mimeType: string): string {
  return mimeType.includes('mp4') ? 'mp4' : 'webm'
}

export class VideoCapture implements Disposable {
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private totalBytes = 0
  private timeoutHandle = 0
  private _recording = false
  private mimeType = ''

  // Recording indicator element
  readonly indicatorEl = document.createElement('div')

  constructor() {
    const el = this.indicatorEl
    el.style.display = 'none'
    el.style.alignItems = 'center'
    el.style.gap = '6px'
    el.style.pointerEvents = 'none'

    const dot = document.createElement('span')
    dot.style.width = '10px'
    dot.style.height = '10px'
    dot.style.borderRadius = '50%'
    dot.style.background = '#ff3333'
    dot.style.animation = 'rec-pulse 1s infinite'

    const label = document.createElement('span')
    label.textContent = 'REC'
    label.style.color = '#ff3333'
    label.style.fontFamily = 'system-ui, sans-serif'
    label.style.fontSize = '13px'
    label.style.fontWeight = '600'

    el.append(dot, label)

    // Inject pulse keyframes
    if (!document.getElementById('rec-pulse-style')) {
      const style = document.createElement('style')
      style.id = 'rec-pulse-style'
      style.textContent = '@keyframes rec-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }'
      document.head.appendChild(style)
    }
  }

  static isSupported(): boolean {
    return typeof MediaRecorder !== 'undefined'
  }

  isRecording(): boolean {
    return this._recording
  }

  start(canvas: HTMLCanvasElement, audioStream?: MediaStream | null): void {
    if (this._recording) return
    if (!VideoCapture.isSupported()) return

    this.mimeType = detectMimeType()
    if (!this.mimeType) return

    // Capture video at 30fps
    const videoStream = canvas.captureStream(30)

    // Merge audio if available
    let combinedStream: MediaStream
    if (audioStream) {
      const audioTracks = audioStream.getAudioTracks()
      const videoTracks = videoStream.getVideoTracks()
      combinedStream = new MediaStream([...videoTracks, ...audioTracks])
    } else {
      combinedStream = videoStream
    }

    this.recorder = new MediaRecorder(combinedStream, {
      mimeType: this.mimeType,
      videoBitsPerSecond: VIDEO_BITRATE,
    })

    this.chunks = []
    this.totalBytes = 0
    this._recording = true

    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data)
        this.totalBytes += e.data.size
        if (this.totalBytes >= MAX_BYTES) this.stop()
      }
    }

    this.recorder.onstop = () => {
      this.download()
      this._recording = false
      this.indicatorEl.style.display = 'none'
    }

    this.recorder.onerror = () => {
      this._recording = false
      this.indicatorEl.style.display = 'none'
    }

    this.recorder.start()
    this.indicatorEl.style.display = 'flex'

    // Safety timeout
    this.timeoutHandle = window.setTimeout(() => this.stop(), MAX_DURATION_MS)
  }

  stop(): void {
    if (!this._recording || !this.recorder) return
    clearTimeout(this.timeoutHandle)
    if (this.recorder.state === 'recording') {
      this.recorder.stop()
    }
  }

  private download(): void {
    if (this.chunks.length === 0) return

    const blob = new Blob(this.chunks, { type: this.mimeType })
    const ext = getExtension(this.mimeType)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `conway-${timestamp}.${ext}`

    const url = URL.createObjectURL(blob)
    try {
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
    this.chunks.length = 0
  }

  dispose(): void {
    this.stop()
    this.chunks.length = 0
  }
}
