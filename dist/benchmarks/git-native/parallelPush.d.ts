import { BaseBenchmark, type BenchmarkResult } from "../base.js";
import type { BenchmarkConfig } from "../../config.js";
export declare class ParallelPushBenchmark extends BaseBenchmark {
    private remoteUrl;
    private baseRepoPath;
    constructor(config: BenchmarkConfig, remoteUrl: string, baseRepoPath: string, namePrefix?: string);
    run(): Promise<BenchmarkResult>;
}
//# sourceMappingURL=parallelPush.d.ts.map