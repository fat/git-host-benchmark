import { randomUUID } from "node:crypto";
import type { BenchmarkConfig } from "../config.js";
import type {
  CreateCommitInput,
  DeletePathInput,
  ForkRepoInput,
  ReadFileResult,
  RepoHandle,
  StorageProvider,
} from "./types.js";

interface GitHubRepoResponse {
  name: string;
  full_name: string;
  clone_url: string;
  default_branch: string;
  owner: { login: string };
}

interface GitHubRefResponse {
  object: { sha: string };
}

interface GitHubCommitResponse {
  sha: string;
  tree: { sha: string };
}

interface GitHubTreeResponse {
  sha: string;
  tree: Array<{ path: string; type: string }>;
  truncated?: boolean;
}

interface GitHubBlobResponse {
  sha: string;
}

interface GitHubContentResponse {
  sha: string;
  type: string;
}

interface GitHubDeleteContentResponse {
  commit: { sha: string };
}

export class GitHubProvider implements StorageProvider {
  name = "github";
  private token: string;
  private owner?: string;
  private ownerType: "org" | "user";
  private repoPrefix: string;
  private visibility: "private" | "public";
  private apiBase: string;

  constructor(private config: BenchmarkConfig) {
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

  async createRepo(): Promise<RepoHandle> {
    const repoName = `${this.repoPrefix}-${randomUUID().slice(0, 8)}`;
    const payload = {
      name: repoName,
      private: this.visibility === "private",
    };

    const repo =
      this.ownerType === "org"
        ? await this.request<GitHubRepoResponse>(
            "POST",
            `/orgs/${this.owner}/repos`,
            payload
          )
        : await this.request<GitHubRepoResponse>(
            "POST",
            "/user/repos",
            payload
          );

    const owner = repo.owner.login;
    const remoteUrl = `https://x-access-token:${encodeURIComponent(
      this.token
    )}@github.com/${owner}/${repo.name}.git`;

    return {
      id: repo.full_name,
      remoteUrl,
      defaultBranch: repo.default_branch || "main",
      metadata: { owner, repo: repo.name },
    };
  }

  async forkRepo(_input: ForkRepoInput): Promise<RepoHandle> {
    throw new Error("forkRepo is not supported for GitHub provider");
  }

  async listFiles(repo: RepoHandle): Promise<number> {
    const { owner, repoName } = this.getRepoIdentity(repo);
    const { treeSha } = await this.getHeadCommit(owner, repoName, repo);
    const tree = await this.request<GitHubTreeResponse>(
      "GET",
      `/repos/${owner}/${repoName}/git/trees/${treeSha}?recursive=1`
    );

    return tree.tree.filter((entry) => entry.type === "blob").length;
  }

  async readFile(repo: RepoHandle, path: string): Promise<ReadFileResult> {
    const { owner, repoName } = this.getRepoIdentity(repo);
    const encodedPath = this.encodePath(path);
    const response = await this.request<{ content: string; encoding: string; size: number }>(
      "GET",
      `/repos/${owner}/${repoName}/contents/${encodedPath}?ref=${repo.defaultBranch}`
    );

    const content = Buffer.from(response.content, "base64");
    return { content, size: response.size };
  }

  async createCommit(repo: RepoHandle, input: CreateCommitInput): Promise<string> {
    const { owner, repoName } = this.getRepoIdentity(repo);
    return this.createCommitWithChanges(owner, repoName, repo, {
      message: input.message,
      adds: input.files,
      deletes: [],
    });
  }

  async deletePath(repo: RepoHandle, input: DeletePathInput): Promise<string> {
    const { owner, repoName } = this.getRepoIdentity(repo);
    const encodedPath = this.encodePath(input.path);
    try {
      const file = await this.request<GitHubContentResponse>(
        "GET",
        `/repos/${owner}/${repoName}/contents/${encodedPath}?ref=${repo.defaultBranch}`
      );

      if (file.type !== "file") {
        throw new Error(`GitHub path is not a file: ${input.path}`);
      }

      const result = await this.request<GitHubDeleteContentResponse>(
        "DELETE",
        `/repos/${owner}/${repoName}/contents/${encodedPath}`,
        {
          message: input.message,
          sha: file.sha,
          branch: repo.defaultBranch,
        }
      );

      return result.commit.sha;
    } catch (error) {
      if (process.env.BENCH_DEBUG_GITHUB_DELETE === "1") {
        console.error(
          `[github deletePath] ${owner}/${repoName} ${input.path}:`,
          error instanceof Error ? error.message : error
        );
      }
      throw error;
    }
  }

  private async createCommitWithChanges(
    owner: string,
    repoName: string,
    repo: RepoHandle,
    input: { message: string; adds: Array<{ path: string; content: string }>; deletes: string[] }
  ): Promise<string> {
    const { sha: baseSha, treeSha } = await this.getHeadCommit(owner, repoName, repo);

    const blobs = await Promise.all(
      input.adds.map(async (file) => {
        const blob = await this.request<GitHubBlobResponse>(
          "POST",
          `/repos/${owner}/${repoName}/git/blobs`,
          { content: file.content, encoding: "utf-8" }
        );
        return { path: file.path, sha: blob.sha };
      })
    );

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

    const newTree = await this.request<GitHubTreeResponse>(
      "POST",
      `/repos/${owner}/${repoName}/git/trees`,
      {
        base_tree: treeSha,
        tree: treeEntries,
      }
    );

    const newCommit = await this.request<GitHubCommitResponse>(
      "POST",
      `/repos/${owner}/${repoName}/git/commits`,
      {
        message: input.message,
        tree: newTree.sha,
        parents: [baseSha],
      }
    );

    await this.request(
      "PATCH",
      `/repos/${owner}/${repoName}/git/refs/heads/${repo.defaultBranch}`,
      { sha: newCommit.sha, force: true }
    );

    return newCommit.sha;
  }

  private async getHeadCommit(
    owner: string,
    repoName: string,
    repo: RepoHandle
  ): Promise<{ sha: string; treeSha: string }> {
    const ref = await this.request<GitHubRefResponse>(
      "GET",
      `/repos/${owner}/${repoName}/git/ref/heads/${repo.defaultBranch}`
    );
    const commit = await this.request<GitHubCommitResponse>(
      "GET",
      `/repos/${owner}/${repoName}/git/commits/${ref.object.sha}`
    );

    return { sha: commit.sha, treeSha: commit.tree.sha };
  }

  private getRepoIdentity(repo: RepoHandle): { owner: string; repoName: string } {
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

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
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
      throw new Error(
        `GitHub API error (${response.status} ${response.statusText}): ${text}`
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  private encodePath(path: string): string {
    return path
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
  }
}
