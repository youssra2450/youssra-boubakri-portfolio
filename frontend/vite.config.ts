/// <reference types="vitest/config" />
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

const SEED_FILE = fileURLToPath(new URL("../database/seed/portfolio.json", import.meta.url));

/**
 * Static hosts without an SPA fallback (Vercel services) serve files only: emit a copy of index.html for
 * every project page (`projects/<slug>/index.html`) and as `404.html`, so deep links load the app.
 * Project slugs come from the seed file; when it is not reachable (e.g. the Docker build context) only
 * `404.html` is emitted — nginx has its own fallback there.
 */
function spaRouteEntries(): Plugin {
  return {
    name: "spa-route-entries",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      const entry = bundle["index.html"];
      if (!entry || entry.type !== "asset") return;
      const html = entry.source;
      const slugs: string[] = existsSync(SEED_FILE)
        ? (JSON.parse(readFileSync(SEED_FILE, "utf8")) as { projects?: { slug: string }[] }).projects?.map(
            (project) => project.slug,
          ) ?? []
        : [];
      for (const fileName of ["404.html", ...slugs.map((slug) => `projects/${slug}/index.html`)]) {
        this.emitFile({ type: "asset", fileName, source: html });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_DEV_API_TARGET || "http://localhost:8000";

  // On Vercel, default the public site URL (canonical, Open Graph, JSON-LD) to the production domain.
  if (!env.VITE_SITE_URL && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    process.env.VITE_SITE_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  return {
    plugins: [react(), tailwindcss(), spaRouteEntries()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true },
        "/robots.txt": { target: apiTarget, changeOrigin: true },
        "/sitemap.xml": { target: apiTarget, changeOrigin: true },
      },
    },
    preview: {
      port: 4173,
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true },
        "/robots.txt": { target: apiTarget, changeOrigin: true },
        "/sitemap.xml": { target: apiTarget, changeOrigin: true },
      },
    },
    build: {
      target: "es2022",
      sourcemap: false,
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes("node_modules")) {
              if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "react";
              if (id.includes("react-router")) return "router";
            }
            return undefined;
          },
        },
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      css: false,
      include: ["src/**/*.test.{ts,tsx}"],
      // Interaction-heavy RTL tests (filters, UAV lab) can exceed 5 s on a busy Windows laptop.
      testTimeout: 20000,
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/main.tsx"],
      },
    },
  };
});
