/**
 * PCM AudioWorklet processor
 *
 * Capture path: mic (Float32 48kHz) → downsample 3x → Int16 16kHz → post 1920-byte frames
 * Playback path: receive Int16 16kHz frames → upsample 3x → Float32 48kHz output
 */
class PcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Capture accumulator (Float32 16kHz samples)
    this._capBuf = new Float32Array(0);
    this._FRAME = 960; // 16kHz * 60ms

    // Playback jitter buffer (Float32 48kHz)
    this._playBuf = new Float32Array(0);

    this.port.onmessage = (e) => {
      const raw = e.data;
      if (!raw) return;
      // Accept ArrayBuffer or TypedArray
      const buf = raw instanceof ArrayBuffer ? raw : raw.buffer;
      const int16 = new Int16Array(buf);

      // Upsample 16kHz → 48kHz: repeat each sample 3 times
      const up = new Float32Array(int16.length * 3);
      for (let i = 0; i < int16.length; i++) {
        const s = int16[i] / 32768.0;
        up[i * 3] = s;
        up[i * 3 + 1] = s;
        up[i * 3 + 2] = s;
      }

      // Append to playback buffer
      const next = new Float32Array(this._playBuf.length + up.length);
      next.set(this._playBuf);
      next.set(up, this._playBuf.length);
      this._playBuf = next;
    };
  }

  process(inputs, outputs) {
    // ── Capture ─────────────────────────────────────────────────────────────
    const inputChannel = inputs[0]?.[0];
    if (inputChannel) {
      // Downsample 48kHz → 16kHz: average 3-sample windows
      const len = Math.floor(inputChannel.length / 3);
      const down = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        down[i] = (inputChannel[i * 3] + inputChannel[i * 3 + 1] + inputChannel[i * 3 + 2]) / 3;
      }

      // Append to capture accumulator
      const combined = new Float32Array(this._capBuf.length + down.length);
      combined.set(this._capBuf);
      combined.set(down, this._capBuf.length);
      this._capBuf = combined;

      // Emit complete 60ms frames
      while (this._capBuf.length >= this._FRAME) {
        const frame = this._capBuf.slice(0, this._FRAME);
        this._capBuf = this._capBuf.slice(this._FRAME);

        const int16 = new Int16Array(this._FRAME);
        for (let i = 0; i < this._FRAME; i++) {
          const s = Math.max(-1, Math.min(1, frame[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        // Transfer ownership to avoid copy
        this.port.postMessage(int16.buffer, [int16.buffer]);
      }
    }

    // ── Playback ─────────────────────────────────────────────────────────────
    const out = outputs[0]?.[0];
    if (out) {
      const take = Math.min(out.length, this._playBuf.length);
      if (take > 0) {
        out.set(this._playBuf.subarray(0, take));
        this._playBuf = this._playBuf.slice(take);
      }
      // Silence for remaining samples if buffer underruns
      if (take < out.length) {
        out.fill(0, take);
      }
    }

    return true; // keep processor alive
  }
}

registerProcessor('pcm-processor', PcmProcessor);
