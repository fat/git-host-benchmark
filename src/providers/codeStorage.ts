import { GitStorage } from "@pierre/storage";
import type { BenchmarkConfig } from "../config.js";
import type {
  CreateCommitInput,
  DeletePathInput,
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

  async listFiles(repo: RepoHandle): Promise<number> {
    const target = await this.storage.findOne({ id: repo.id });
    if (!target) {
      throw new Error(`Repository ${repo.id} not found`);
    }

    const result = await target.listFiles();
    return result.paths.length;
  }

  async createCommit(repo: RepoHandle, input: CreateCommitInput): Promise<string> {
    const target = await this.storage.findOne({ id: repo.id });
    if (!target) {
      throw new Error(`Repository ${repo.id} not found`);
    }

    const commitBuilder = target.createCommit({
      targetBranch: repo.defaultBranch,
      commitMessage: input.message,
      author: { name: "Benchmark", email: "benchmark@test.local" },
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
        author: { name: "Benchmark", email: "benchmark@test.local" },
      })
      .deletePath(input.path)
      .send();

    return result.commitSha;
  }
}
