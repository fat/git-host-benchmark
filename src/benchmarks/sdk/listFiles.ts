import {
  BaseBenchmark,
  type BenchmarkResult,
  runBenchmarkWithProgress,
  runConcurrentBenchmark,
} from "../base.js";
import type { BenchmarkConfig } from "../../config.js";
import { createStorageClient } from "../../utils/storage.js";

export class ListFilesBenchmark extends BaseBenchmark {
  private repoId: string;

  constructor(config: BenchmarkConfig, repoId: string) {
    super("SDK: listFiles", config);
    this.repoId = repoId;
  }

  async run(): Promise<BenchmarkResult | BenchmarkResult[]> {
    console.log(`\n📁 Running ${this.name} benchmark...`);

    const { iterations, concurrency } = this.config.benchmarks.sdkListFiles;
    const concurrencyLevels = Array.isArray(concurrency)
      ? concurrency
      : [concurrency];

    const storage = createStorageClient(this.config);
    const repo = await storage.findOne({ id: this.repoId });

    if (!repo) {
      throw new Error(`Repository ${this.repoId} not found`);
    }

    // Warmup
    let warmupComplete = false;
    await this.warmup(async () => {
      const result = await repo.listFiles();
      if (!warmupComplete) {
        console.log(`  Warmup result: ${result.paths.length} files found`);
        console.log(result);
        warmupComplete = true;
      }
    }, 3);

    const allTimings: bigint[] = [];
    let totalErrors = 0;
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
              async () => {
                const result = await repo.listFiles();
                return result.paths.length;
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
              async () => {
                const result = await repo.listFiles();
                return result.paths.length;
              },
              (current, total) => {
                if (current % Math.max(1, Math.floor(total / 10)) === 0) {
                  process.stdout.write(`\r  Progress: ${current}/${total}`);
                }
              }
            );

      allTimings.push(...timings);
      totalErrors += errors;

      console.log(
        `\r  ✓ Completed ${timings.length} listFiles calls at concurrency ${concurrencyLevel}`
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
