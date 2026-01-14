import { BaseBenchmark, runBenchmarkWithProgress, runConcurrentBenchmark, } from "../base.js";
import { generateFileContent, generateFileName } from "../../utils/testData.js";
export class DeletePathBenchmark extends BaseBenchmark {
    repo;
    provider;
    constructor(config, provider, repo, namePrefix) {
        super(namePrefix ? `${namePrefix} / SDK: deletePath` : "SDK: deletePath", config);
        this.provider = provider;
        this.repo = repo;
    }
    async run() {
        console.log(`\n🗑️  Running ${this.name} benchmark...`);
        const { iterations, concurrency } = this.config.benchmarks.sdkDeletePath;
        const concurrencyLevels = Array.isArray(concurrency)
            ? concurrency
            : [concurrency];
        // First, create files to delete (total needed across all concurrency levels)
        const totalFilesNeeded = iterations * concurrencyLevels.length;
        console.log(`  Creating ${totalFilesNeeded} test files...`);
        for (let i = 0; i < totalFilesNeeded; i++) {
            const fileName = generateFileName("to-delete", i);
            await this.provider.createCommit(this.repo, {
                message: `Create file for deletion test ${i}`,
                files: [
                    {
                        path: fileName,
                        content: generateFileContent(100, `delete-test-${i}`),
                    },
                ],
            });
        }
        console.log("  Files created, starting deletion benchmark...");
        // Warmup
        let warmupComplete = false;
        await this.warmup(async () => {
            await this.provider.createCommit(this.repo, {
                message: "Warmup deletion (setup)",
                files: [
                    {
                        path: "warmup.txt",
                        content: generateFileContent(50, "warmup-delete"),
                    },
                ],
            });
            const result = await this.provider.deletePath(this.repo, {
                message: "Warmup deletion",
                path: "warmup.txt",
            });
            if (!warmupComplete) {
                console.log("  Warmup result:");
                console.log(result);
                warmupComplete = true;
            }
        }, 1);
        const allTimings = [];
        let totalErrors = 0;
        let fileOffset = 0;
        const results = [];
        for (const concurrencyLevel of concurrencyLevels) {
            console.log(`\n  Testing with concurrency: ${concurrencyLevel}`);
            console.log(`  Iterations: ${iterations}`);
            console.log("  Running benchmark...");
            const { timings, errors } = concurrencyLevel === 1
                ? await runBenchmarkWithProgress(this.name, iterations, async (index) => {
                    const fileName = generateFileName("to-delete", fileOffset + index);
                    const result = await this.provider.deletePath(this.repo, {
                        message: `Delete ${fileName}`,
                        path: fileName,
                    });
                    return result;
                }, (current, total) => {
                    if (current % Math.max(1, Math.floor(total / 10)) === 0) {
                        process.stdout.write(`\r  Progress: ${current}/${total}`);
                    }
                })
                : await runConcurrentBenchmark(this.name, iterations, concurrencyLevel, async (index) => {
                    const fileName = generateFileName("to-delete", fileOffset + index);
                    const result = await this.provider.deletePath(this.repo, {
                        message: `Delete ${fileName}`,
                        path: fileName,
                    });
                    return result;
                }, (current, total) => {
                    if (current % Math.max(1, Math.floor(total / 10)) === 0) {
                        process.stdout.write(`\r  Progress: ${current}/${total}`);
                    }
                });
            fileOffset += iterations;
            allTimings.push(...timings);
            totalErrors += errors;
            console.log(`\r  ✓ Completed ${timings.length} deletions at concurrency ${concurrencyLevel}`);
            if (errors > 0) {
                console.log(`  ⚠ ${errors} errors occurred`);
            }
            // If printSummaryPerConfig is enabled, store individual results
            if (this.config.printSummaryPerConfig) {
                results.push(this.createResult(timings, errors, {
                    concurrency: concurrencyLevel,
                }));
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
//# sourceMappingURL=deletePath.js.map