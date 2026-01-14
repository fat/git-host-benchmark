import { BaseBenchmark, runBenchmarkWithProgress, runConcurrentBenchmark, } from "../base.js";
import { generateFileContent, generateFileName } from "../../utils/testData.js";
export class CreateCommitBenchmark extends BaseBenchmark {
    repo;
    provider;
    constructor(config, provider, repo, namePrefix) {
        super(namePrefix ? `${namePrefix} / SDK: createCommit` : "SDK: createCommit", config);
        this.provider = provider;
        this.repo = repo;
    }
    async run() {
        console.log(`\n✏️  Running ${this.name} benchmark...`);
        const { iterations, fileSizes, filesPerCommit, concurrency } = this.config.benchmarks.sdkCreateCommit;
        const concurrencyLevels = Array.isArray(concurrency)
            ? concurrency
            : [concurrency];
        const filesPerCommitLevels = Array.isArray(filesPerCommit)
            ? filesPerCommit
            : [filesPerCommit];
        console.log(`  Iterations per configuration: ${iterations}`);
        console.log(`  File sizes: ${fileSizes.map((s) => `${s}B`).join(", ")}`);
        console.log(`  Files per commit: ${filesPerCommitLevels.join(", ")}`);
        console.log(`  Concurrency levels: ${concurrencyLevels.join(", ")}`);
        const allTimings = [];
        let totalErrors = 0;
        let globalCommitCounter = 0; // Global counter to ensure unique file names
        const results = [];
        for (const fileSize of fileSizes) {
            for (const fileCount of filesPerCommitLevels) {
                console.log(`\n  Testing with file size: ${fileSize} bytes, ${fileCount} file(s) per commit`);
                // Warmup
                let warmupComplete = false;
                await this.warmup(async () => {
                    const files = [];
                    for (let i = 0; i < fileCount; i++) {
                        const content = generateFileContent(fileSize, `warmup-${fileSize}-${fileCount}-${i}`);
                        files.push({
                            path: `warmup-${fileSize}-${fileCount}-${i}.txt`,
                            content,
                        });
                    }
                    const result = await this.provider.createCommit(this.repo, {
                        message: `Warmup commit with ${fileCount} file(s)`,
                        files,
                    });
                    if (!warmupComplete) {
                        console.log("  Warmup result:");
                        console.log(result);
                        warmupComplete = true;
                    }
                }, 1);
                for (const concurrencyLevel of concurrencyLevels) {
                    console.log(`\n    Testing with concurrency: ${concurrencyLevel}`);
                    console.log("    Running benchmark...");
                    const { timings, errors } = concurrencyLevel === 1
                        ? await runBenchmarkWithProgress(this.name, iterations, async (index) => {
                            const commitId = globalCommitCounter++;
                            const files = [];
                            for (let i = 0; i < fileCount; i++) {
                                const fileName = generateFileName(`benchmark-${commitId}`, i);
                                const content = generateFileContent(fileSize, `commit-${commitId}-file-${i}`);
                                files.push({ path: fileName, content });
                            }
                            const result = await this.provider.createCommit(this.repo, {
                                message: `Benchmark commit ${commitId} (${fileCount} file(s), ${fileSize}B each)`,
                                files,
                            });
                            return result;
                        }, (current, total) => {
                            if (current % Math.max(1, Math.floor(total / 10)) === 0) {
                                process.stdout.write(`\r    Progress: ${current}/${total}`);
                            }
                        })
                        : await runConcurrentBenchmark(this.name, iterations, concurrencyLevel, async (index) => {
                            const commitId = globalCommitCounter++;
                            const files = [];
                            for (let i = 0; i < fileCount; i++) {
                                const fileName = generateFileName(`benchmark-${commitId}`, i);
                                const content = generateFileContent(fileSize, `commit-${commitId}-file-${i}`);
                                files.push({ path: fileName, content });
                            }
                            const result = await this.provider.createCommit(this.repo, {
                                message: `Benchmark commit ${commitId} (${fileCount} file(s), ${fileSize}B each)`,
                                files,
                            });
                            return result;
                        }, (current, total) => {
                            if (current % Math.max(1, Math.floor(total / 10)) === 0) {
                                process.stdout.write(`\r    Progress: ${current}/${total}`);
                            }
                        });
                    allTimings.push(...timings);
                    totalErrors += errors;
                    console.log(`\r    ✓ Completed ${timings.length} commits (${fileCount} file(s) of ${fileSize}B each) at concurrency ${concurrencyLevel}`);
                    if (errors > 0) {
                        console.log(`    ⚠ ${errors} errors occurred`);
                    }
                    // If printSummaryPerConfig is enabled, store individual results
                    if (this.config.printSummaryPerConfig) {
                        results.push(this.createResult(timings, errors, {
                            fileSize,
                            filesPerCommit: fileCount,
                            concurrency: concurrencyLevel,
                        }));
                        // Update the name to include the configuration
                        results[results.length - 1].name = `${this.name} (size=${fileSize}B, files=${fileCount}, concurrency=${concurrencyLevel})`;
                    }
                }
            }
        }
        // Return individual results or combined result
        if (this.config.printSummaryPerConfig && results.length > 0) {
            return results;
        }
        return this.createResult(allTimings, totalErrors, {
            fileSizes,
            filesPerCommitLevels,
            concurrencyLevels,
            iterationsPerConfiguration: iterations,
        });
    }
}
//# sourceMappingURL=createCommit.js.map