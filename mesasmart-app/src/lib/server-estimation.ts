import "server-only";
import { resolve } from "node:path";
import { estimateShadow } from "../../ml/shadow-estimation.mjs";

export async function experimentalEstimate(baseline: number, quantity: number) {
  return estimateShadow({
    enabled: process.env.ML_SHADOW_MODE === "true",
    directory: resolve(process.cwd(), "ml/results/demo"), baseline, quantity,
    onUnavailable: () => console.warn(JSON.stringify({ event: "ML_SHADOW_UNAVAILABLE" })),
  });
}
