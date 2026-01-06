import {
  BaseBenchmark,
  type BenchmarkResult,
  runConcurrentBenchmark,
} from "../base.js";
import type { BenchmarkConfig } from "../../config.js";
import { gitClone, removeDir } from "../../utils/git.js";
import { join } from "node:path";
import { calculateMetrics } from "../../utils/metrics.js";

export class RampCloneBenchmark extends BaseBenchmark {
  private remoteUrl: string;
  private workingDir: string;

  constructor(
    config: BenchmarkConfig,
    remoteUrl: string,
    namePrefix?: string
  ) {
    super(
      namePrefix ? `${namePrefix} / Ramp Clone` : "Ramp Clone",
      config
    );
    this.remoteUrl = remoteUrl;
    this.workingDir = config.workingDir;
  }

  async run(): Promise<BenchmarkResult[]> {
    console.log(`\n📈 Running ${this.name} benchmark...`);

    const { minConcurrency, maxConcurrency, step, iterations, stopP95Ms, stopErrorRate } =
      this.config.benchmarks.rampClone;

    console.log(
      `  Concurrency: ${minConcurrency}..${maxConcurrency} (step ${step}), Iterations: ${iterations}`
    );
    if (stopP95Ms) {
      console.log(`  Stop if P95 >= ${stopP95Ms}ms`);
    }
    if (stopErrorRate) {
      console.log(`  Stop if error rate >= ${(stopErrorRate * 100).toFixed(1)}%`);
    }

    const results: BenchmarkResult[] = [];

    for (let concurrency = minConcurrency; concurrency <= maxConcurrency; concurrency += step) {
      console.log(`\n  Testing concurrency: ${concurrency}`);

      const { timings, errors } = await runConcurrentBenchmark(
        this.name,
        iterations,
        concurrency,
        async (index) => {
          const clonePath = join(this.workingDir, `ramp-clone-${concurrency}-${index}`);
          await gitClone(this.remoteUrl, clonePath);
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

      const result = this.createResult(timings, errors, {
        concurrency,
      });
      result.name = `${this.name} (concurrency=${concurrency})`;
      results.push(result);

      const metrics = calculateMetrics(result);
      const errorRate = result.iterations > 0 ? errors / result.iterations : 0;

      if (stopP95Ms && metrics.latency.p95 >= stopP95Ms) {
        console.log(`  ⛔ Stopping ramp: P95 ${metrics.latency.p95.toFixed(2)}ms`);
        break;
      }
      if (stopErrorRate && errorRate >= stopErrorRate) {
        console.log(`  ⛔ Stopping ramp: error rate ${(errorRate * 100).toFixed(1)}%`);
        break;
      }
    }

    return results;
  }
}
