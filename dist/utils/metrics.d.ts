import type { BenchmarkResult, BenchmarkMetrics } from "../benchmarks/base.js";
export declare function calculateMetrics(result: BenchmarkResult): BenchmarkMetrics;
export declare function formatLatency(ms: number): string;
export declare function formatThroughput(opsPerSecond: number): string;
export declare function formatBytes(bytes: number): string;
export declare function formatBandwidth(bytesPerSecond: number): string;
//# sourceMappingURL=metrics.d.ts.map