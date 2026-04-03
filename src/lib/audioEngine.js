/**
 * Web Audio API wrapper for playback and time sync.
 */
export default class AudioEngine {
  constructor() {
    this.ctx = null
    this.buffer = null
    this.source = null
    this.gainNode = null
    this.startTime = 0
    this.startOffset = 0
    this.playing = false
    this.duration = 0
    this._volume = 0.75
    this._onTimeUpdate = null
    this._rafId = null
  }

  async load(file) {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.gainNode = this.ctx.createGain()
      this.gainNode.gain.value = this._volume
      this.gainNode.connect(this.ctx.destination)
    }
    const arrayBuffer = await file.arrayBuffer()
    this.buffer = await this.ctx.decodeAudioData(arrayBuffer)
    this.duration = this.buffer.duration * 1000
    this.startOffset = 0
  }

  play(fromMs) {
    if (!this.buffer || !this.ctx) return
    this.stop()

    this.source = this.ctx.createBufferSource()
    this.source.buffer = this.buffer
    this.source.connect(this.gainNode)
    this.source.onended = () => {
      if (this.playing) {
        this.playing = false
        this._stopRaf()
      }
    }

    const offsetSec = (fromMs ?? this.startOffset) / 1000
    this.startOffset = fromMs ?? this.startOffset
    this.startTime = this.ctx.currentTime
    this.source.start(0, Math.max(0, offsetSec))
    this.playing = true
    this._startRaf()
  }

  pause() {
    if (!this.playing) return
    this.startOffset = this.getCurrentTimeMs()
    this.stop()
  }

  stop() {
    if (this.source) {
      try { this.source.stop() } catch {}
      this.source.disconnect()
      this.source = null
    }
    this.playing = false
    this._stopRaf()
  }

  seek(ms) {
    this.startOffset = Math.max(0, Math.min(ms, this.duration))
    if (this.playing) {
      this.play(this.startOffset)
    }
  }

  get volume() {
    return this._volume
  }

  set volume(v) {
    this._volume = Math.max(0, Math.min(1, v))
    if (this.gainNode) {
      this.gainNode.gain.value = this._volume
    }
  }

  getCurrentTimeMs() {
    if (!this.playing || !this.ctx) return this.startOffset
    return this.startOffset + (this.ctx.currentTime - this.startTime) * 1000
  }

  onTimeUpdate(callback) {
    this._onTimeUpdate = callback
  }

  _startRaf() {
    const tick = () => {
      if (!this.playing) return
      this._onTimeUpdate?.(this.getCurrentTimeMs())
      this._rafId = requestAnimationFrame(tick)
    }
    this._rafId = requestAnimationFrame(tick)
  }

  _stopRaf() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
  }

  destroy() {
    this.stop()
    if (this.ctx) {
      this.ctx.close()
      this.ctx = null
    }
  }
}
