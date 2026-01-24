import type { BenchmarkMetrics } from "../benchmarks/base.js";
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

function colorize(text: string, color: keyof typeof COLORS): string {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

export class ConsoleReporter {
  printHeader(): void {
    console.log("\n" + "=".repeat(80));
    console.log(colorize("  GIT STORAGE BENCHMARK SUITE", "bright"));
    console.log("=".repeat(80));
  }

  printSummary(allMetrics: BenchmarkMetrics[]): void {
    console.log("\n" + "=".repeat(80));
    console.log(colorize("  BENCHMARK SUMMARY", "bright"));
    console.log("=".repeat(80));

    // Calculate column width based on benchmark names
    const colWidth = Math.max(14, ...allMetrics.map((m) => m.name.length + 2));
    const labelWidth = 12;

    // Header row with benchmark names
    console.log("");
    const header = [
      "".padEnd(labelWidth),
      ...allMetrics.map((m) => m.name.padStart(colWidth)),
    ].join(" │ ");
    console.log(colorize(header, "bright"));
    console.log("─".repeat(header.length));

    // Stats rows
    const stats: { label: string; getter: (m: BenchmarkMetrics) => string }[] = [
      { label: "P50", getter: (m) => formatLatency(m.latency.median) },
      { label: "P95", getter: (m) => formatLatency(m.latency.p95) },
      { label: "P99", getter: (m) => formatLatency(m.latency.p99) },
    ];

    for (const stat of stats) {
      const row = [
        colorize(stat.label.padEnd(labelWidth), "cyan"),
        ...allMetrics.map((m) => stat.getter(m).padStart(colWidth)),
      ].join(" │ ");
      console.log(row);
    }

    console.log("");
  }

  printDetails(metrics: BenchmarkMetrics): void {
    console.log("\n" + colorize(`📊 ${metrics.name}`, "bright"));
    console.log("─".repeat(60));

    console.log(colorize("  Execution:", "bright"));
    console.log(`    Total iterations: ${metrics.iterations}`);
    console.log(
      `    Successful:       ${colorize(String(metrics.successCount), "green")}`
    );
    if (metrics.errorCount > 0) {
      console.log(
        `    Errors:           ${colorize(
          String(metrics.errorCount),
          "yellow"
        )}`
      );
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

  printFooter(): void {
    console.log("\n" + "=".repeat(80));
    console.log(colorize("  Benchmark completed!", "green"));
    console.log("=".repeat(80) + "\n");
  }
}
