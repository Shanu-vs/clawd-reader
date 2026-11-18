import { defineConfig } from "vite";

// Settings tuned for Tauri: fixed port, no screen clearing, modern WebView2 target.
export default defineConfig({
  clearScreen: false,
  // Don't watch the Rust side; Tauri rebuilds that itself.
  server: { port: 5173, strictPort: true, watch: { ignored: ["**/src-tauri/**"] } },
  envPrefix: ["VITE_", "TAURI_"],
  build: { target: "es2022", outDir: "dist", emptyOutDir: true },
});
