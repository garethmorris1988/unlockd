/**
 * Generates simple sine-wave bell tones as WAV files for the meditation screen.
 * Run once: node scripts/generate-sounds.js
 */
const fs   = require('fs')
const path = require('path')

function generateWav(frequencyHz, durationMs, sampleRate = 44100) {
  const numSamples = Math.floor(sampleRate * durationMs / 1000)
  const dataBytes  = numSamples * 2          // 16-bit samples
  const fileBytes  = 44 + dataBytes

  const buf = Buffer.alloc(fileBytes)

  // RIFF chunk
  buf.write('RIFF', 0, 'ascii')
  buf.writeUInt32LE(fileBytes - 8, 4)
  buf.write('WAVE', 8, 'ascii')

  // fmt  sub-chunk
  buf.write('fmt ', 12, 'ascii')
  buf.writeUInt32LE(16, 16)               // sub-chunk size
  buf.writeUInt16LE(1,  20)               // PCM
  buf.writeUInt16LE(1,  22)               // mono
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(sampleRate * 2, 28)   // byte rate
  buf.writeUInt16LE(2,  32)               // block align
  buf.writeUInt16LE(16, 34)               // bits per sample

  // data sub-chunk
  buf.write('data', 36, 'ascii')
  buf.writeUInt32LE(dataBytes, 40)

  const durationSec = durationMs / 1000
  for (let i = 0; i < numSamples; i++) {
    const t       = i / sampleRate
    const fadeIn  = Math.min(1, t / 0.05)                    // 50 ms fade-in
    const fadeOut = Math.min(1, (durationSec - t) / 0.3)    // 300 ms fade-out
    const env     = fadeIn * fadeOut
    const sample  = Math.round(env * 28000 * Math.sin(2 * Math.PI * frequencyHz * t))
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), 44 + i * 2)
  }

  return buf
}

const outDir = path.join(__dirname, '..', 'assets', 'sounds')
fs.mkdirSync(outDir, { recursive: true })

// Minute bell — soft 432 Hz, 2.5 s
fs.writeFileSync(path.join(outDir, 'bell.wav'), generateWav(432, 2500))
console.log('✓ assets/sounds/bell.wav')

// Session complete — warmer 528 Hz, 3.5 s
fs.writeFileSync(path.join(outDir, 'complete.wav'), generateWav(528, 3500))
console.log('✓ assets/sounds/complete.wav')
