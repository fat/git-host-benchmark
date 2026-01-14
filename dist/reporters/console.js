import { formatLatency, formatThroughput } from "../utils/metrics.js";
const COLORS = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m",
};
function colorize(text, color) {
    return `${COLORS[color]}${text}${COLORS.reset}`;
}
export class ConsoleReporter {
    printHeader() {
        console.log("\n" + "=".repeat(80));
        console.log(colorize("  GIT STORAGE BENCHMARK SUITE", "bright"));
        console.log("=".repeat(80));
    }
    printSummary(allMetrics) {
        console.log("\n" + "=".repeat(80));
        console.log(colorize("  BENCHMARK SUMMARY", "bright"));
        console.log("=".repeat(80));
        const targetSplit = allMetrics.some((m) => m.name.includes(" / "));
        if (targetSplit) {
            const grouped = new Map();
            const targets = [];
            for (const metrics of allMetrics) {
                const [target, baseName] = metrics.name.split(" / ");
                if (!targets.includes(target)) {
                    targets.push(target);
                }
                if (!grouped.has(baseName)) {
                    grouped.set(baseName, new Map());
                }
                grouped.get(baseName)?.set(target, metrics);
            }
            const nameWidth = Math.max(20, ...Array.from(grouped.keys()).map((name) => name.length));
            const numWidth = 12;
            console.log("");
            const header = [
                "Benchmark".padEnd(nameWidth),
                ...targets.map((t) => t.padStart(numWidth)),
            ].join(" │ ");
            console.log(colorize(header, "bright"));
            console.log("─".repeat(header.length));
            for (const [baseName, byTarget] of grouped.entries()) {
                let winnerTarget = null;
                let winnerMean = Number.POSITIVE_INFINITY;
                for (const target of targets) {
                    const metrics = byTarget.get(target);
                    if (metrics && metrics.latency.mean < winnerMean) {
                        winnerMean = metrics.latency.mean;
                        winnerTarget = target;
                    }
                }
                const row = [
                    colorize(baseName.padEnd(nameWidth), "cyan"),
                    ...targets.map((target) => {
                        const metrics = byTarget.get(target);
                        const value = metrics
                            ? formatLatency(metrics.latency.mean)
                            : "-";
                        const padded = value.padStart(numWidth);
                        return target === winnerTarget
                            ? colorize(padded, "bright")
                            : padded;
                    }),
                ].join(" │ ");
                console.log(row);
            }
            console.log("");
            return;
        }
        // Calculate column widths
        const nameWidth = Math.max(20, ...allMetrics.map((m) => m.name.length));
        const numWidth = 12;
        const errorWidth = 10;
        // Print header
        console.log("");
        const header = [
            "Benchmark".padEnd(nameWidth),
            "Iterations".padStart(numWidth),
            "Error Rate".padStart(errorWidth),
            "Mean".padStart(numWidth),
            "P95".padStart(numWidth),
            "P99".padStart(numWidth),
            "P99.9".padStart(numWidth),
            "Throughput".padStart(numWidth),
        ].join(" │ ");
        console.log(colorize(header, "bright"));
        console.log("─".repeat(header.length));
        // Print each benchmark
        for (const metrics of allMetrics) {
            const errorRate = metrics.iterations > 0
                ? (metrics.errorCount / metrics.iterations) * 100
                : 0;
            const errorRateStr = `${errorRate.toFixed(2)}%`;
            const errorRatePadded = errorRateStr.padStart(errorWidth);
            const errorRateColored = errorRate > 0
                ? colorize(errorRatePadded, "yellow")
                : colorize(errorRatePadded, "green");
            const row = [
                colorize(metrics.name.padEnd(nameWidth), "cyan"),
                String(metrics.iterations).padStart(numWidth),
                errorRateColored,
                formatLatency(metrics.latency.mean).padStart(numWidth),
                formatLatency(metrics.latency.p95).padStart(numWidth),
                formatLatency(metrics.latency.p99).padStart(numWidth),
                formatLatency(metrics.latency.p999).padStart(numWidth),
                formatThroughput(metrics.throughput.opsPerSecond).padStart(numWidth),
            ].join(" │ ");
            console.log(row);
        }
        console.log("");
    }
    printDetails(metrics) {
        console.log("\n" + colorize(`📊 ${metrics.name}`, "bright"));
        console.log("─".repeat(60));
        console.log(colorize("  Execution:", "bright"));
        console.log(`    Total iterations: ${metrics.iterations}`);
        console.log(`    Successful:       ${colorize(String(metrics.successCount), "green")}`);
        if (metrics.errorCount > 0) {
            console.log(`    Errors:           ${colorize(String(metrics.errorCount), "yellow")}`);
        }
        console.log(colorize("\n  Latency:", "bright"));
        console.log(`    Min:      ${formatLatency(metrics.latency.min)}`);
        console.log(`    Max:      ${formatLatency(metrics.latency.max)}`);
        console.log(`    Mean:     ${formatLatency(metrics.latency.mean)}`);
        console.log(`    Median:   ${formatLatency(metrics.latency.median)}`);
        console.log(`    P95:      ${formatLatency(metrics.latency.p95)}`);
        console.log(`    P99:      ${formatLatency(metrics.latency.p99)}`);
        console.log(`    P99.9:    ${formatLatency(metrics.latency.p999)}`);
        console.log(`    StdDev:   ${formatLatency(metrics.latency.stdDev)}`);
        console.log(colorize("\n  Throughput:", "bright"));
        console.log(`    ${formatThroughput(metrics.throughput.opsPerSecond)}`);
        if (metrics.metadata) {
            console.log(colorize("\n  Metadata:", "bright"));
            for (const [key, value] of Object.entries(metrics.metadata)) {
                console.log(`    ${key}: ${JSON.stringify(value)}`);
            }
        }
    }
    printFooter() {
        console.log("\n" + "=".repeat(80));
        console.log(colorize("  Benchmark completed!", "green"));
        console.log("=".repeat(80) + "\n");
    }
}
//# sourceMappingURL=console.js.map