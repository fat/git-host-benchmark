#!/bin/bash

# Script to create a test repository with large git history for benchmarking
# Copyright Anysphere Inc.

set -e

REPO_DIR="${1:-./test-data/large-history-repo}"
NUM_COMMITS="${2:-10000}"
NUM_FILES="${3:-10}"
FILE_SIZE="${4:-512}"

echo "Creating test repository with large history at: $REPO_DIR"
echo "Number of commits: $NUM_COMMITS"
echo "Number of files: $NUM_FILES"
echo "File size: $FILE_SIZE bytes"

# Create directory
mkdir -p "$REPO_DIR"
cd "$REPO_DIR"

# Initialize git repo
git init
git config user.name "Benchmark User"
git config user.email "benchmark@example.com"

# Create initial set of files
echo "Creating initial files..."
for i in $(seq 1 $NUM_FILES); do
  filename=$(printf "file-%05d.txt" $i)
  head -c $FILE_SIZE /dev/urandom | base64 > "$filename"
done

# Create README
cat > README.md << EOF
# Test Repository (Large History)

This is a test repository with large git history for benchmarking Git Storage.

Generated with:
- Commits: $NUM_COMMITS
- Files: $NUM_FILES
- File size: $FILE_SIZE bytes

Created on: $(date)
EOF

git add .
git commit -m "Initial commit with $NUM_FILES files"

# Generate commits by modifying files
echo "Generating $NUM_COMMITS commits..."
for i in $(seq 2 $NUM_COMMITS); do
  # Pick a file to modify (cycle through files)
  file_index=$(( ((i - 1) % NUM_FILES) + 1 ))
  filename=$(printf "file-%05d.txt" $file_index)

  # Modify the file with new random content
  head -c $FILE_SIZE /dev/urandom | base64 > "$filename"
  git add "$filename"
  GIT_COMMITTER_DATE="2024-01-01T00:00:$(printf '%02d' $((i % 60)))Z" \
    git commit --date="2024-01-01T00:00:$(printf '%02d' $((i % 60)))Z" \
    -m "Commit $i: update $filename"

  # Progress indicator
  if (( i % 1000 == 0 )); then
    echo "  $i / $NUM_COMMITS commits created..."
  fi
done

echo ""
echo "✓ Test repository created successfully!"
echo ""
echo "Repository details:"
echo "Commits: $(git rev-list --count HEAD)"
echo "File count: $(git ls-files | wc -l)"
echo "Repository size: $(du -sh .git | cut -f1)"
echo ""
echo "You can now use this repository for benchmarking:"
echo "  LOCAL_REPO_PATH=$REPO_DIR pnpm bench"
