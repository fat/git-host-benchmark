import { BaseBenchmark, runConcurrentBenchmark, } from "../base.js";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateFileContent } from "../../utils/testData.js";
import { calculateMetrics } from "../../utils/metrics.js";
export class RampParallelPushBenchmark extends BaseBenchmark {
    remoteUrl;
    baseRepoPath;
    constructor(config, remoteUrl, baseRepoPath, namePrefix) {
        super(namePrefix ? `${namePrefix} / Ramp Parallel Push` : "Ramp Parallel Push", config);
        this.remoteUrl = remoteUrl;
        this.baseRepoPath = baseRepoPath;
    }
    async run() {
        console.log(`\n📈 Running ${this.name} benchmark...`);
        const { minConcurrency, maxConcurrency, step, iterations, stopP95Ms, stopErrorRate, } = this.config.benchmarks.rampParallelPush;
        console.log(`  Concurrency: ${minConcurrency}..${maxConcurrency} (step ${step}), Iterations: ${iterations}`);
        if (stopP95Ms) {
            console.log(`  Stop if P95 >= ${stopP95Ms}ms`);
        }
        if (stopErrorRate) {
            console.log(`  Stop if error rate >= ${(stopErrorRate * 100).toFixed(1)}%`);
        }
        const results = [];
        let branchCounter = 0;
        for (let concurrency = minConcurrency; concurrency <= maxConcurrency; concurrency += step) {
            console.log(`\n  Preparing branches for concurrency ${concurrency}...`);
            const branchNames = [];
            const totalBranches = concurrency * iterations;
            for (let i = 0; i < totalBranches; i++) {
                const branchName = `bench/ramp-parallel-push-${branchCounter++}`;
                branchNames.push(branchName);
                try {
                    execFileSync("git", ["checkout", "-b", branchName], {
                        cwd: this.baseRepoPath,
                        stdio: "pipe",
                    });
                }
                catch (error) {
                    continue;
                }
                const fileName = `ramp-parallel-push-${branchCounter}.txt`;
                const filePath = join(this.baseRepoPath, fileName);
                const content = generateFileContent(1024, `ramp-parallel-push-${branchCounter}`);
                writeFileSync(filePath, content);
                execFileSync("git", ["add", "-A"], {
                    cwd: this.baseRepoPath,
                    stdio: "pipe",
                });
                execFileSync("git", ["commit", "-m", `Ramp parallel push commit ${branchCounter}`], {
                    cwd: this.baseRepoPath,
                    stdio: "pipe",
                });
                if ((i + 1) % Math.max(1, Math.floor(totalBranches / 10)) === 0) {
                    process.stdout.write(`\r  Prepared ${i + 1}/${totalBranches} branches`);
                }
            }
            console.log(`\r  ✓ Prepared ${totalBranches} branches`);
            try {
                execFileSync("git", ["checkout", "main"], {
                    cwd: this.baseRepoPath,
                    stdio: "pipe",
                });
            }
            catch (error) {
                execFileSync("git", ["checkout", "master"], {
                    cwd: this.baseRepoPath,
                    stdio: "pipe",
                });
            }
            console.log("  Running ramp step...");
            const { timings, errors } = await runConcurrentBenchmark(this.name, iterations, concurrency, async (index) => {
                const branchName = branchNames[index];
                return new Promise((resolve, reject) => {
                    try {
                        execFileSync("git", ["push", "origin", branchName], {
                            cwd: this.baseRepoPath,
                            stdio: "pipe",
                        });
                        resolve(branchName);
                    }
                    catch (error) {
                        reject(error);
                    }
                });
            }, (current, total) => {
                if (current % Math.max(1, Math.floor(total / 10)) === 0) {
                    process.stdout.write(`\r  Progress: ${current}/${total}`);
                }
            });
            console.log(`\r  ✓ Completed ${timings.length} pushes`);
            if (errors > 0) {
                console.log(`  ⚠ ${errors} errors occurred`);
            }
            const result = this.createResult(timings, errors, {
                concurrency,
                iterations,
            });
            result.name = `${this.name} (concurrency=${concurrency})`;
            results.push(result);
            const metrics = calculateMetrics(result);
            const errorRate = result.iterations > 0 ? errors / result.iterations : 0;
            console.log(`  Step metrics: mean=${metrics.latency.mean.toFixed(2)}ms p95=${metrics.latency.p95.toFixed(2)}ms errorRate=${(errorRate * 100).toFixed(1)}%`);
            if (stopP95Ms && metrics.latency.p95 >= stopP95Ms) {
                console.log(`  ⛔ Stopping ramp: P95 ${metrics.latency.p95.toFixed(2)}ms`);
                break;
            }
            if (stopErrorRate && errorRate >= stopErrorRate) {
                console.log(`  ⛔ Stopping ramp: error rate ${(errorRate * 100).toFixed(1)}%`);
                break;
            }
            console.log("  Cleaning up local branches...");
            for (const branchName of branchNames) {
                try {
                    execFileSync("git", ["branch", "-D", branchName], {
                        cwd: this.baseRepoPath,
                        stdio: "pipe",
                    });
                }
                catch (error) {
                    // Ignore cleanup errors
                }
            }
        }
        return results;
    }
}
//# sourceMappingURL=rampParallelPush.js.map