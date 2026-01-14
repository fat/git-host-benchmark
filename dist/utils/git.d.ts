export interface GitCommandOptions {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
}
/**
 * Safe git command execution using execFileSync
 * Prevents command injection by using array of arguments
 */
export declare function gitSync(args: string[], options?: GitCommandOptions): string;
/**
 * Async git command execution with progress tracking
 */
export declare function gitAsync(args: string[], options?: GitCommandOptions & {
    onData?: (data: string) => void;
}): Promise<string>;
/**
 * Clone a repository
 */
export declare function gitClone(url: string, destination: string, options?: GitCommandOptions): Promise<void>;
/**
 * Shallow clone a repository (depth=1)
 */
export declare function gitShallowClone(url: string, destination: string, options?: GitCommandOptions & {
    depth?: number;
}): Promise<void>;
/**
 * Initialize a new repository
 */
export declare function gitInit(path: string, bare?: boolean): void;
/**
 * Check if a remote exists
 */
export declare function gitRemoteExists(name: string, options?: GitCommandOptions): boolean;
/**
 * Remove a remote
 */
export declare function gitRemoteRemove(name: string, options?: GitCommandOptions): void;
/**
 * Add a remote
 */
export declare function gitRemoteAdd(name: string, url: string, options?: GitCommandOptions): void;
/**
 * Push to remote
 */
export declare function gitPush(remote: string, branch: string, options?: GitCommandOptions & {
    force?: boolean;
}): Promise<void>;
/**
 * Add files to staging
 */
export declare function gitAdd(paths: string[], options?: GitCommandOptions): void;
/**
 * Create a commit
 */
export declare function gitCommit(message: string, options?: GitCommandOptions): void;
/**
 * Create a branch
 */
export declare function gitBranch(name: string, options?: GitCommandOptions): void;
/**
 * Checkout a branch
 */
export declare function gitCheckout(branch: string, options?: GitCommandOptions & {
    create?: boolean;
}): void;
/**
 * Get current commit SHA
 */
export declare function gitRevParse(ref: string, options?: GitCommandOptions): string;
/**
 * Worktree management
 */
export declare class WorktreeManager {
    private baseRepoPath;
    private worktrees;
    private nextId;
    constructor(baseRepoPath: string);
    /**
     * Create a new worktree
     */
    createWorktree(branch: string): string;
    /**
     * Remove a worktree
     */
    removeWorktree(worktreePath: string): void;
    /**
     * Clean up all worktrees
     */
    cleanup(): void;
    /**
     * Get all worktree paths
     */
    getWorktrees(): string[];
}
/**
 * Get repository size (du -sh .git)
 */
export declare function getRepoSize(repoPath: string): number;
/**
 * Ensure directory exists
 */
export declare function ensureDir(path: string): void;
/**
 * Remove directory recursively
 */
export declare function removeDir(path: string): void;
//# sourceMappingURL=git.d.ts.map