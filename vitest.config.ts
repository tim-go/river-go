import { defineConfig } from "vitest/config";

// Minimal unit-test setup. Tests target pure, high-risk logic (validators, id
// generation, gate rules, formatting) — no DOM or component rendering — so the
// default node environment is enough and nothing binds a port.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
