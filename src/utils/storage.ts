import { GitStorage } from "@pierre/storage";
import type { BenchmarkConfig } from "../config.js";

export function createStorageClient(config: BenchmarkConfig): GitStorage {
  return new GitStorage({
    name: config.organization.name,
    key: config.organization.privateKey,
  });
}
