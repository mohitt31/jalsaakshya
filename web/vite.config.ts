import { defineConfig } from "vite"
import { resolve } from "node:path"
export default defineConfig({
  base: "/jalsaakshya/",
  build: {
    outDir: "../docs", emptyOutDir: true, target: "es2022",
    rollupOptions: { input: { main: resolve(__dirname, "index.html"), curator: resolve(__dirname, "curator.html") } },
  },
})
