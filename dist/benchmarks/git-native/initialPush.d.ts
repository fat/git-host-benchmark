import { BaseBenchmark, type BenchmarkResult } from "../base.js";
import type { BenchmarkConfig } from "../../config.js";
import type { RepoHandle, StorageProvider } from "../../providers/types.js";
export declare class InitialPushBenchmark extends BaseBenchmark {
    private repo;
    private remoteUrl;
    private provider;
    constructor(config: BenchmarkConfig, provider: StorageProvider, namePrefix?: string);
    run(): Promise<BenchmarkResult>;
    getRepo(): RepoHandle | null;
    getRemoteUrl(): string | null;
}
//# sourceMappingURL=initialPush.d.ts.map