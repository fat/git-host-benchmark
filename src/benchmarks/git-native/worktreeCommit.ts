import {
  BaseBenchmark,
  type BenchmarkResult,
  runConcurrentBenchmark,
} from "../base.js";
import type { BenchmarkConfig } from "../../config.js";
import {
  WorktreeManager,
  gitAdd,
  gitCommit,
  gitPush,
} from "../../utils/git.js";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateFileContent } from "../../utils/testData.js";

export class WorktreeCommitBenchmark extends BaseBenchmark {
  private baseRepoPath: string;
  private worktreeManager: WorktreeManager | null = null;

  constructor(config: BenchmarkConfig, baseRepoPath: string) {
    super("Concurrent Worktree Commit & Push", config);
    this.baseRepoPath = baseRepoPath;
  }

  async run(): Promise<BenchmarkResult> {
    console.log(`\n🌳 Running ${this.name} benchmark...`);

    const { concurrency, iterations } = this.config.benchmarks.worktreeCommit;

    console.log(`  Concurrency: ${concurrency}`);
    console.log(`  Iterations: ${iterations}`);

    // Create worktree manager
    this.worktreeManager = new WorktreeManager(this.baseRepoPath);

    // Create worktrees
    console.log(`  Creating ${concurrency} worktrees...`);
    const worktrees: string[] = [];
    for (let i = 0; i < concurrency; i++) {
      const branchName = `bench/worker-${i}`;
      const worktreePath = this.worktreeManager.createWorktree(branchName);
      worktrees.push(worktreePath);
    }

    console.log("  Running benchmark...");

    let operationIndex = 0;

    const { timings, errors, wallClockMs } = await runConcurrentBenchmark(
      this.name,
      iterations,
      concurrency,
      async (index) => {
        const worktreeIndex = index % concurrency;
        const worktreePath = worktrees[worktreeIndex];
        const opIndex = operationIndex++;

        // Create a file
        const fileName = `benchmark-${opIndex}.txt`;
        const filePath = join(worktreePath, fileName);
        const content = generateFileContent(1024, `iteration-${opIndex}`);

        writeFileSync(filePath, content);

        // Stage, commit, and push
        gitAdd([fileName], { cwd: worktreePath });
        gitCommit(`Benchmark commit ${opIndex}`, { cwd: worktreePath });
        await gitPush("origin", "HEAD", { cwd: worktreePath });

        return opIndex;
      },
      (current, total) => {
        if (current % Math.max(1, Math.floor(total / 10)) === 0) {
          process.stdout.write(`\r  Progress: ${current}/${total}`);
        }
      }
    );

    console.log(`\r  ✓ Completed ${timings.length} commit+push operations`);
    if (errors > 0) {
      console.log(`  ⚠ ${errors} errors occurred`);
    }

    // Cleanup worktrees
    console.log("  Cleaning up worktrees...");
    this.worktreeManager.cleanup();

    return this.createResult(timings, errors, { wallClockMs: Math.round(wallClockMs) });
  }
}
