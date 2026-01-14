import { BaseBenchmark, type BenchmarkResult } from "../base.js";
import type { BenchmarkConfig } from "../../config.js";
export declare class WorktreeCommitBenchmark extends BaseBenchmark {
    private baseRepoPath;
    private worktreeManager;
    constructor(config: BenchmarkConfig, baseRepoPath: string, namePrefix?: string);
    run(): Promise<BenchmarkResult>;
}
//# sourceMappingURL=worktreeCommit.d.ts.map