const signatures: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46, 0x2d]],
};

export function hasValidFileSignature(bytes: Uint8Array, mimeType: string) {
  const candidates = signatures[mimeType] ?? [];
  return candidates.some((signature) => {
    if (bytes.length < signature.length) return false;
    if (!signature.every((value, index) => bytes[index] === value)) return false;
    if (mimeType !== "image/webp") return true;
    return (
      bytes.length >= 12 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  });
}
