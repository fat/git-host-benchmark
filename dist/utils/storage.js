import { GitStorage } from "@pierre/storage";
export function createStorageClient(config) {
    return new GitStorage({
        name: config.organization.name,
        key: config.organization.privateKey,
    });
}
//# sourceMappingURL=storage.js.map