export interface RepoHandle {
  id: string;
  remoteUrl: string;
  defaultBranch: string;
  metadata?: Record<string, string>;
}

export interface CreateCommitInput {
  message: string;
  files: Array<{ path: string; content: string }>;
}

export interface DeletePathInput {
  message: string;
  path: string;
}

export interface StorageProvider {
  name: string;
  createRepo(): Promise<RepoHandle>;
  listFiles(repo: RepoHandle): Promise<number>;
  createCommit(repo: RepoHandle, input: CreateCommitInput): Promise<string>;
  deletePath(repo: RepoHandle, input: DeletePathInput): Promise<string>;
}
