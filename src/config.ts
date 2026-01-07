import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

dotenv.config();

export interface BenchmarkConfig {
  localRepo: string;
  workingDir: string;
  printSummaryPerConfig?: boolean;
  organization: {
    name: string;
    privateKey: string;
  };
  targets: {
    codeStorage: {
      enabled: boolean;
    };
    github: {
      enabled: boolean;
      token?: string;
      owner?: string;
      ownerType: "org" | "user";
      repoPrefix: string;
      visibility: "private" | "public";
      apiBase: string;
    };
  };
  benchmarks: {
    initialPush: {
      enabled: boolean;
    };
    clone: {
      enabled: boolean;
      concurrency: number;
      iterations: number;
    };
    worktreeCommit: {
      enabled: boolean;
      concurrency: number;
      iterations: number;
    };
    parallelPush: {
      enabled: boolean;
      concurrency: number;
      iterations: number;
    };
    rampClone: {
      enabled: boolean;
      minConcurrency: number;
      maxConcurrency: number;
      step: number;
      iterations: number;
      stopP95Ms?: number;
      stopErrorRate?: number;
    };
    rampParallelPush: {
      enabled: boolean;
      minConcurrency: number;
      maxConcurrency: number;
      step: number;
      iterations: number;
      stopP95Ms?: number;
      stopErrorRate?: number;
    };
    sdkListFiles: {
      enabled: boolean;
      iterations: number;
      concurrency: number | number[];
    };
    sdkCreateCommit: {
      enabled: boolean;
      iterations: number;
      fileSizes: number[];
      filesPerCommit: number | number[];
      concurrency: number | number[];
    };
    sdkDeletePath: {
      enabled: boolean;
      iterations: number;
      concurrency: number | number[];
    };
  };
}

function expandEnvVars(str: string): string {
  return str.replace(/\$\{([^}]+)\}/g, (_, varName) => {
    return process.env[varName] || "";
  });
}

function loadConfigFile(configPath: string): Partial<BenchmarkConfig> {
  try {
    const content = readFileSync(configPath, "utf-8");
    const config = JSON.parse(content);

    // Expand environment variables in string values
    const expanded = JSON.parse(
      JSON.stringify(config).replace(/"\$\{([^}]+)\}"/g, (match, varName) => {
        const value = process.env[varName];
        return value ? JSON.stringify(value) : match;
      })
    );

    return expanded;
  } catch (error) {
    throw new Error(`Failed to load config file ${configPath}: ${error}`);
  }
}

export function loadConfig(configPath?: string): BenchmarkConfig {
  const defaultConfigPath = resolve(process.cwd(), "benchmark-config.json");
  const fileConfig = loadConfigFile(configPath || defaultConfigPath);

  const codeStorageEnabled =
    fileConfig.targets?.codeStorage?.enabled ?? true;

  // Get organization name from environment (code.storage only)
  const orgName = process.env.ORG_NAME || "";

  // Load private key from file (code.storage only)
  const privateKeyPath = process.env.PRIVATE_KEY_PATH || "private-key.pem";
  const privateKeyFullPath = resolve(process.cwd(), privateKeyPath);

  let privateKey = "";
  if (codeStorageEnabled) {
    try {
      privateKey = readFileSync(privateKeyFullPath, "utf-8").trim();
    } catch (error) {
      throw new Error(
        `Failed to load private key from ${privateKeyFullPath}: ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  }

  // Merge with defaults
  const config: BenchmarkConfig = {
    localRepo:
      fileConfig.localRepo ||
      process.env.LOCAL_REPO_PATH ||
      "./test-data/sample-repo",
    workingDir: fileConfig.workingDir || "./.benchmark-temp",
    printSummaryPerConfig: fileConfig.printSummaryPerConfig ?? false,
    organization: {
      name: orgName,
      privateKey: privateKey,
    },
    targets: {
      codeStorage: {
        enabled: fileConfig.targets?.codeStorage?.enabled ?? true,
      },
      github: {
        enabled: fileConfig.targets?.github?.enabled ?? false,
        token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN,
        owner:
          fileConfig.targets?.github?.owner ||
          process.env.GITHUB_OWNER ||
          undefined,
        ownerType:
          (fileConfig.targets?.github?.ownerType as "org" | "user") ||
          (process.env.GITHUB_OWNER_TYPE as "org" | "user") ||
          "org",
        repoPrefix:
          fileConfig.targets?.github?.repoPrefix ||
          process.env.GITHUB_REPO_PREFIX ||
          "git-host-benchmark",
        visibility:
          (fileConfig.targets?.github?.visibility as "private" | "public") ||
          (process.env.GITHUB_VISIBILITY as "private" | "public") ||
          "private",
        apiBase:
          fileConfig.targets?.github?.apiBase ||
          process.env.GITHUB_API_BASE ||
          "https://api.github.com",
      },
    },
    benchmarks: {
      initialPush: {
        enabled: fileConfig.benchmarks?.initialPush?.enabled ?? true,
      },
      clone: {
        enabled: fileConfig.benchmarks?.clone?.enabled ?? true,
        concurrency: fileConfig.benchmarks?.clone?.concurrency ?? 5,
        iterations: fileConfig.benchmarks?.clone?.iterations ?? 10,
      },
      worktreeCommit: {
        enabled: fileConfig.benchmarks?.worktreeCommit?.enabled ?? true,
        concurrency: fileConfig.benchmarks?.worktreeCommit?.concurrency ?? 10,
        iterations: fileConfig.benchmarks?.worktreeCommit?.iterations ?? 20,
      },
      parallelPush: {
        enabled: fileConfig.benchmarks?.parallelPush?.enabled ?? true,
        concurrency: fileConfig.benchmarks?.parallelPush?.concurrency ?? 5,
        iterations: fileConfig.benchmarks?.parallelPush?.iterations ?? 10,
      },
      rampClone: {
        enabled: fileConfig.benchmarks?.rampClone?.enabled ?? false,
        minConcurrency: fileConfig.benchmarks?.rampClone?.minConcurrency ?? 1,
        maxConcurrency: fileConfig.benchmarks?.rampClone?.maxConcurrency ?? 20,
        step: fileConfig.benchmarks?.rampClone?.step ?? 2,
        iterations: fileConfig.benchmarks?.rampClone?.iterations ?? 10,
        stopP95Ms: fileConfig.benchmarks?.rampClone?.stopP95Ms,
        stopErrorRate: fileConfig.benchmarks?.rampClone?.stopErrorRate,
      },
      rampParallelPush: {
        enabled: fileConfig.benchmarks?.rampParallelPush?.enabled ?? false,
        minConcurrency:
          fileConfig.benchmarks?.rampParallelPush?.minConcurrency ?? 1,
        maxConcurrency:
          fileConfig.benchmarks?.rampParallelPush?.maxConcurrency ?? 10,
        step: fileConfig.benchmarks?.rampParallelPush?.step ?? 1,
        iterations: fileConfig.benchmarks?.rampParallelPush?.iterations ?? 5,
        stopP95Ms: fileConfig.benchmarks?.rampParallelPush?.stopP95Ms,
        stopErrorRate: fileConfig.benchmarks?.rampParallelPush?.stopErrorRate,
      },
      sdkListFiles: {
        enabled: fileConfig.benchmarks?.sdkListFiles?.enabled ?? true,
        iterations: fileConfig.benchmarks?.sdkListFiles?.iterations ?? 50,
        concurrency: fileConfig.benchmarks?.sdkListFiles?.concurrency ?? 1,
      },
      sdkCreateCommit: {
        enabled: fileConfig.benchmarks?.sdkCreateCommit?.enabled ?? true,
        iterations: fileConfig.benchmarks?.sdkCreateCommit?.iterations ?? 20,
        fileSizes: fileConfig.benchmarks?.sdkCreateCommit?.fileSizes ?? [
          1024, 10240, 102400,
        ],
        filesPerCommit:
          fileConfig.benchmarks?.sdkCreateCommit?.filesPerCommit ?? 1,
        concurrency: fileConfig.benchmarks?.sdkCreateCommit?.concurrency ?? 1,
      },
      sdkDeletePath: {
        enabled: fileConfig.benchmarks?.sdkDeletePath?.enabled ?? true,
        iterations: fileConfig.benchmarks?.sdkDeletePath?.iterations ?? 20,
        concurrency: fileConfig.benchmarks?.sdkDeletePath?.concurrency ?? 1,
      },
    },
  };

  validateConfig(config);
  return config;
}

function validateConfig(config: BenchmarkConfig): void {
  if (config.targets.codeStorage.enabled) {
    if (!config.organization.name) {
      throw new Error("Organization name is required");
    }

    if (!config.organization.privateKey) {
      throw new Error("Organization private key is required");
    }
  }

  if (config.targets.github.enabled) {
    if (!config.targets.github.token) {
      throw new Error("GITHUB_TOKEN must be set for GitHub benchmarks");
    }
    if (config.targets.github.ownerType === "org" && !config.targets.github.owner) {
      throw new Error("GITHUB_OWNER must be set for org GitHub benchmarks");
    }
  }

  if (!config.localRepo) {
    throw new Error("Local repository path is required");
  }

  // Validate numeric values
  const validatePositive = (value: number, name: string) => {
    if (value <= 0) {
      throw new Error(`${name} must be a positive number`);
    }
  };

  if (config.benchmarks.clone.enabled) {
    validatePositive(config.benchmarks.clone.concurrency, "Clone concurrency");
    validatePositive(config.benchmarks.clone.iterations, "Clone iterations");
  }

  if (config.benchmarks.worktreeCommit.enabled) {
    validatePositive(
      config.benchmarks.worktreeCommit.concurrency,
      "Worktree concurrency"
    );
    validatePositive(
      config.benchmarks.worktreeCommit.iterations,
      "Worktree iterations"
    );
  }

  if (config.benchmarks.parallelPush.enabled) {
    validatePositive(
      config.benchmarks.parallelPush.concurrency,
      "Parallel push concurrency"
    );
    validatePositive(
      config.benchmarks.parallelPush.iterations,
      "Parallel push iterations"
    );
  }

  if (config.benchmarks.rampClone.enabled) {
    validatePositive(
      config.benchmarks.rampClone.minConcurrency,
      "Ramp clone min concurrency"
    );
    validatePositive(
      config.benchmarks.rampClone.maxConcurrency,
      "Ramp clone max concurrency"
    );
    validatePositive(config.benchmarks.rampClone.step, "Ramp clone step");
    validatePositive(
      config.benchmarks.rampClone.iterations,
      "Ramp clone iterations"
    );
    if (
      config.benchmarks.rampClone.maxConcurrency <
      config.benchmarks.rampClone.minConcurrency
    ) {
      throw new Error("Ramp clone maxConcurrency must be >= minConcurrency");
    }
  }

  if (config.benchmarks.rampParallelPush.enabled) {
    validatePositive(
      config.benchmarks.rampParallelPush.minConcurrency,
      "Ramp parallel push min concurrency"
    );
    validatePositive(
      config.benchmarks.rampParallelPush.maxConcurrency,
      "Ramp parallel push max concurrency"
    );
    validatePositive(
      config.benchmarks.rampParallelPush.step,
      "Ramp parallel push step"
    );
    validatePositive(
      config.benchmarks.rampParallelPush.iterations,
      "Ramp parallel push iterations"
    );
    if (
      config.benchmarks.rampParallelPush.maxConcurrency <
      config.benchmarks.rampParallelPush.minConcurrency
    ) {
      throw new Error(
        "Ramp parallel push maxConcurrency must be >= minConcurrency"
      );
    }
  }

  if (config.benchmarks.sdkCreateCommit.enabled) {
    if (config.benchmarks.sdkCreateCommit.fileSizes.length === 0) {
      throw new Error(
        "At least one file size must be specified for SDK createCommit benchmark"
      );
    }
    config.benchmarks.sdkCreateCommit.fileSizes.forEach((size, idx) => {
      validatePositive(size, `File size at index ${idx}`);
    });

    // Validate filesPerCommit
    const filesPerCommit = config.benchmarks.sdkCreateCommit.filesPerCommit;
    if (Array.isArray(filesPerCommit)) {
      filesPerCommit.forEach((count, idx) => {
        validatePositive(count, `Files per commit at index ${idx}`);
      });
    } else {
      validatePositive(filesPerCommit, "Files per commit");
    }
  }
}
