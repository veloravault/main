/** Splits `values` into chunks of at most `size` items each. No imports -
 *  kept dependency-free so it can be tested directly, unlike the rest of
 *  this codebase's src/lib files which use the @/ path alias. */
export function chunkKeys<T>(values: T[], size = 1000): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}
