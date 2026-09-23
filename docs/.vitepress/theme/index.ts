import DefaultTheme from "vitepress/theme";
import { onMounted, watch } from "vue";
import { useRoute, useData } from "vitepress";
import "./custom.css";

let cachedVersion: string | null = null;

export default {
  extends: DefaultTheme,
  setup() {
    if (typeof window === "undefined") return;

    const route = useRoute();
    const { theme } = useData();

    const applyVersion = (version: string) => {
      // 1. 响应式更新 VitePress 的当前导航栏数据 (Desktop & Mobile)
      if (theme.value?.nav) {
        for (const item of theme.value.nav) {
          if ("items" in item && /^v?\d+\.\d+/.test(item.text || "")) {
            item.text = version;
          }
        }
      }

      // 2. 针对已挂载 DOM 节点做直接更新兜底，确保秒级视觉同步
      const targetSpans = document.querySelectorAll(
        ".VPNavBarMenuGroup button span, .VPNavScreenMenuGroup button span"
      );
      targetSpans.forEach((el) => {
        const text = el.textContent?.trim() || "";
        if (/^v?\d+\.\d+/.test(text)) {
          el.textContent = version;
        }
      });
    };

    const fetchLatestVersion = async () => {
      if (cachedVersion) {
        applyVersion(cachedVersion);
        return;
      }

      // 优先请求全球 CDN (带 CORS、多节点边缘缓存，响应延时通常 < 30ms)
      try {
        const res = await fetch(
          "https://data.jsdelivr.com/v1/packages/npm/@path-ioc/core/resolved"
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.version) {
            cachedVersion = `v${data.version}`;
            applyVersion(cachedVersion);
            return;
          }
        }
      } catch {}

      // 备用兜底：直接请求 npm 官方 registry 接口
      try {
        const res = await fetch("https://registry.npmjs.org/@path-ioc/core/latest");
        if (res.ok) {
          const data = await res.json();
          if (data?.version) {
            cachedVersion = `v${data.version}`;
            applyVersion(cachedVersion);
          }
        }
      } catch {}
    };

    onMounted(() => {
      fetchLatestVersion();
    });

    // 路由切换时重新同步（应对单页应用无刷新跳转后的 DOM 重新渲染）
    watch(
      () => route.path,
      () => {
        if (cachedVersion) {
          setTimeout(() => applyVersion(cachedVersion!), 60);
        } else {
          fetchLatestVersion();
        }
      }
    );
  },
};
