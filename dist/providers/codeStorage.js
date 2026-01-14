import { GitStorage } from "@pierre/storage";
export class CodeStorageProvider {
    config;
    name = "code.storage";
    storage;
    constructor(config) {
        this.config = config;
        this.storage = new GitStorage({
            name: config.organization.name,
            key: config.organization.privateKey,
        });
    }
    async createRepo() {
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
    async listFiles(repo) {
        const target = await this.storage.findOne({ id: repo.id });
        if (!target) {
            throw new Error(`Repository ${repo.id} not found`);
        }
        const result = await target.listFiles();
        return result.paths.length;
    }
    async createCommit(repo, input) {
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
    async deletePath(repo, input) {
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
//# sourceMappingURL=codeStorage.js.map