import {
  BaseBenchmark,
  type BenchmarkResult,
  runBenchmarkWithProgress,
  runConcurrentBenchmark,
} from "../base.js";
import type { BenchmarkConfig } from "../../config.js";
import { createStorageClient } from "../../utils/storage.js";
import { generateFileContent, generateFileName } from "../../utils/testData.js";

export class DeletePathBenchmark extends BaseBenchmark {
  private repoId: string;

  constructor(config: BenchmarkConfig, repoId: string) {
    super("SDK: deletePath", config);
    this.repoId = repoId;
  }

  async run(): Promise<BenchmarkResult | BenchmarkResult[]> {
    console.log(`\n🗑️  Running ${this.name} benchmark...`);

    const { iterations, concurrency } = this.config.benchmarks.sdkDeletePath;
    const concurrencyLevels = Array.isArray(concurrency)
      ? concurrency
      : [concurrency];

    const storage = createStorageClient(this.config);
    const repo = await storage.findOne({ id: this.repoId });

    if (!repo) {
      throw new Error(`Repository ${this.repoId} not found`);
    }

    // First, create files to delete (total needed across all concurrency levels)
    const totalFilesNeeded = iterations * concurrencyLevels.length;
    console.log(`  Creating ${totalFilesNeeded} test files...`);
    for (let i = 0; i < totalFilesNeeded; i++) {
      const fileName = generateFileName("to-delete", i);
      await repo
        .createCommit({
          targetBranch: "main",
          commitMessage: `Create file for deletion test ${i}`,
          author: { name: "Benchmark", email: "benchmark@test.local" },
        })
        .addFileFromString(
          fileName,
          generateFileContent(100, `delete-test-${i}`)
        )
        .send();
    }

    console.log("  Files created, starting deletion benchmark...");

    // Warmup
    let warmupComplete = false;
    await this.warmup(async () => {
      const result = await repo
        .createCommit({
          targetBranch: "main",
          commitMessage: "Warmup deletion",
          author: { name: "Benchmark", email: "benchmark@test.local" },
        })
        .deletePath("warmup.txt")
        .send();
      if (!warmupComplete) {
        console.log("  Warmup result:");
        console.log(result);
        warmupComplete = true;
      }
    }, 1);

    const allTimings: bigint[] = [];
    let totalErrors = 0;
    let fileOffset = 0;
    const results: BenchmarkResult[] = [];

    for (const concurrencyLevel of concurrencyLevels) {
      console.log(`\n  Testing with concurrency: ${concurrencyLevel}`);
      console.log(`  Iterations: ${iterations}`);
      console.log("  Running benchmark...");

      const { timings, errors } =
        concurrencyLevel === 1
          ? await runBenchmarkWithProgress(
              this.name,
              iterations,
              async (index) => {
                const fileName = generateFileName(
                  "to-delete",
                  fileOffset + index
                );

                const result = await repo
                  .createCommit({
                    targetBranch: "main",
                    commitMessage: `Delete ${fileName}`,
                    author: {
                      name: "Benchmark",
                      email: "benchmark@test.local",
                    },
                  })
                  .deletePath(fileName)
                  .send();

                return result.commitSha;
              },
              (current, total) => {
                if (current % Math.max(1, Math.floor(total / 10)) === 0) {
                  process.stdout.write(`\r  Progress: ${current}/${total}`);
                }
              }
            )
          : await runConcurrentBenchmark(
              this.name,
              iterations,
              concurrencyLevel,
              async (index) => {
                const fileName = generateFileName(
                  "to-delete",
                  fileOffset + index
                );

                const result = await repo
                  .createCommit({
                    targetBranch: "main",
                    commitMessage: `Delete ${fileName}`,
                    author: {
                      name: "Benchmark",
                      email: "benchmark@test.local",
                    },
                  })
                  .deletePath(fileName)
                  .send();

                return result.commitSha;
              },
              (current, total) => {
                if (current % Math.max(1, Math.floor(total / 10)) === 0) {
                  process.stdout.write(`\r  Progress: ${current}/${total}`);
                }
              }
            );

      fileOffset += iterations;
      allTimings.push(...timings);
      totalErrors += errors;

      console.log(
        `\r  ✓ Completed ${timings.length} deletions at concurrency ${concurrencyLevel}`
      );
      if (errors > 0) {
        console.log(`  ⚠ ${errors} errors occurred`);
      }

      // If printSummaryPerConfig is enabled, store individual results
      if (this.config.printSummaryPerConfig) {
        results.push(
          this.createResult(timings, errors, {
            concurrency: concurrencyLevel,
          })
        );
        // Update the name to include the configuration
        results[results.length - 1].name = `${this.name} (concurrency=${concurrencyLevel})`;
      }
    }

    // Return individual results or combined result
    if (this.config.printSummaryPerConfig && results.length > 0) {
      return results;
    }

    return this.createResult(allTimings, totalErrors, {
      concurrencyLevels,
      iterationsPerLevel: iterations,
    });
  }
}
