import type { BenchmarkResult, BenchmarkMetrics } from "../benchmarks/base.js";

function nanosecondsToMilliseconds(ns: bigint): number {
  return Number(ns) / 1_000_000;
}

function calculatePercentile(
  sortedValues: number[],
  percentile: number
): number {
  if (sortedValues.length === 0) return 0;

  const index = (percentile / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) {
    return sortedValues[lower];
  }

  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculateStdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;

  const variance =
    values.reduce((sum, val) => {
      const diff = val - mean;
      return sum + diff * diff;
    }, 0) / values.length;

  return Math.sqrt(variance);
}

export function calculateMetrics(result: BenchmarkResult): BenchmarkMetrics {
  // Convert nanoseconds to milliseconds
  const timingsMs = result.timings.map(nanosecondsToMilliseconds);

  // Sort for percentile calculations
  const sorted = [...timingsMs].sort((a, b) => a - b);

  const successCount = result.timings.length;
  const errorCount = result.errors;

  // Calculate statistics
  const mean = calculateMean(timingsMs);
  const stdDev = calculateStdDev(timingsMs, mean);

  // Calculate total time in seconds for throughput
  const totalTimeSeconds = timingsMs.reduce((sum, val) => sum + val, 0) / 1000;
  const throughput = successCount / totalTimeSeconds;

  return {
    name: result.name,
    iterations: result.iterations,
    successCount,
    errorCount,
    latency: {
      min: sorted.length > 0 ? sorted[0] : 0,
      max: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
      mean,
      median: calculatePercentile(sorted, 50),
      p95: calculatePercentile(sorted, 95),
      p99: calculatePercentile(sorted, 99),
      stdDev,
    },
    throughput: {
      opsPerSecond: throughput,
    },
    metadata: result.metadata,
  };
}

export function formatLatency(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}μs`;
  } else if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  } else {
    return `${(ms / 1000).toFixed(2)}s`;
  }
}

export function formatThroughput(opsPerSecond: number): string {
  if (opsPerSecond < 1) {
    return `${(opsPerSecond * 60).toFixed(2)} ops/min`;
  } else {
    return `${opsPerSecond.toFixed(2)} ops/sec`;
  }
}

export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export function formatBandwidth(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}
