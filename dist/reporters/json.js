import { writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';
export class JsonReporter {
    startTime;
    constructor() {
        this.startTime = Date.now();
    }
    exportToFile(metrics, outputPath) {
        const endTime = Date.now();
        const duration = (endTime - this.startTime) / 1000;
        const report = {
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
//# sourceMappingURL=json.js.map