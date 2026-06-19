export function generateFileContent(
  sizeInBytes: number,
  seed?: string
): string {
  // Generate realistic-looking text content (not just random bytes)
  const lines: string[] = [];
  const prefix = seed || "test";

  let bytesGenerated = 0;
  let lineNumber = 0;

  while (bytesGenerated < sizeInBytes) {
    const line = `${prefix}:line-${lineNumber}:${"x".repeat(50)}\n`;
    lines.push(line);
    bytesGenerated += line.length;
    lineNumber++;
  }

  return lines.join("");
}

export function generateLineContent(
  lineCount: number,
  seed?: string
): string {
  const prefix = seed || "test";
  const lines: string[] = [];

  for (let i = 0; i < lineCount; i++) {
    lines.push(`${prefix}:line-${i}:${"x".repeat(50)}`);
  }

  return lines.join("\n") + "\n";
}

export function generateFileName(
  prefix: string,
  index: number,
  extension: string = "txt"
): string {
  return `${prefix}-${String(index).padStart(5, "0")}.${extension}`;
}
