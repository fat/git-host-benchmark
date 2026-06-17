#!/usr/bin/env node

import { loadConfig } from "./config.js";
import { calculateMetrics } from "./utils/metrics.js";
import { ensureDir, removeDir } from "./utils/git.js";
import { ConsoleReporter } from "./reporters/console.js";
import { JsonReporter } from "./reporters/json.js";
import type { BenchmarkMetrics, BenchmarkResult } from "./benchmarks/base.js";

// Native Git benchmarks
import { InitialPushBenchmark } from "./benchmarks/git-native/initialPush.js";
import { CloneBenchmark } from "./benchmarks/git-native/clone.js";
import { ShallowCloneBenchmark } from "./benchmarks/git-native/shallowClone.js";
import { WorktreeCommitBenchmark } from "./benchmarks/git-native/worktreeCommit.js";
import { ParallelPushBenchmark } from "./benchmarks/git-native/parallelPush.js";

// SDK benchmarks
import { ListFilesBenchmark } from "./benchmarks/sdk/listFiles.js";
import { CreateCommitBenchmark } from "./benchmarks/sdk/createCommit.js";
import { DeletePathBenchmark } from "./benchmarks/sdk/deletePath.js";
import { ContentionWriteBenchmark } from "./benchmarks/sdk/contentionWrite.js";
import { join } from "node:path";

interface CliArgs {
  config?: string;
  output?: string;
  benchmarks?: string[];
  help?: boolean;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--config" || arg === "-c") {
      args.config = argv[++i];
    } else if (arg === "--output" || arg === "-o") {
      args.output = argv[++i];
    } else if (arg === "--benchmarks" || arg === "-b") {
      args.benchmarks = argv[++i]?.split(",").map((s) => s.trim());
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
Git Storage Benchmark Suite

Usage: pnpm bench [options]

Options:
  -c, --config <path>        Path to config file (default: benchmark-config.json)
  -o, --output <path>        Export results to JSON file
  -b, --benchmarks <list>    Comma-separated list of benchmarks to run
                             (initialPush,clone,shallowClone,worktreeCommit,parallelPush,sdkListFiles,sdkCreateCommit,sdkDeletePath,contentionWrite)
  -h, --help                 Show this help message

Examples:
  pnpm bench
  pnpm bench --config custom-config.json
  pnpm bench --output results.json
  pnpm bench --benchmarks clone,worktreeCommit
`);
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  try {
    // Load configuration
    const config = loadConfig(args.config);

    // Initialize reporters
    const consoleReporter = new ConsoleReporter();
    const jsonReporter = new JsonReporter();

    consoleReporter.printHeader();

    // Ensure working directory exists
    ensureDir(config.workingDir);

    const allMetrics: BenchmarkMetrics[] = [];
    let repoId: string | null = null;
    let remoteUrl: string | null = null;
    let baseClonePath: string | null = null;

    // Determine which benchmarks to run
    const shouldRun = (name: string) => {
      if (args.benchmarks) {
        return args.benchmarks.includes(name);
      }
      return true; // Run all enabled by default
    };

    try {
      // Helper function to process benchmark results
      const processResults = (result: BenchmarkResult | BenchmarkResult[]) => {
        const results = Array.isArray(result) ? result : [result];
        for (const res of results) {
          const metrics = calculateMetrics(res);
          allMetrics.push(metrics);
          consoleReporter.printDetails(metrics);
        }
      };

      // 1. Initial Push (required for all other benchmarks)
      if (config.benchmarks.initialPush.enabled && shouldRun("initialPush")) {
        const benchmark = new InitialPushBenchmark(config);
        const result = await benchmark.run();
        processResults(result);

        repoId = benchmark.getRepoId();
        remoteUrl = benchmark.getRemoteUrl();

        if (!repoId || !remoteUrl) {
          throw new Error("Failed to create repository");
        }
      } else {
        console.log(
          "\n⚠️  Initial Push benchmark is required but disabled or not selected."
        );
        console.log("Please enable it or add it to the benchmarks list.");
        process.exit(1);
      }

      // 2. Clone
      if (config.benchmarks.clone.enabled && shouldRun("clone") && remoteUrl) {
        const benchmark = new CloneBenchmark(config, remoteUrl);
        const result = await benchmark.run();
        processResults(result);
      }

      // 2.5. Shallow Clone
      if (
        config.benchmarks.shallowClone.enabled &&
        shouldRun("shallowClone") &&
        remoteUrl
      ) {
        const benchmark = new ShallowCloneBenchmark(config, remoteUrl);
        const result = await benchmark.run();
        processResults(result);
      }

      // 3. Worktree Commit
      if (
        config.benchmarks.worktreeCommit.enabled &&
        shouldRun("worktreeCommit")
      ) {
        if (!baseClonePath) {
          console.log("\n⚠️  Worktree benchmark requires a cloned repository.");
          console.log("Creating a clone first...");

          if (!remoteUrl) {
            throw new Error("No remote URL available for cloning");
          }

          const { gitClone } = await import("./utils/git.js");
          baseClonePath = join(config.workingDir, "worktree-base");
          await gitClone(remoteUrl, baseClonePath);
        }

        const benchmark = new WorktreeCommitBenchmark(config, baseClonePath);
        const result = await benchmark.run();
        processResults(result);
      }

      // 4. Parallel Push
      if (config.benchmarks.parallelPush.enabled && shouldRun("parallelPush")) {
        if (!baseClonePath) {
          console.log(
            "\n⚠️  Parallel Push benchmark requires a cloned repository."
          );
          console.log("Creating a clone first...");

          if (!remoteUrl) {
            throw new Error("No remote URL available for cloning");
          }

          const { gitClone } = await import("./utils/git.js");
          baseClonePath = join(config.workingDir, "parallel-push-base");
          await gitClone(remoteUrl, baseClonePath);
        }

        const benchmark = new ParallelPushBenchmark(
          config,
          remoteUrl,
          baseClonePath
        );
        const result = await benchmark.run();
        processResults(result);
      }

      // 5. SDK Benchmarks
      if (repoId) {
        // SDK: listFiles
        if (
          config.benchmarks.sdkListFiles.enabled &&
          shouldRun("sdkListFiles")
        ) {
          const benchmark = new ListFilesBenchmark(config, repoId);
          const result = await benchmark.run();
          processResults(result);
        }

        // SDK: createCommit
        if (
          config.benchmarks.sdkCreateCommit.enabled &&
          shouldRun("sdkCreateCommit")
        ) {
          const benchmark = new CreateCommitBenchmark(config, repoId);
          const result = await benchmark.run();
          processResults(result);
        }

        // SDK: deletePath
        if (
          config.benchmarks.sdkDeletePath.enabled &&
          shouldRun("sdkDeletePath")
        ) {
          const benchmark = new DeletePathBenchmark(config, repoId);
          const result = await benchmark.run();
          processResults(result);
        }

        // SDK: contention write
        if (
          config.benchmarks.contentionWrite.enabled &&
          shouldRun("contentionWrite")
        ) {
          const benchmark = new ContentionWriteBenchmark(config, repoId);
          const result = await benchmark.run();
          processResults(result);
        }
      }

      // Print summary
      consoleReporter.printSummary(allMetrics);

      // Export to JSON if requested
      if (args.output) {
        jsonReporter.exportToFile(allMetrics, args.output);
      }

      consoleReporter.printFooter();

      // Cleanup
      console.log("🧹 Cleaning up temporary files...");
      removeDir(config.workingDir);
    } catch (error) {
      console.error(
        "\n❌ Benchmark failed:",
        error instanceof Error ? error.message : error
      );

      // Cleanup on error
      try {
        removeDir(config.workingDir);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      process.exit(1);
    }
  } catch (error) {
    console.error(
      "\n❌ Error:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
