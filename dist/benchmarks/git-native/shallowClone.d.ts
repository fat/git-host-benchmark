import { BaseBenchmark, type BenchmarkResult } from "../base.js";
import type { BenchmarkConfig } from "../../config.js";
export declare class ShallowCloneBenchmark extends BaseBenchmark {
    private remoteUrl;
    private workingDir;
    constructor(config: BenchmarkConfig, remoteUrl: string, namePrefix?: string);
    run(): Promise<BenchmarkResult>;
}
//# sourceMappingURL=shallowClone.d.ts.map