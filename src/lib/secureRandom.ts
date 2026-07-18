export function secureRandomInt(maxExclusive: number): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] % maxExclusive;
}

export function secureRandomItem<T>(items: readonly T[]): T {
  return items[secureRandomInt(items.length)];
}
