import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
/**
 * Safe git command execution using execFileSync
 * Prevents command injection by using array of arguments
 */
export function gitSync(args, options) {
    try {
        const result = execFileSync("git", args, {
            cwd: options?.cwd,
            env: { ...process.env, ...options?.env },
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        });
        return result.toString();
    }
    catch (error) {
        throw new Error(`Git command failed: git ${args.join(" ")}\n${error.stderr || error.message}`);
    }
}
/**
 * Async git command execution with progress tracking
 */
export async function gitAsync(args, options) {
    return new Promise((resolve, reject) => {
        const proc = spawn("git", args, {
            cwd: options?.cwd,
            env: { ...process.env, ...options?.env },
            stdio: ["pipe", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        proc.stdout?.on("data", (data) => {
            const str = data.toString();
            stdout += str;
            if (options?.onData) {
                options.onData(str);
            }
        });
        proc.stderr?.on("data", (data) => {
            stderr += data.toString();
        });
        proc.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(`Git command failed: git ${args.join(" ")}\n${stderr}`));
            }
            else {
                resolve(stdout);
            }
        });
        proc.on("error", (error) => {
            reject(new Error(`Failed to execute git: ${error.message}`));
        });
    });
}
/**
 * Clone a repository
 */
export async function gitClone(url, destination, options) {
    await gitAsync(["clone", url, destination], options);
}
/**
 * Shallow clone a repository (depth=1)
 */
export async function gitShallowClone(url, destination, options) {
    const depth = options?.depth ?? 1;
    await gitAsync(["clone", "--depth", String(depth), url, destination], options);
}
/**
 * Initialize a new repository
 */
export function gitInit(path, bare = false) {
    const args = bare ? ["init", "--bare", path] : ["init", path];
    gitSync(args);
}
/**
 * Check if a remote exists
 */
export function gitRemoteExists(name, options) {
    try {
        const remotes = gitSync(["remote"], options);
        return remotes.split("\n").includes(name);
    }
    catch (error) {
        return false;
    }
}
/**
 * Remove a remote
 */
export function gitRemoteRemove(name, options) {
    gitSync(["remote", "remove", name], options);
}
/**
 * Add a remote
 */
export function gitRemoteAdd(name, url, options) {
    gitSync(["remote", "add", name, url], options);
}
/**
 * Push to remote
 */
export async function gitPush(remote, branch, options) {
    const args = ["push", remote, branch];
    if (options?.force) {
        args.push("--force");
    }
    await gitAsync(args, options);
}
/**
 * Add files to staging
 */
export function gitAdd(paths, options) {
    gitSync(["add", ...paths], options);
}
/**
 * Create a commit
 */
export function gitCommit(message, options) {
    gitSync(["commit", "-m", message], options);
}
/**
 * Create a branch
 */
export function gitBranch(name, options) {
    gitSync(["branch", name], options);
}
/**
 * Checkout a branch
 */
export function gitCheckout(branch, options) {
    const args = ["checkout"];
    if (options?.create) {
        args.push("-b");
    }
    args.push(branch);
    gitSync(args, { cwd: options?.cwd });
}
/**
 * Get current commit SHA
 */
export function gitRevParse(ref, options) {
    return gitSync(["rev-parse", ref], options).trim();
}
/**
 * Worktree management
 */
export class WorktreeManager {
    baseRepoPath;
    worktrees = new Map();
    nextId = 0;
    constructor(baseRepoPath) {
        this.baseRepoPath = baseRepoPath;
    }
    /**
     * Create a new worktree
     */
    createWorktree(branch) {
        const worktreeId = `worktree-${this.nextId++}`;
        const worktreePath = resolve(this.baseRepoPath, "..", `.worktree-${worktreeId}`);
        // Create the worktree
        gitSync(["worktree", "add", worktreePath, "-b", branch], {
            cwd: this.baseRepoPath,
        });
        this.worktrees.set(worktreeId, worktreePath);
        return worktreePath;
    }
    /**
     * Remove a worktree
     */
    removeWorktree(worktreePath) {
        try {
            gitSync(["worktree", "remove", worktreePath, "--force"], {
                cwd: this.baseRepoPath,
            });
        }
        catch (error) {
            console.error(`Failed to remove worktree ${worktreePath}:`, error);
        }
    }
    /**
     * Clean up all worktrees
     */
    cleanup() {
        for (const worktreePath of this.worktrees.values()) {
            this.removeWorktree(worktreePath);
        }
        this.worktrees.clear();
    }
    /**
     * Get all worktree paths
     */
    getWorktrees() {
        return Array.from(this.worktrees.values());
    }
}
/**
 * Get repository size (du -sh .git)
 */
export function getRepoSize(repoPath) {
    try {
        const gitDir = join(repoPath, ".git");
        if (!existsSync(gitDir)) {
            return 0;
        }
        // Use du to get size in kilobytes (cross-platform compatible)
        // -k flag works on both Linux and macOS
        const result = execFileSync("du", ["-sk", gitDir], {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        });
        // Output format: "SIZE\tPATH"
        const sizeStr = result.split(/\s+/)[0];
        const sizeKB = parseInt(sizeStr, 10);
        // Convert kilobytes to bytes
        return sizeKB * 1024;
    }
    catch (error) {
        console.error("Failed to get repo size:", error);
        return 0;
    }
}
/**
 * Ensure directory exists
 */
export function ensureDir(path) {
    if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
    }
}
/**
 * Remove directory recursively
 */
export function removeDir(path) {
    if (existsSync(path)) {
        rmSync(path, { recursive: true, force: true });
    }
}
//# sourceMappingURL=git.js.map