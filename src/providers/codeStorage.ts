import { GitStorage } from "@pierre/storage";
import type { BenchmarkConfig } from "../config.js";
import type {
  CreateCommitInput,
  DeletePathInput,
  ForkRepoInput,
  ReadFileResult,
  RepoHandle,
  StorageProvider,
} from "./types.js";

export class CodeStorageProvider implements StorageProvider {
  name = "code.storage";
  private storage: GitStorage;

  constructor(private config: BenchmarkConfig) {
    this.storage = new GitStorage({
      name: config.organization.name,
      key: config.organization.privateKey,
    });
  }

  async createRepo(): Promise<RepoHandle> {
    const repo = await this.storage.createRepo();
    const remoteUrl = await repo.getRemoteURL({
      permissions: ["git:read", "git:write"],
      ttl: 3600,
    });

    return {
      id: repo.id,
      remoteUrl,
      defaultBranch: "main",
      metadata: { repoId: repo.id },
    };
  }

  async forkRepo(input: ForkRepoInput): Promise<RepoHandle> {
    const repo = await this.storage.createRepo({
      baseRepo: {
        id: input.baseRepoId,
      },
    });
    const remoteUrl = await repo.getRemoteURL({
      permissions: ["git:read", "git:write"],
      ttl: 3600,
    });

    return {
      id: repo.id,
      remoteUrl,
      defaultBranch: "main",
      metadata: { repoId: repo.id, forkedFrom: input.baseRepoId },
    };
  }

  async listFiles(repo: RepoHandle): Promise<number> {
    const target = await this.storage.findOne({ id: repo.id });
    if (!target) {
      throw new Error(`Repository ${repo.id} not found`);
    }

    const result = await target.listFiles();
    return result.paths.length;
  }

  async readFile(repo: RepoHandle, path: string): Promise<ReadFileResult> {
    const target = await this.storage.findOne({ id: repo.id });
    if (!target) {
      throw new Error(`Repository ${repo.id} not found`);
    }

    const response = await target.getFileStream({ path });
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get reader from response body");
    }

    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const content = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    return { content, size: totalLength };
  }

  async createCommit(repo: RepoHandle, input: CreateCommitInput): Promise<string> {
    const target = await this.storage.findOne({ id: repo.id });
    if (!target) {
      throw new Error(`Repository ${repo.id} not found`);
    }

    const commitBuilder = target.createCommit({
      targetBranch: repo.defaultBranch,
      commitMessage: input.message,
      author: { name: "Sasha Solomon", email: "benchmark@test.local" },
    });

    for (const file of input.files) {
      commitBuilder.addFileFromString(file.path, file.content);
    }

    const result = await commitBuilder.send();
    return result.commitSha;
  }

  async deletePath(repo: RepoHandle, input: DeletePathInput): Promise<string> {
    const target = await this.storage.findOne({ id: repo.id });
    if (!target) {
      throw new Error(`Repository ${repo.id} not found`);
    }

    const result = await target
      .createCommit({
        targetBranch: repo.defaultBranch,
        commitMessage: input.message,
        author: { name: "Sasha Solomon", email: "benchmark@test.local" },
      })
      .deletePath(input.path)
      .send();

    return result.commitSha;
  }
}
