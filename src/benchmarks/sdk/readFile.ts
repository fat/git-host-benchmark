import {
  BaseBenchmark,
  type BenchmarkResult,
  runBenchmarkWithProgress,
  runConcurrentBenchmark,
} from "../base.js";
import type { BenchmarkConfig } from "../../config.js";
import type { RepoHandle, StorageProvider } from "../../providers/types.js";

export class ReadFileBenchmark extends BaseBenchmark {
  private repo: RepoHandle;
  private provider: StorageProvider;
  private filePaths: string[] = [];

  constructor(
    config: BenchmarkConfig,
    provider: StorageProvider,
    repo: RepoHandle,
    namePrefix?: string
  ) {
    super(namePrefix ? `${namePrefix} / SDK: readFile` : "SDK: readFile", config);
    this.provider = provider;
    this.repo = repo;
  }

  async run(): Promise<BenchmarkResult | BenchmarkResult[]> {
    console.log(`\n📖 Running ${this.name} benchmark...`);

    const { iterations, concurrency } = this.config.benchmarks.sdkReadFile;
    const concurrencyLevels = Array.isArray(concurrency)
      ? concurrency
      : [concurrency];

    // First, get a list of files to read from the repo
    console.log("  Fetching file list...");
    const fileCount = await this.provider.listFiles(this.repo);
    if (fileCount === 0) {
      throw new Error("Repository has no files to read");
    }

    // Generate file paths matching the test repo pattern: file-00001.txt, file-00002.txt, etc.
    // Exclude README.md from the count (fileCount - 1 data files)
    const dataFileCount = Math.max(1, fileCount - 1);
    this.filePaths = [];
    for (let i = 1; i <= Math.min(dataFileCount, 100); i++) {
      const paddedNum = String(i).padStart(5, "0");
      this.filePaths.push(`file-${paddedNum}.txt`);
    }

    // Warmup using the first file
    let warmupComplete = false;
    await this.warmup(async () => {
      const result = await this.provider.readFile(this.repo, this.filePaths[0]);
      if (!warmupComplete) {
        console.log(`  Warmup result: read ${result.size} bytes from ${this.filePaths[0]}`);
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
              async (index) => {
                const filePath = this.filePaths[index % this.filePaths.length];
                const result = await this.provider.readFile(this.repo, filePath);
                return result.size;
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
                const filePath = this.filePaths[index % this.filePaths.length];
                const result = await this.provider.readFile(this.repo, filePath);
                return result.size;
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
        `\r  ✓ Completed ${timings.length} readFile calls at concurrency ${concurrencyLevel}`
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
