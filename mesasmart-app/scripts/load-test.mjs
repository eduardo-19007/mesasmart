import { performance } from "node:perf_hooks";

const base = process.env.LOAD_TEST_URL ?? "http://localhost:3000";
const path = process.env.LOAD_TEST_PATH ?? "/api/menu";
const concurrency = Math.min(100, Math.max(1, Number(process.env.LOAD_TEST_CONCURRENCY ?? 10)));
const requests = Math.min(10000, Math.max(1, Number(process.env.LOAD_TEST_REQUESTS ?? 200)));
if (!path.startsWith("/") || !Number.isInteger(concurrency) || !Number.isInteger(requests)) throw new Error("Configuración de carga inválida");

const durations = [];
const statuses = new Map();
let cursor = 0;
async function worker() {
  while (cursor < requests) {
    cursor += 1;
    const start = performance.now();
    try {
      const response = await fetch(new URL(path, base), { cache: "no-store" });
      durations.push(performance.now() - start);
      statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1);
      await response.arrayBuffer();
    } catch {
      durations.push(performance.now() - start);
      statuses.set("network_error", (statuses.get("network_error") ?? 0) + 1);
    }
  }
}

const started = performance.now();
await Promise.all(Array.from({ length: concurrency }, () => worker()));
durations.sort((a, b) => a - b);
const percentile = value => Math.round(durations[Math.min(durations.length - 1, Math.ceil(durations.length * value) - 1)] ?? 0);
const elapsed = performance.now() - started;
console.log(JSON.stringify({ url: new URL(path, base).toString(), requests, concurrency, elapsedMs: Math.round(elapsed), requestsPerSecond: Number((requests / (elapsed / 1000)).toFixed(2)), latencyMs: { p50: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99) }, statuses: Object.fromEntries(statuses) }, null, 2));
if ([...statuses.keys()].some(status => status !== 200)) process.exitCode = 1;
