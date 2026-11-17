export type ShadowEstimate = { mode: string; minutes: number; baselineMinutes: number; quantity: number; provenance: string; modelSha256: string; operational: boolean };
export function estimateShadow(options: { enabled: boolean; directory: string; baseline: number; quantity: number; onUnavailable?: () => void }): Promise<ShadowEstimate | undefined>;
