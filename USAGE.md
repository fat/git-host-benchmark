# Git Storage Benchmark Suite - Usage Guide

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Credentials

Create a `.env` file and save your private key:

```bash
cp .env.example .env

# Save your private key to a file (default location)
echo "your-private-key-content" > private-key.pem
# Or copy from your key management system
# cp /path/to/your/key.pem private-key.pem
```

Edit `.env`:

```env
ORG_NAME=your-org-name
PRIVATE_KEY_PATH=private-key.pem  # optional, defaults to private-key.pem
LOCAL_REPO_PATH=./test-data/sample-repo
GH_TOKEN=ghp_your_token      # optional, for GitHub benchmarks
GITHUB_OWNER=your-org        # required if GitHub ownerType=org
GITHUB_OWNER_TYPE=org        # org or user
```

### 3. Create a Test Repository

You can use the provided script to create a test repository:

```bash
# Create a repo with 100 files of 1KB each
./scripts/create-test-repo.sh ./test-data/sample-repo 100 1024

# Create a larger repo with 1000 files of 10KB each
./scripts/create-test-repo.sh ./test-data/large-repo 1000 10240
```

Or use an existing Git repository by setting `LOCAL_REPO_PATH` to its location.

### 4. Run Benchmarks

```bash
# Run all benchmarks
pnpm bench

# Run specific benchmarks
pnpm bench --benchmarks clone,worktreeCommit

# Save results to JSON
pnpm bench --output results.json

# Use custom config
pnpm bench --config custom-config.json
```

## Configuration

The benchmark suite is configured via `benchmark-config.json`:

```json
{
  "localRepo": "${LOCAL_REPO_PATH}",
  "workingDir": "./.benchmark-temp",
  "targets": {
    "codeStorage": { "enabled": true },
    "github": {
      "enabled": false,
      "owner": "your-org",
      "ownerType": "org",
      "repoPrefix": "git-host-benchmark",
      "visibility": "private"
    }
  },
  "benchmarks": {
    "initialPush": {
      "enabled": true
    },
    "clone": {
      "enabled": true,
      "concurrency": 5,
      "iterations": 10
    },
    "worktreeCommit": {
      "enabled": true,
      "concurrency": 10,
      "iterations": 20
    },
    "parallelPush": {
      "enabled": true,
      "concurrency": 5,
      "iterations": 10
    },
    "rampClone": {
      "enabled": false,
      "minConcurrency": 1,
      "maxConcurrency": 20,
      "step": 2,
      "iterations": 10,
      "stopP95Ms": 2000,
      "stopErrorRate": 0.1
    },
    "rampParallelPush": {
      "enabled": false,
      "minConcurrency": 1,
      "maxConcurrency": 10,
      "step": 1,
      "iterations": 5,
      "stopP95Ms": 3000,
      "stopErrorRate": 0.1
    },
    "sdkListFiles": {
      "enabled": true,
      "iterations": 50,
      "concurrency": 1
    },
    "sdkCreateCommit": {
      "enabled": true,
      "iterations": 20,
      "fileSizes": [1024, 10240, 102400],
      "filesPerCommit": 1,
      "concurrency": 1
    },
    "sdkDeletePath": {
      "enabled": true,
      "iterations": 20,
      "concurrency": 1
    }
  }
}
```

### Configuration Options

- **localRepo**: Path to the local Git repository to use for testing
- **workingDir**: Temporary directory for benchmark operations
- **benchmarks**: Configuration for each benchmark type
- **targets**: Providers to benchmark (code.storage and/or GitHub)

#### Initial Push

Creates a remote repository and pushes the local repository to it. This is required and runs first.

- **enabled**: Enable/disable this benchmark

#### Clone

Tests concurrent clone operations.

- **enabled**: Enable/disable this benchmark
- **concurrency**: Number of parallel clone operations
- **iterations**: Total number of clones to perform

#### Worktree Commit

Tests concurrent commit and push operations using Git worktrees.

- **enabled**: Enable/disable this benchmark
- **concurrency**: Number of parallel worktrees
- **iterations**: Total number of commit+push operations

#### SDK Benchmarks

Test the Git Storage SDK API operations.

**listFiles**:

- **enabled**: Enable/disable this benchmark
- **iterations**: Number of listFiles calls

**createCommit**:

- **enabled**: Enable/disable this benchmark
- **iterations**: Number of commits per file size
- **fileSizes**: Array of file sizes (in bytes) to test

**deletePath**:

- **enabled**: Enable/disable this benchmark
- **iterations**: Number of delete operations

#### Ramp Clone

Progressively increases clone concurrency until it hits a latency or error-rate
threshold. Useful for identifying the knee where storage latency (e.g., EBS)
starts to dominate.

- **enabled**: Enable/disable this benchmark
- **minConcurrency**: Starting concurrency level
- **maxConcurrency**: Maximum concurrency level
- **step**: Concurrency increment per step
- **iterations**: Total clones per step
- **stopP95Ms**: Stop when P95 latency exceeds this threshold
- **stopErrorRate**: Stop when error rate exceeds this threshold

#### Ramp Parallel Push

Progressively increases parallel push concurrency to stress packfile creation
and upload. This is intended to surface storage tail-latency issues (e.g., EBS).

- **enabled**: Enable/disable this benchmark
- **minConcurrency**: Starting concurrency level
- **maxConcurrency**: Maximum concurrency level
- **step**: Concurrency increment per step
- **iterations**: Total pushes per step
- **stopP95Ms**: Stop when P95 latency exceeds this threshold
- **stopErrorRate**: Stop when error rate exceeds this threshold

## GitHub Targets

Enable GitHub by setting `targets.github.enabled` to `true` and providing a
`GITHUB_TOKEN`. If `ownerType` is `org`, `GITHUB_OWNER` (or `targets.github.owner`)
is required. For user-owned repos, set `ownerType` to `user` and omit the owner.

You can also limit targets via CLI:

```bash
pnpm bench --targets codeStorage
pnpm bench --targets github
```

## Benchmark Types

### Native Git Benchmarks

#### 1. Initial Push

- Measures: Time to push a local repository to Git Storage
- Metrics: Latency, upload speed (MB/s), repository size
- Use case: Understanding initial repository upload performance

#### 2. Concurrent Clone

- Measures: Time to clone repository with multiple parallel operations
- Metrics: Latency (min/mean/p95/p99), throughput (clones/sec)
- Use case: Simulating multiple developers cloning a repository

#### 3. Concurrent Worktree Commit & Push

- Measures: Time to create commits locally and push them using Git worktrees
- Metrics: Latency (min/mean/p95/p99), throughput (commits/sec)
- Use case: Simulating multiple developers pushing changes concurrently

### SDK API Benchmarks

#### 4. List Files

- Measures: Time to list all files in a repository via SDK
- Metrics: Latency (min/mean/p95/p99), throughput (ops/sec)
- Use case: File browsing and directory listing operations

#### 5. Create Commit

- Measures: Time to create commits via SDK with different file sizes
- Metrics: Latency per file size, throughput (commits/sec)
- Use case: Programmatic file updates and commits

#### 6. Delete Path

- Measures: Time to delete files via SDK
- Metrics: Latency (min/mean/p95/p99), throughput (ops/sec)
- Use case: File cleanup and deletion operations

## Understanding Results

### Console Output

The benchmark suite provides detailed console output:

1. **Progress**: Real-time progress during each benchmark
2. **Individual Results**: Detailed metrics after each benchmark completes
3. **Summary Table**: Comparative view of all benchmarks

### Metrics Explained

- **Min/Max**: Fastest and slowest operation times
- **Mean**: Average operation time
- **Median**: Middle value when operations are sorted by time
- **P95**: 95% of operations completed faster than this time
- **P99**: 99% of operations completed faster than this time
- **StdDev**: Standard deviation (measure of variance)
- **Throughput**: Operations per second

### JSON Export

Export results to JSON for further analysis:

```bash
pnpm bench --output results/benchmark-$(date +%Y%m%d-%H%M%S).json
```

The JSON report includes:

- Timestamp
- Detailed metrics for each benchmark
- Summary statistics
- Total duration

## Tips for Accurate Benchmarking

1. **Consistent Environment**: Run benchmarks in a consistent network environment
2. **Warmup**: The tool includes automatic warmup runs to avoid cold-start bias
3. **Multiple Runs**: Run benchmarks multiple times and compare results
4. **Repository Size**: Test with repositories of different sizes to understand scaling
5. **Concurrency Levels**: Adjust concurrency to match your use case

## Troubleshooting

### Error: Local repository not found

Make sure the `LOCAL_REPO_PATH` environment variable points to a valid Git repository:

```bash
export LOCAL_REPO_PATH=/path/to/your/repo
```

Or create a test repository:

```bash
./scripts/create-test-repo.sh
```

### Error: ORG_NAME must be set in environment

Ensure your `.env` file has the `ORG_NAME` variable set.

### Error: Failed to load private key

Ensure your private key file exists at the specified path (default: `private-key.pem`). You can specify a custom path with the `PRIVATE_KEY_PATH` environment variable.

### High Error Rate

If you see many errors during benchmarks:

- Check your network connection
- Verify your credentials are valid
- Ensure the Git Storage service is accessible
- Try reducing concurrency levels

### Cleanup Failed

If cleanup fails, you can manually remove the temporary directory:

```bash
rm -rf ./.benchmark-temp
```

## Advanced Usage

### Custom Configuration Files

Create multiple configuration files for different scenarios:

```bash
# Light load
pnpm bench --config configs/light.json

# Heavy load
pnpm bench --config configs/heavy.json

# Production simulation
pnpm bench --config configs/production.json
```

### Selective Benchmark Execution

Run only the benchmarks you need:

```bash
# Only native Git benchmarks
pnpm bench --benchmarks clone,worktreeCommit

# Only SDK benchmarks
pnpm bench --benchmarks sdkListFiles,sdkCreateCommit,sdkDeletePath

# Single benchmark
pnpm bench --benchmarks clone
```

### CI/CD Integration

Use the JSON output for automated performance monitoring:

```bash
#!/bin/bash
pnpm bench --output results.json

# Parse results and fail if performance degrades
# (implement your own threshold checking)
```

## License

Copyright Anysphere Inc.
