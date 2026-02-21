<template>
  <canvas
    ref="canvas"
    class="fixed inset-0 w-full h-full pointer-events-none z-0 transition-opacity duration-700"
    :class="playerStore.isVisualizerActive ? 'opacity-30' : 'opacity-0'"
  ></canvas>
</template>

<script setup>
import { ref, watch } from 'vue';
import { playerStore } from '../store/playerStore.js';

const canvas = ref(null);
let audioCtx, analyser, source;
let animationId;

const initVisualizer = () => {
  // Asegurarnos de que el audio context solo se cree una vez
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source = audioCtx.createMediaElementSource(playerStore.audioEl);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
  }
  
  if (audioCtx.state === 'suspended') audioCtx.resume();
  draw();
};

const draw = () => {
  if (!playerStore.isVisualizerActive || !analyser) return;
  animationId = requestAnimationFrame(draw);

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  const ctx = canvas.value.getContext('2d');
  canvas.value.width = window.innerWidth;
  canvas.value.height = window.innerHeight;
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);

  const barWidth = (canvas.value.width / bufferLength) * 2.5;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const barHeight = (dataArray[i] / 255) * canvas.value.height * 0.5;
    const hue = (i / bufferLength) * 360;
    ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.5)`;
    ctx.fillRect(x, canvas.value.height - barHeight, barWidth, barHeight);
    x += barWidth + 1;
  }
};

// Escuchamos si el usuario activa o desactiva el botón del visualizador
watch(() => playerStore.isVisualizerActive, (isActive) => {
  if (isActive) {
    initVisualizer();
  } else {
    cancelAnimationFrame(animationId);
  }
});
</script>