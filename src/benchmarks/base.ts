import type { BenchmarkConfig } from "../config.js";

export interface BenchmarkResult {
  name: string;
  iterations: number;
  timings: bigint[]; // nanoseconds
  errors: number;
  metadata?: Record<string, unknown>;
}

export interface BenchmarkMetrics {
  name: string;
  iterations: number;
  successCount: number;
  errorCount: number;
  latency: {
    min: number; // milliseconds
    max: number;
    mean: number;
    median: number;
    p95: number;
    p99: number;
    stdDev: number;
  };
  throughput: {
    opsPerSecond: number;
  };
  metadata?: Record<string, unknown>;
}

export abstract class BaseBenchmark {
  protected config: BenchmarkConfig;
  protected name: string;

  constructor(name: string, config: BenchmarkConfig) {
    this.name = name;
    this.config = config;
  }

  abstract run(): Promise<BenchmarkResult | BenchmarkResult[]>;

  protected async measureAsync<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: bigint }> {
    const start = process.hrtime.bigint();
    const result = await operation();
    const end = process.hrtime.bigint();
    return { result, duration: end - start };
  }

  protected measure<T>(operation: () => T): { result: T; duration: bigint } {
    const start = process.hrtime.bigint();
    const result = operation();
    const end = process.hrtime.bigint();
    return { result, duration: end - start };
  }

  protected async warmup(
    operation: () => Promise<void>,
    runs: number = 3
  ): Promise<void> {
    console.log(`  Warming up (${runs} runs)...`);
    for (let i = 0; i < runs; i++) {
      try {
        await operation();
      } catch (error) {
        // Ignore warmup errors
      }
    }
  }

  protected createResult(
    timings: bigint[],
    errors: number,
    metadata?: Record<string, unknown>
  ): BenchmarkResult {
    return {
      name: this.name,
      iterations: timings.length + errors,
      timings,
      errors,
      metadata,
    };
  }

  getName(): string {
    return this.name;
  }
}

export async function runBenchmarkWithProgress<T>(
  name: string,
  iterations: number,
  operation: (index: number) => Promise<T>,
  onProgress?: (current: number, total: number) => void
): Promise<{ results: T[]; timings: bigint[]; errors: number }> {
  const results: T[] = [];
  const timings: bigint[] = [];
  let errors = 0;

  for (let i = 0; i < iterations; i++) {
    try {
      const start = process.hrtime.bigint();
      const result = await operation(i);
      const end = process.hrtime.bigint();

      results.push(result);
      timings.push(end - start);

      if (onProgress) {
        onProgress(i + 1, iterations);
      }
    } catch (error) {
      errors++;
      console.error(
        `  Error in iteration ${i + 1}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  return { results, timings, errors };
}

export async function runConcurrentBenchmark<T>(
  name: string,
  totalIterations: number,
  concurrency: number,
  operation: (index: number) => Promise<T>,
  onProgress?: (current: number, total: number) => void
): Promise<{ results: T[]; timings: bigint[]; errors: number }> {
  const results: T[] = [];
  const timings: bigint[] = [];
  let errors = 0;
  let completed = 0;

  const promises: Promise<void>[] = [];

  for (let i = 0; i < totalIterations; i++) {
    const index = i;

    const promise = (async () => {
      try {
        const start = process.hrtime.bigint();
        const result = await operation(index);
        const end = process.hrtime.bigint();

        results.push(result);
        timings.push(end - start);
      } catch (error) {
        errors++;
        console.error(
          `  Error in concurrent iteration ${index + 1}:`,
          error instanceof Error ? error.message : error
        );
      } finally {
        completed++;
        if (onProgress) {
          onProgress(completed, totalIterations);
        }
      }
    })();

    promises.push(promise);

    // Limit concurrency
    if (promises.length >= concurrency) {
      await Promise.race(promises);
      // Remove completed promises
      const stillRunning = promises.filter((p) => {
        let resolved = false;
        p.then(() => {
          resolved = true;
        }).catch(() => {
          resolved = true;
        });
        return !resolved;
      });
      promises.length = 0;
      promises.push(...stillRunning);
    }
  }

  // Wait for remaining promises
  await Promise.all(promises);

  return { results, timings, errors };
}
