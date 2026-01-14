import type { BenchmarkConfig } from "../config.js";
import type { CreateCommitInput, DeletePathInput, RepoHandle, StorageProvider } from "./types.js";
export declare class GitHubProvider implements StorageProvider {
    private config;
    name: string;
    private token;
    private owner?;
    private ownerType;
    private repoPrefix;
    private visibility;
    private apiBase;
    constructor(config: BenchmarkConfig);
    createRepo(): Promise<RepoHandle>;
    listFiles(repo: RepoHandle): Promise<number>;
    createCommit(repo: RepoHandle, input: CreateCommitInput): Promise<string>;
    deletePath(repo: RepoHandle, input: DeletePathInput): Promise<string>;
    private createCommitWithChanges;
    private getHeadCommit;
    private getRepoIdentity;
    private request;
    private encodePath;
}
//# sourceMappingURL=github.d.ts.map