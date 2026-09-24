<script setup lang="ts">
import { computed } from "vue";
import { useData } from "vitepress";

const { lang } = useData();

const isZh = computed(() => {
  return (lang.value || "").toLowerCase().startsWith("zh");
});

const videoSrc = computed(() => {
  return isZh.value
    ? "https://cdn.path-ioc.dev/path-ioc/demo-zh.mp4"
    : "https://cdn.path-ioc.dev/path-ioc/demo-en.mp4";
});
</script>

<template>
  <section class="video-showcase-wrapper">
    <div class="video-showcase-container">
      <div class="video-window-frame">
        <!-- macOS Top Titlebar -->
        <div class="video-window-header">
          <div class="window-controls">
            <span class="control-dot close"></span>
            <span class="control-dot minimize"></span>
            <span class="control-dot maximize"></span>
          </div>

          <div class="window-title">
            <span class="window-icon">⚡</span>
            <span>{{ isZh ? "path-ioc-demo · 75秒实机编码与极速点火录屏" : "path-ioc-demo · 75s Live Architecture Tour" }}</span>
          </div>

          <div class="window-badge">
            <span class="live-dot"></span>
            <span>1080P HD</span>
          </div>
        </div>

        <!-- Video Player -->
        <div class="video-player-box">
          <video
            :key="videoSrc"
            class="showcase-video-element"
            :src="videoSrc"
            controls
            autoplay
            muted
            loop
            playsinline
            preload="metadata"
          >
            Your browser does not support HTML5 video.
          </video>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.video-showcase-wrapper {
  width: 100%;
  padding: 0 24px;
  margin-top: 1rem;
  margin-bottom: 2.5rem;
  box-sizing: border-box;
}

.video-showcase-container {
  max-width: 1152px;
  margin: 0 auto;
}

.video-window-frame {
  border-radius: 14px;
  background-color: #0d1117;
  border: 1px solid var(--vp-c-border);
  box-shadow: 0 25px 70px -15px rgba(0, 0, 0, 0.75), 0 0 35px rgba(252, 100, 1, 0.12);
  overflow: hidden;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}

.dark .video-window-frame {
  border: 1px solid rgba(252, 100, 1, 0.25);
  box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.95), 0 0 45px rgba(252, 100, 1, 0.18);
}

.video-window-frame:hover {
  border-color: rgba(252, 100, 1, 0.5);
  box-shadow: 0 30px 90px -15px rgba(0, 0, 0, 0.85), 0 0 60px rgba(252, 100, 1, 0.28);
}

.video-window-header {
  height: 42px;
  background: #111622;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  padding: 0 16px;
  user-select: none;
  gap: 14px;
}

.dark .video-window-header {
  background: #0f1420;
  border-bottom: 1px solid #1e2738;
}

.window-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 60px;
  flex-shrink: 0;
}

.control-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.control-dot.close {
  background-color: #ff5f56;
}

.control-dot.minimize {
  background-color: #ffbd2e;
}

.control-dot.maximize {
  background-color: #27c93f;
}

.window-title {
  flex: 1;
  min-width: 0;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.window-icon {
  font-size: 0.85rem;
  flex-shrink: 0;
}

.window-badge {
  margin-left: auto;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border: 1px solid rgba(252, 100, 1, 0.3);
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 0.04em;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--vp-c-brand-1);
  box-shadow: 0 0 8px var(--vp-c-brand-1);
  animation: pulse-dot 2s infinite ease-in-out;
}

@keyframes pulse-dot {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.85);
  }
}

.video-player-box {
  width: 100%;
  background-color: #080a0f;
  position: relative;
  overflow: hidden;
}

.showcase-video-element {
  width: 100%;
  display: block;
  aspect-ratio: 16 / 9;
  background-color: #080a0f;
  outline: none;
}

@media (max-width: 768px) {
  .video-showcase-wrapper {
    padding: 0 16px;
    margin-top: 1rem;
    margin-bottom: 1.5rem;
  }

  .window-title {
    font-size: 0.72rem;
  }
}

@media (max-width: 640px) {
  .window-badge {
    display: none;
  }
}
</style>
