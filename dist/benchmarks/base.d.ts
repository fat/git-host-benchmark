import type { BenchmarkConfig } from "../config.js";
export interface BenchmarkResult {
    name: string;
    iterations: number;
    timings: bigint[];
    errors: number;
    metadata?: Record<string, unknown>;
}
export interface BenchmarkMetrics {
    name: string;
    iterations: number;
    successCount: number;
    errorCount: number;
    latency: {
        min: number;
        max: number;
        mean: number;
        median: number;
        p95: number;
        p99: number;
        p999: number;
        stdDev: number;
    };
    throughput: {
        opsPerSecond: number;
    };
    metadata?: Record<string, unknown>;
}
export declare abstract class BaseBenchmark {
    protected config: BenchmarkConfig;
    protected name: string;
    constructor(name: string, config: BenchmarkConfig);
    abstract run(): Promise<BenchmarkResult | BenchmarkResult[]>;
    protected measureAsync<T>(operation: () => Promise<T>): Promise<{
        result: T;
        duration: bigint;
    }>;
    protected measure<T>(operation: () => T): {
        result: T;
        duration: bigint;
    };
    protected warmup(operation: () => Promise<void>, runs?: number): Promise<void>;
    protected createResult(timings: bigint[], errors: number, metadata?: Record<string, unknown>): BenchmarkResult;
    getName(): string;
}
export declare function runBenchmarkWithProgress<T>(name: string, iterations: number, operation: (index: number) => Promise<T>, onProgress?: (current: number, total: number) => void): Promise<{
    results: T[];
    timings: bigint[];
    errors: number;
}>;
export declare function runConcurrentBenchmark<T>(name: string, totalIterations: number, concurrency: number, operation: (index: number) => Promise<T>, onProgress?: (current: number, total: number) => void): Promise<{
    results: T[];
    timings: bigint[];
    errors: number;
}>;
//# sourceMappingURL=base.d.ts.map