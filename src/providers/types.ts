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

export interface ReadFileResult {
  content: Buffer;
  size: number;
}

export interface StorageProvider {
  name: string;
  createRepo(): Promise<RepoHandle>;
  listFiles(repo: RepoHandle): Promise<number>;
  readFile(repo: RepoHandle, path: string): Promise<ReadFileResult>;
  createCommit(repo: RepoHandle, input: CreateCommitInput): Promise<string>;
  deletePath(repo: RepoHandle, input: DeletePathInput): Promise<string>;
}
