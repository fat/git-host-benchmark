import { BaseBenchmark, runConcurrentBenchmark, type BenchmarkResult } from "../base.js";
import type { BenchmarkConfig } from "../../config.js";
import type { RepoHandle, StorageProvider } from "../../providers/types.js";

export class ForkBenchmark extends BaseBenchmark {
  private provider: StorageProvider;
  private baseRepo: RepoHandle;

  constructor(
    config: BenchmarkConfig,
    provider: StorageProvider,
    baseRepo: RepoHandle,
    namePrefix?: string
  ) {
    super(namePrefix ? `${namePrefix} / SDK Fork` : "SDK Fork", config);
    this.provider = provider;
    this.baseRepo = baseRepo;
  }

  async run(): Promise<BenchmarkResult[]> {
    console.log(`\n🍴 Running ${this.name} benchmark...`);

    const forkConfig = this.config.benchmarks.sdkFork;
    const iterations = forkConfig.iterations;
    const concurrencies = Array.isArray(forkConfig.concurrency)
      ? forkConfig.concurrency
      : [forkConfig.concurrency];

    const results: BenchmarkResult[] = [];

    for (const concurrency of concurrencies) {
      console.log(`  Testing with concurrency=${concurrency}...`);

      const { timings, errors } = await runConcurrentBenchmark(
        this.name,
        iterations,
        concurrency,
        async () => {
          const forkedRepo = await this.provider.forkRepo({
            baseRepoId: this.baseRepo.id,
          });
          return forkedRepo;
        },
        (current, total) => {
          if (current % 5 === 0 || current === total) {
            process.stdout.write(`\r  Progress: ${current}/${total}`);
          }
        }
      );

      console.log("");

      const successCount = timings.length;
      const avgMs =
        successCount > 0
          ? Number(timings.reduce((a, b) => a + b, 0n) / BigInt(successCount)) / 1_000_000
          : 0;

      console.log(`  ✓ Completed ${successCount}/${iterations} forks`);
      console.log(`  Average: ${avgMs.toFixed(2)}ms`);
      if (errors > 0) {
        console.log(`  Errors: ${errors}`);
      }

      results.push(
        this.createResult(timings, errors, {
          baseRepoId: this.baseRepo.id,
          concurrency,
        })
      );
    }

    return results;
  }
}
