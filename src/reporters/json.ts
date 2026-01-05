import type { BenchmarkMetrics } from '../benchmarks/base.js';
import { writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

export interface JsonReport {
  timestamp: string;
  benchmarks: BenchmarkMetrics[];
  summary: {
    totalIterations: number;
    totalErrors: number;
    duration: number; // seconds
  };
}

export class JsonReporter {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  exportToFile(metrics: BenchmarkMetrics[], outputPath: string): void {
    const endTime = Date.now();
    const duration = (endTime - this.startTime) / 1000;

    const report: JsonReport = {
      timestamp: new Date().toISOString(),
      benchmarks: metrics,
      summary: {
        totalIterations: metrics.reduce((sum, m) => sum + m.iterations, 0),
        totalErrors: metrics.reduce((sum, m) => sum + m.errorCount, 0),
        duration,
      },
    };

    // Ensure directory exists
    const dir = dirname(outputPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Write to file
    writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n📝 Report exported to: ${outputPath}`);
  }
}

