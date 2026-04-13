const TARGET_SAMPLE_RATE = 16000

function mixToMono(audioBuffer: AudioBuffer) {
  if (audioBuffer.numberOfChannels === 1) {
    return audioBuffer.getChannelData(0)
  }

  const output = new Float32Array(audioBuffer.length)

  for (let channelIndex = 0; channelIndex < audioBuffer.numberOfChannels; channelIndex += 1) {
    const input = audioBuffer.getChannelData(channelIndex)

    for (let sampleIndex = 0; sampleIndex < input.length; sampleIndex += 1) {
      output[sampleIndex] += input[sampleIndex] / audioBuffer.numberOfChannels
    }
  }

  return output
}

export async function normalizeAudioBlob(blob: Blob, targetSampleRate = TARGET_SAMPLE_RATE) {
  const arrayBuffer = await blob.arrayBuffer()
  const audioContext = new AudioContext()

  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0))
    const mono = mixToMono(decoded)
    const targetLength = Math.ceil((mono.length * targetSampleRate) / decoded.sampleRate)
    const offlineContext = new OfflineAudioContext(1, targetLength, targetSampleRate)
    const audioBuffer = offlineContext.createBuffer(1, mono.length, decoded.sampleRate)

    audioBuffer.copyToChannel(mono, 0)

    const source = offlineContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(offlineContext.destination)
    source.start(0)

    const rendered = await offlineContext.startRendering()
    return {
      sampleRate: targetSampleRate,
      channelData: rendered.getChannelData(0)
    }
  } finally {
    await audioContext.close()
  }
}
