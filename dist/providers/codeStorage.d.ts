import type { BenchmarkConfig } from "../config.js";
import type { CreateCommitInput, DeletePathInput, RepoHandle, StorageProvider } from "./types.js";
export declare class CodeStorageProvider implements StorageProvider {
    private config;
    name: string;
    private storage;
    constructor(config: BenchmarkConfig);
    createRepo(): Promise<RepoHandle>;
    listFiles(repo: RepoHandle): Promise<number>;
    createCommit(repo: RepoHandle, input: CreateCommitInput): Promise<string>;
    deletePath(repo: RepoHandle, input: DeletePathInput): Promise<string>;
}
//# sourceMappingURL=codeStorage.d.ts.map