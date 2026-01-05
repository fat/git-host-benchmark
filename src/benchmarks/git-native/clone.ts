import {
  BaseBenchmark,
  type BenchmarkResult,
  runConcurrentBenchmark,
} from "../base.js";
import type { BenchmarkConfig } from "../../config.js";
import { gitClone, removeDir } from "../../utils/git.js";
import { join } from "node:path";

export class CloneBenchmark extends BaseBenchmark {
  private remoteUrl: string;
  private workingDir: string;

  constructor(config: BenchmarkConfig, remoteUrl: string) {
    super("Concurrent Clone", config);
    this.remoteUrl = remoteUrl;
    this.workingDir = config.workingDir;
  }

  async run(): Promise<BenchmarkResult> {
    console.log(`\n📥 Running ${this.name} benchmark...`);

    const { concurrency, iterations } = this.config.benchmarks.clone;

    console.log(`  Concurrency: ${concurrency}`);
    console.log(`  Iterations: ${iterations}`);

    // Warmup
    await this.warmup(async () => {
      const warmupPath = join(this.workingDir, "warmup-clone");
      await gitClone(this.remoteUrl, warmupPath);
      removeDir(warmupPath);
    }, 1);

    console.log("  Running benchmark...");

    const { timings, errors } = await runConcurrentBenchmark(
      this.name,
      iterations,
      concurrency,
      async (index) => {
        const clonePath = join(this.workingDir, `clone-${index}`);
        await gitClone(this.remoteUrl, clonePath);
        // Clean up immediately after cloning
        removeDir(clonePath);
        return clonePath;
      },
      (current, total) => {
        if (current % Math.max(1, Math.floor(total / 10)) === 0) {
          process.stdout.write(`\r  Progress: ${current}/${total}`);
        }
      }
    );

    console.log(`\r  ✓ Completed ${timings.length} clones`);
    if (errors > 0) {
      console.log(`  ⚠ ${errors} errors occurred`);
    }

    return this.createResult(timings, errors);
  }
}
