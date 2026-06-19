import {
  BaseBenchmark,
  type BenchmarkResult,
  runConcurrentBenchmark,
} from "../base.js";
import type { BenchmarkConfig } from "../../config.js";
import { createStorageClient } from "../../utils/storage.js";
import { generateLineContent, generateFileName } from "../../utils/testData.js";

export class ContentionWriteBenchmark extends BaseBenchmark {
  private repoId: string;

  constructor(config: BenchmarkConfig, repoId: string) {
    super("SDK: Contention Merge", config);
    this.repoId = repoId;
  }

  async run(): Promise<BenchmarkResult[]> {
    console.log(`\n🔥 Running ${this.name} benchmark...`);

    const { concurrency, iterations, diffLineCounts } =
      this.config.benchmarks.contentionWrite;

    console.log(`  Concurrency: ${concurrency}`);
    console.log(`  Iterations per diff size: ${iterations}`);
    console.log(`  Diff sizes (lines): ${diffLineCounts.join(", ")}`);

    const storage = createStorageClient(this.config);
    const repo = await storage.findOne({ id: this.repoId });

    if (!repo) {
      throw new Error(`Repository ${this.repoId} not found`);
    }

    const results: BenchmarkResult[] = [];
    let globalCounter = 0;

    for (const lineCount of diffLineCounts) {
      console.log(`\n  Testing with ${lineCount}-line diffs...`);

      // Warmup: create a branch, commit to it, merge it
      await this.warmup(async () => {
        const branchName = `warmup-merge-${lineCount}-${Date.now()}`;
        const content = generateLineContent(lineCount, `warmup-${lineCount}`);

        await repo.createBranch({
          baseBranch: "main",
          targetBranch: branchName,
        });

        const commitBuilder = repo.createCommit({
          targetBranch: branchName,
          commitMessage: `Warmup branch commit (${lineCount} lines)`,
          author: { name: "Benchmark", email: "benchmark@test.local" },
        });
        commitBuilder.addFileFromString(`warmup-merge-${lineCount}.txt`, content);
        await commitBuilder.send();

        await repo.merge({
          sourceBranch: branchName,
          targetBranch: "main",
          strategy: "merge",
          commitMessage: `Warmup merge ${branchName}`,
          author: { name: "Benchmark", email: "benchmark@test.local" },
        });
      }, 1);

      // Pre-create all branches with their commits
      console.log(`    Pre-creating ${iterations} branches...`);
      const branchNames: string[] = [];

      for (let i = 0; i < iterations; i++) {
        const commitId = globalCounter++;
        const branchName = `contention-${lineCount}L-${commitId}`;
        const content = generateLineContent(lineCount, `contention-${commitId}`);
        const fileName = generateFileName(`contention-${lineCount}L-${commitId}`, 0);

        await repo.createBranch({
          baseBranch: "main",
          targetBranch: branchName,
        });

        const commitBuilder = repo.createCommit({
          targetBranch: branchName,
          commitMessage: `Branch commit ${commitId} (${lineCount} lines)`,
          author: { name: "Benchmark", email: "benchmark@test.local" },
        });

        commitBuilder.addFileFromString(fileName, content);
        await commitBuilder.send();
        branchNames.push(branchName);

        if ((i + 1) % Math.max(1, Math.floor(iterations / 5)) === 0) {
          process.stdout.write(`\r    Created ${i + 1}/${iterations} branches`);
        }
      }
      console.log(`\r    ✓ Created ${iterations} branches`);

      // Benchmark: only measure the merges
      console.log("    Running merge benchmark...");

      const { timings, errors, wallClockMs } = await runConcurrentBenchmark(
        this.name,
        iterations,
        concurrency,
        async (index) => {
          const result = await repo.merge({
            sourceBranch: branchNames[index],
            targetBranch: "main",
            strategy: "merge",
            commitMessage: `Merge ${branchNames[index]}`,
            author: { name: "Benchmark", email: "benchmark@test.local" },
          });
          return result.commitSha;
        },
        (current, total) => {
          if (current % Math.max(1, Math.floor(total / 10)) === 0) {
            process.stdout.write(`\r    Progress: ${current}/${total}`);
          }
        }
      );

      const successCount = timings.length;
      const mergesPerSecond = successCount / (wallClockMs / 1000);

      console.log(
        `\r    ✓ ${successCount} merges in ${(wallClockMs / 1000).toFixed(1)}s — ${mergesPerSecond.toFixed(1)} merges/sec`
      );
      if (errors > 0) {
        console.log(`    ⚠ ${errors} errors occurred`);
      }

      const result = this.createResult(timings, errors, {
        diffLineCount: lineCount,
        concurrency,
        wallClockMs: Math.round(wallClockMs),
        mergesPerSecond: Math.round(mergesPerSecond * 100) / 100,
      });
      result.name = `${this.name} (${lineCount} lines)`;
      results.push(result);
    }

    return results;
  }
}
