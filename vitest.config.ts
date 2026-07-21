import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Dummy values so modules that read env at import time don't throw. Tests
    // never touch a real DB or the real key — they use fakes / the test key.
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/test?schema=public",
      EMERGENCY_MASTER_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // "server-only" throws outside an RSC bundle; stub it for node tests.
      "server-only": fileURLToPath(new URL("./test/stubs/server-only.ts", import.meta.url)),
    },
  },
});
