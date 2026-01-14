export class BaseBenchmark {
    config;
    name;
    constructor(name, config) {
        this.name = name;
        this.config = config;
    }
    async measureAsync(operation) {
        const start = process.hrtime.bigint();
        const result = await operation();
        const end = process.hrtime.bigint();
        return { result, duration: end - start };
    }
    measure(operation) {
        const start = process.hrtime.bigint();
        const result = operation();
        const end = process.hrtime.bigint();
        return { result, duration: end - start };
    }
    async warmup(operation, runs = 3) {
        console.log(`  Warming up (${runs} runs)...`);
        for (let i = 0; i < runs; i++) {
            try {
                await operation();
            }
            catch (error) {
                // Ignore warmup errors
            }
        }
    }
    createResult(timings, errors, metadata) {
        return {
            name: this.name,
            iterations: timings.length + errors,
            timings,
            errors,
            metadata,
        };
    }
    getName() {
        return this.name;
    }
}
export async function runBenchmarkWithProgress(name, iterations, operation, onProgress) {
    const results = [];
    const timings = [];
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
        }
        catch (error) {
            errors++;
            console.error(`  Error in iteration ${i + 1}:`, error instanceof Error ? error.message : error);
        }
    }
    return { results, timings, errors };
}
export async function runConcurrentBenchmark(name, totalIterations, concurrency, operation, onProgress) {
    const results = [];
    const timings = [];
    let errors = 0;
    let completed = 0;
    const promises = [];
    for (let i = 0; i < totalIterations; i++) {
        const index = i;
        const promise = (async () => {
            try {
                const start = process.hrtime.bigint();
                const result = await operation(index);
                const end = process.hrtime.bigint();
                results.push(result);
                timings.push(end - start);
            }
            catch (error) {
                errors++;
                console.error(`  Error in concurrent iteration ${index + 1}:`, error instanceof Error ? error.message : error);
            }
            finally {
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
//# sourceMappingURL=base.js.map