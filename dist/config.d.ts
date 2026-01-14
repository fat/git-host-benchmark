export interface BenchmarkConfig {
    localRepo: string;
    workingDir: string;
    printSummaryPerConfig?: boolean;
    organization: {
        name: string;
        privateKey: string;
    };
    targets: {
        codeStorage: {
            enabled: boolean;
        };
        github: {
            enabled: boolean;
            token?: string;
            owner?: string;
            ownerType: "org" | "user";
            repoPrefix: string;
            visibility: "private" | "public";
            apiBase: string;
        };
    };
    benchmarks: {
        initialPush: {
            enabled: boolean;
        };
        clone: {
            enabled: boolean;
            concurrency: number;
            iterations: number;
        };
        shallowClone: {
            enabled: boolean;
            concurrency: number;
            iterations: number;
        };
        worktreeCommit: {
            enabled: boolean;
            concurrency: number;
            iterations: number;
        };
        parallelPush: {
            enabled: boolean;
            concurrency: number;
            iterations: number;
        };
        rampClone: {
            enabled: boolean;
            minConcurrency: number;
            maxConcurrency: number;
            step: number;
            iterations: number;
            stopP95Ms?: number;
            stopErrorRate?: number;
        };
        rampParallelPush: {
            enabled: boolean;
            minConcurrency: number;
            maxConcurrency: number;
            step: number;
            iterations: number;
            stopP95Ms?: number;
            stopErrorRate?: number;
        };
        sdkListFiles: {
            enabled: boolean;
            iterations: number;
            concurrency: number | number[];
        };
        sdkCreateCommit: {
            enabled: boolean;
            iterations: number;
            fileSizes: number[];
            filesPerCommit: number | number[];
            concurrency: number | number[];
        };
        sdkDeletePath: {
            enabled: boolean;
            iterations: number;
            concurrency: number | number[];
        };
    };
}
export declare function loadConfig(configPath?: string): BenchmarkConfig;
//# sourceMappingURL=config.d.ts.map