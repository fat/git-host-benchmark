import { BaseBenchmark, type BenchmarkResult } from "../base.js";
import type { BenchmarkConfig } from "../../config.js";
import type { RepoHandle, StorageProvider } from "../../providers/types.js";
export declare class DeletePathBenchmark extends BaseBenchmark {
    private repo;
    private provider;
    constructor(config: BenchmarkConfig, provider: StorageProvider, repo: RepoHandle, namePrefix?: string);
    run(): Promise<BenchmarkResult | BenchmarkResult[]>;
}
//# sourceMappingURL=deletePath.d.ts.map