import { BaseBenchmark, runBenchmarkWithProgress, runConcurrentBenchmark, } from "../base.js";
export class ListFilesBenchmark extends BaseBenchmark {
    repo;
    provider;
    constructor(config, provider, repo, namePrefix) {
        super(namePrefix ? `${namePrefix} / SDK: listFiles` : "SDK: listFiles", config);
        this.provider = provider;
        this.repo = repo;
    }
    async run() {
        console.log(`\n📁 Running ${this.name} benchmark...`);
        const { iterations, concurrency } = this.config.benchmarks.sdkListFiles;
        const concurrencyLevels = Array.isArray(concurrency)
            ? concurrency
            : [concurrency];
        // Warmup
        let warmupComplete = false;
        await this.warmup(async () => {
            const count = await this.provider.listFiles(this.repo);
            if (!warmupComplete) {
                console.log(`  Warmup result: ${count} files found`);
                warmupComplete = true;
            }
        }, 3);
        const allTimings = [];
        let totalErrors = 0;
        const results = [];
        for (const concurrencyLevel of concurrencyLevels) {
            console.log(`\n  Testing with concurrency: ${concurrencyLevel}`);
            console.log(`  Iterations: ${iterations}`);
            console.log("  Running benchmark...");
            const { timings, errors } = concurrencyLevel === 1
                ? await runBenchmarkWithProgress(this.name, iterations, async () => {
                    const count = await this.provider.listFiles(this.repo);
                    return count;
                }, (current, total) => {
                    if (current % Math.max(1, Math.floor(total / 10)) === 0) {
                        process.stdout.write(`\r  Progress: ${current}/${total}`);
                    }
                })
                : await runConcurrentBenchmark(this.name, iterations, concurrencyLevel, async () => {
                    const count = await this.provider.listFiles(this.repo);
                    return count;
                }, (current, total) => {
                    if (current % Math.max(1, Math.floor(total / 10)) === 0) {
                        process.stdout.write(`\r  Progress: ${current}/${total}`);
                    }
                });
            allTimings.push(...timings);
            totalErrors += errors;
            console.log(`\r  ✓ Completed ${timings.length} listFiles calls at concurrency ${concurrencyLevel}`);
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
//# sourceMappingURL=listFiles.js.map