import type { BenchmarkMetrics } from '../benchmarks/base.js';
export interface JsonReport {
    timestamp: string;
    benchmarks: BenchmarkMetrics[];
    summary: {
        totalIterations: number;
        totalErrors: number;
        duration: number;
    };
}
export declare class JsonReporter {
    private startTime;
    constructor();
    exportToFile(metrics: BenchmarkMetrics[], outputPath: string): void;
}
//# sourceMappingURL=json.d.ts.map