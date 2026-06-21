import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 모바일에서 카톡 링크로 바로 열 수 있도록 host 노출, PWA용 base는 루트.
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 7777 },
  preview: { host: true, port: 7777 },
});
