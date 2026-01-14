import { BaseBenchmark } from "../base.js";
import { gitRemoteAdd, gitRemoteExists, gitRemoteRemove, gitPush, getRepoSize, } from "../../utils/git.js";
import { existsSync } from "node:fs";
export class InitialPushBenchmark extends BaseBenchmark {
    repo = null;
    remoteUrl = null;
    provider;
    constructor(config, provider, namePrefix) {
        super(namePrefix ? `${namePrefix} / Initial Push` : "Initial Push", config);
        this.provider = provider;
    }
    async run() {
        console.log(`\n📤 Running ${this.name} benchmark...`);
        const localRepoPath = this.config.localRepo;
        // Validate local repo exists
        if (!existsSync(localRepoPath)) {
            throw new Error(`Local repository not found at: ${localRepoPath}`);
        }
        if (!existsSync(`${localRepoPath}/.git`)) {
            throw new Error(`Not a git repository: ${localRepoPath}`);
        }
        console.log(`  Using local repository: ${localRepoPath}`);
        // Create remote repository via provider
        console.log("  Creating remote repository...");
        this.repo = await this.provider.createRepo();
        this.remoteUrl = this.repo.remoteUrl;
        console.log(`  Created repository: ${this.repo.id}`);
        // Add remote to local repo (remove existing one if present for repeatability)
        console.log("  Adding remote...");
        if (gitRemoteExists("benchmark", { cwd: localRepoPath })) {
            console.log("  Removing existing 'benchmark' remote...");
            gitRemoteRemove("benchmark", { cwd: localRepoPath });
        }
        gitRemoteAdd("benchmark", this.remoteUrl, { cwd: localRepoPath });
        // Measure push
        console.log("  Pushing to remote...");
        const repoSize = getRepoSize(localRepoPath);
        const { duration } = await this.measureAsync(async () => {
            await gitPush("benchmark", "HEAD:main", { cwd: localRepoPath });
        });
        const durationMs = Number(duration) / 1_000_000;
        const speedMBps = repoSize / (durationMs / 1000) / (1024 * 1024);
        console.log(`  ✓ Push completed in ${durationMs.toFixed(2)}ms`);
        console.log(`  Repository size: ${(repoSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Speed: ${speedMBps.toFixed(2)} MB/s`);
        return this.createResult([duration], 0, {
            repoId: this.repo?.id,
            repoSize,
            speedMBps,
        });
    }
    getRepo() {
        return this.repo;
    }
    getRemoteUrl() {
        return this.remoteUrl;
    }
}
//# sourceMappingURL=initialPush.js.map