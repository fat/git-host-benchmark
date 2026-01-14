import { randomUUID } from "node:crypto";
export class GitHubProvider {
    config;
    name = "github";
    token;
    owner;
    ownerType;
    repoPrefix;
    visibility;
    apiBase;
    constructor(config) {
        this.config = config;
        const github = config.targets.github;
        if (!github?.token) {
            throw new Error("GH_TOKEN must be set for GitHub benchmarks");
        }
        this.token = github.token;
        this.owner = github.owner;
        this.ownerType = github.ownerType;
        this.repoPrefix = github.repoPrefix;
        this.visibility = github.visibility;
        this.apiBase = github.apiBase;
    }
    async createRepo() {
        const repoName = `${this.repoPrefix}-${randomUUID().slice(0, 8)}`;
        const payload = {
            name: repoName,
            private: this.visibility === "private",
        };
        const repo = this.ownerType === "org"
            ? await this.request("POST", `/orgs/${this.owner}/repos`, payload)
            : await this.request("POST", "/user/repos", payload);
        const owner = repo.owner.login;
        const remoteUrl = `https://x-access-token:${encodeURIComponent(this.token)}@github.com/${owner}/${repo.name}.git`;
        return {
            id: repo.full_name,
            remoteUrl,
            defaultBranch: repo.default_branch || "main",
            metadata: { owner, repo: repo.name },
        };
    }
    async listFiles(repo) {
        const { owner, repoName } = this.getRepoIdentity(repo);
        const { treeSha } = await this.getHeadCommit(owner, repoName, repo);
        const tree = await this.request("GET", `/repos/${owner}/${repoName}/git/trees/${treeSha}?recursive=1`);
        return tree.tree.filter((entry) => entry.type === "blob").length;
    }
    async createCommit(repo, input) {
        const { owner, repoName } = this.getRepoIdentity(repo);
        return this.createCommitWithChanges(owner, repoName, repo, {
            message: input.message,
            adds: input.files,
            deletes: [],
        });
    }
    async deletePath(repo, input) {
        const { owner, repoName } = this.getRepoIdentity(repo);
        const encodedPath = this.encodePath(input.path);
        try {
            const file = await this.request("GET", `/repos/${owner}/${repoName}/contents/${encodedPath}?ref=${repo.defaultBranch}`);
            if (file.type !== "file") {
                throw new Error(`GitHub path is not a file: ${input.path}`);
            }
            const result = await this.request("DELETE", `/repos/${owner}/${repoName}/contents/${encodedPath}`, {
                message: input.message,
                sha: file.sha,
                branch: repo.defaultBranch,
            });
            return result.commit.sha;
        }
        catch (error) {
            if (process.env.BENCH_DEBUG_GITHUB_DELETE === "1") {
                console.error(`[github deletePath] ${owner}/${repoName} ${input.path}:`, error instanceof Error ? error.message : error);
            }
            throw error;
        }
    }
    async createCommitWithChanges(owner, repoName, repo, input) {
        const { sha: baseSha, treeSha } = await this.getHeadCommit(owner, repoName, repo);
        const blobs = await Promise.all(input.adds.map(async (file) => {
            const blob = await this.request("POST", `/repos/${owner}/${repoName}/git/blobs`, { content: file.content, encoding: "utf-8" });
            return { path: file.path, sha: blob.sha };
        }));
        const treeEntries = [
            ...blobs.map((blob) => ({
                path: blob.path,
                mode: "100644",
                type: "blob",
                sha: blob.sha,
            })),
            ...input.deletes.map((path) => ({
                path,
                mode: "100644",
                type: "blob",
                sha: null,
            })),
        ];
        const newTree = await this.request("POST", `/repos/${owner}/${repoName}/git/trees`, {
            base_tree: treeSha,
            tree: treeEntries,
        });
        const newCommit = await this.request("POST", `/repos/${owner}/${repoName}/git/commits`, {
            message: input.message,
            tree: newTree.sha,
            parents: [baseSha],
        });
        await this.request("PATCH", `/repos/${owner}/${repoName}/git/refs/heads/${repo.defaultBranch}`, { sha: newCommit.sha, force: true });
        return newCommit.sha;
    }
    async getHeadCommit(owner, repoName, repo) {
        const ref = await this.request("GET", `/repos/${owner}/${repoName}/git/ref/heads/${repo.defaultBranch}`);
        const commit = await this.request("GET", `/repos/${owner}/${repoName}/git/commits/${ref.object.sha}`);
        return { sha: commit.sha, treeSha: commit.tree.sha };
    }
    getRepoIdentity(repo) {
        const owner = repo.metadata?.owner;
        const repoName = repo.metadata?.repo;
        if (owner && repoName) {
            return { owner, repoName };
        }
        const [fallbackOwner, fallbackRepo] = repo.id.split("/");
        if (!fallbackOwner || !fallbackRepo) {
            throw new Error(`Invalid GitHub repo id: ${repo.id}`);
        }
        return { owner: fallbackOwner, repoName: fallbackRepo };
    }
    async request(method, path, body) {
        const response = await fetch(`${this.apiBase}${path}`, {
            method,
            headers: {
                Authorization: `Bearer ${this.token}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`GitHub API error (${response.status} ${response.statusText}): ${text}`);
        }
        if (response.status === 204) {
            return {};
        }
        return (await response.json());
    }
    encodePath(path) {
        return path
            .split("/")
            .map((segment) => encodeURIComponent(segment))
            .join("/");
    }
}
//# sourceMappingURL=github.js.map