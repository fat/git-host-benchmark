import {
  BaseBenchmark,
  type BenchmarkResult,
  runConcurrentBenchmark,
} from "../base.js";
import type { BenchmarkConfig } from "../../config.js";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateFileContent } from "../../utils/testData.js";

export class ParallelPushBenchmark extends BaseBenchmark {
  private remoteUrl: string;
  private baseRepoPath: string;

  constructor(
    config: BenchmarkConfig,
    remoteUrl: string,
    baseRepoPath: string
  ) {
    super("Parallel Push", config);
    this.remoteUrl = remoteUrl;
    this.baseRepoPath = baseRepoPath;
  }

  async run(): Promise<BenchmarkResult> {
    console.log(`\n📤 Running ${this.name} benchmark...`);

    const { concurrency, iterations } = this.config.benchmarks.parallelPush;
    const totalBranches = concurrency * iterations;

    console.log(`  Concurrency: ${concurrency}`);
    console.log(`  Iterations: ${iterations}`);
    console.log(`  Total branches to create: ${totalBranches}`);

    // Step 1: Create all branches locally with commits (NOT timed)
    console.log("  Creating branches and commits locally...");
    const branchNames: string[] = [];

    for (let i = 0; i < totalBranches; i++) {
      const branchName = `bench/parallel-push-${i}`;
      branchNames.push(branchName);

      // Create and checkout branch
      try {
        execFileSync("git", ["checkout", "-b", branchName], {
          cwd: this.baseRepoPath,
          stdio: "pipe",
        });
      } catch (error) {
        continue;
      }

      // Create a file and commit
      const fileName = `parallel-push-${i}.txt`;
      const filePath = join(this.baseRepoPath, fileName);
      const content = generateFileContent(1024, `parallel-push-${i}`);
      writeFileSync(filePath, content);

      execFileSync("git", ["add", "-A"], {
        cwd: this.baseRepoPath,
        stdio: "pipe",
      });

      execFileSync("git", ["commit", "-m", `Parallel push benchmark commit ${i}`], {
        cwd: this.baseRepoPath,
        stdio: "pipe",
      });

      // Show progress
      if ((i + 1) % Math.max(1, Math.floor(totalBranches / 10)) === 0) {
        process.stdout.write(`\r  Created ${i + 1}/${totalBranches} branches`);
      }
    }

    console.log(`\r  ✓ Created ${totalBranches} branches with commits`);

    // Return to main branch
    try {
      execFileSync("git", ["checkout", "main"], {
        cwd: this.baseRepoPath,
        stdio: "pipe",
      });
    } catch (error) {
      // Might be master
      execFileSync("git", ["checkout", "master"], {
        cwd: this.baseRepoPath,
        stdio: "pipe",
      });
    }

    // Step 2: Benchmark the parallel pushes (TIMED)
    console.log("  Running parallel push benchmark...");

    const { timings, errors, wallClockMs } = await runConcurrentBenchmark(
      this.name,
      iterations,
      concurrency,
      async (index) => {
        const branchName = branchNames[index];

        // Push the branch
        return new Promise<string>((resolve, reject) => {
          try {
            execFileSync("git", ["push", "origin", branchName], {
              cwd: this.baseRepoPath,
              stdio: "pipe",
            });
            resolve(branchName);
          } catch (error) {
            reject(error);
          }
        });
      },
      (current, total) => {
        if (current % Math.max(1, Math.floor(total / 10)) === 0) {
          process.stdout.write(`\r  Progress: ${current}/${total}`);
        }
      }
    );

    console.log(`\r  ✓ Completed ${timings.length} pushes`);
    if (errors > 0) {
      console.log(`  ⚠ ${errors} errors occurred`);
    }

    // Cleanup: Delete local branches
    console.log("  Cleaning up local branches...");
    for (const branchName of branchNames) {
      try {
        execFileSync("git", ["branch", "-D", branchName], {
          cwd: this.baseRepoPath,
          stdio: "pipe",
        });
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    return this.createResult(timings, errors, {
      totalBranches,
      concurrency,
      iterations,
      wallClockMs: Math.round(wallClockMs),
    });
  }
}
