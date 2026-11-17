export type PortableModel = { features: string[]; means: number[]; scales: number[]; coefficients: number[]; intercept: number };
export function validateModel(model: unknown): PortableModel;
export function predictMinutes(model: PortableModel, baselineMinutes: number, quantity: number): number;
