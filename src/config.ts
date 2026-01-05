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

  // Get organization name from environment
  const orgName = process.env.ORG_NAME;
  if (!orgName) {
    throw new Error("ORG_NAME must be set in environment");
  }

  // Load private key from file
  const privateKeyPath = process.env.PRIVATE_KEY_PATH || "private-key.pem";
  const privateKeyFullPath = resolve(process.cwd(), privateKeyPath);

  let privateKey: string;
  try {
    privateKey = readFileSync(privateKeyFullPath, "utf-8").trim();
  } catch (error) {
    throw new Error(
      `Failed to load private key from ${privateKeyFullPath}: ${
        error instanceof Error ? error.message : error
      }`
    );
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
  if (!config.organization.name) {
    throw new Error("Organization name is required");
  }

  if (!config.organization.privateKey) {
    throw new Error("Organization private key is required");
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
