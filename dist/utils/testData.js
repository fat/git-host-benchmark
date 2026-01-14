export function generateFileContent(sizeInBytes, seed) {
    // Generate realistic-looking text content (not just random bytes)
    const lines = [];
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
export function generateFileName(prefix, index, extension = "txt") {
    return `${prefix}-${String(index).padStart(5, "0")}.${extension}`;
}
//# sourceMappingURL=testData.js.map