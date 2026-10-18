import { defineConfig } from "vite"
import { resolve } from "node:path"
export default defineConfig({
  base: "/jalsaakshya/",
  build: {
    outDir: "../dist", emptyOutDir: true, target: "es2022",
    rollupOptions: { input: { main: resolve(__dirname, "index.html"), curator: resolve(__dirname, "curator.html"), proof: resolve(__dirname, "proof.html"), jjm: resolve(__dirname, "jjm.html") } },
  },
})
