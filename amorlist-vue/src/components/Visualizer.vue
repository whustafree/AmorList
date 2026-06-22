<template>
  <canvas ref="canvas"
    class="fixed inset-0 w-full h-full pointer-events-none z-0 transition-opacity duration-700"
    :class="playerStore.isVisualizerActive ? 'opacity-30' : 'opacity-0'"
  ></canvas>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { playerStore, getAudio } from '../store/playerStore.js'

const canvas = ref(null)
let audioCtx = null
let analyser = null
let source = null
let animationId = null

const initVisualizer = () => {
  const audioEl = getAudio()
  if (!audioEl || !audioEl.src) return

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    try {
      source = audioCtx.createMediaElementSource(audioEl)
      source.connect(analyser)
      analyser.connect(audioCtx.destination)
    } catch (e) {
      console.warn('Visualizer: no se pudo conectar audio', e)
      return
    }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
  draw()
}

const draw = () => {
  if (!playerStore.isVisualizerActive || !analyser) return
  animationId = requestAnimationFrame(draw)
  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  analyser.getByteFrequencyData(dataArray)
  const ctx = canvas.value.getContext('2d')
  canvas.value.width = window.innerWidth
  canvas.value.height = window.innerHeight
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)
  const barWidth = (canvas.value.width / bufferLength) * 2.5
  let x = 0
  for (let i = 0; i < bufferLength; i++) {
    const barHeight = (dataArray[i] / 255) * canvas.value.height * 0.5
    const hue = (i / bufferLength) * 360
    ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.5)`
    ctx.fillRect(x, canvas.value.height - barHeight, barWidth, barHeight)
    x += barWidth + 1
  }
}

watch(() => playerStore.isVisualizerActive, (isActive) => {
  if (isActive) {
    initVisualizer()
  } else if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  if (source) { try { source.disconnect() } catch (e) {} }
  if (audioCtx && audioCtx.state !== 'closed') { audioCtx.close().catch(() => {}) }
})
</script>
