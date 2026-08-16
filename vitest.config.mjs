import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const isPureAuthApprovalRun = process.argv.some((arg) => arg.endsWith("tests/auth-approval.test.ts"));

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url))
    }
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    setupFiles: isPureAuthApprovalRun ? [] : ["./tests/vitest.setup.ts"]
  }
});
