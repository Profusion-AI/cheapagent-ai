import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        privacy: fileURLToPath(new URL("./privacy.html", import.meta.url)),
        honesty: fileURLToPath(new URL("./honesty.html", import.meta.url)),
        api: fileURLToPath(new URL("./api.html", import.meta.url)),
      },
    },
  },
});
