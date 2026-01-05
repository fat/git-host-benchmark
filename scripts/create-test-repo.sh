#!/bin/bash

# Script to create a test repository for benchmarking
# Copyright Anysphere Inc.

set -e

REPO_DIR="${1:-./test-data/sample-repo}"
NUM_FILES="${2:-100}"
FILE_SIZE="${3:-1024}"

echo "Creating test repository at: $REPO_DIR"
echo "Number of files: $NUM_FILES"
echo "File size: $FILE_SIZE bytes"

# Create directory
mkdir -p "$REPO_DIR"
cd "$REPO_DIR"

# Initialize git repo
git init

# Create test files
echo "Generating test files..."
for i in $(seq 1 $NUM_FILES); do
  filename=$(printf "file-%05d.txt" $i)
  # Generate file content
  head -c $FILE_SIZE /dev/urandom | base64 > "$filename"
done

# Create a README
cat > README.md << EOF
# Test Repository

This is a test repository for benchmarking Git Storage.

Generated with:
- Files: $NUM_FILES
- File size: $FILE_SIZE bytes
- Total size: $(du -sh . | cut -f1)

Created on: $(date)
EOF

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit with $NUM_FILES test files"

echo ""
echo "✓ Test repository created successfully!"
echo ""
echo "Repository details:"
git log --oneline
echo ""
echo "File count: $(git ls-files | wc -l)"
echo "Repository size: $(du -sh .git | cut -f1)"
echo ""
echo "You can now use this repository for benchmarking:"
echo "  LOCAL_REPO_PATH=$REPO_DIR pnpm bench"

