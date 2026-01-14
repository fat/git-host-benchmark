import {
  BaseBenchmark,
  type BenchmarkResult,
  runConcurrentBenchmark,
} from "../base.js";
import type { BenchmarkConfig } from "../../config.js";
import { gitShallowClone, removeDir } from "../../utils/git.js";
import { join } from "node:path";

export class ShallowCloneBenchmark extends BaseBenchmark {
  private remoteUrl: string;
  private workingDir: string;

  constructor(
    config: BenchmarkConfig,
    remoteUrl: string,
    namePrefix?: string
  ) {
    super(
      namePrefix ? `${namePrefix} / Concurrent Shallow Clone` : "Concurrent Shallow Clone",
      config
    );
    this.remoteUrl = remoteUrl;
    this.workingDir = config.workingDir;
  }

  async run(): Promise<BenchmarkResult> {
    console.log(`\n📥 Running ${this.name} benchmark...`);

    const { concurrency, iterations } = this.config.benchmarks.shallowClone;

    console.log(`  Concurrency: ${concurrency}`);
    console.log(`  Iterations: ${iterations}`);

    // Warmup
    await this.warmup(async () => {
      const warmupPath = join(this.workingDir, "warmup-shallow-clone");
      await gitShallowClone(this.remoteUrl, warmupPath);
      removeDir(warmupPath);
    }, 1);

    console.log("  Running benchmark...");

    const { timings, errors } = await runConcurrentBenchmark(
      this.name,
      iterations,
      concurrency,
      async (index) => {
        const clonePath = join(this.workingDir, `shallow-clone-${index}`);
        await gitShallowClone(this.remoteUrl, clonePath);
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

    console.log(`\r  ✓ Completed ${timings.length} shallow clones`);
    if (errors > 0) {
      console.log(`  ⚠ ${errors} errors occurred`);
    }

    return this.createResult(timings, errors);
  }
}
