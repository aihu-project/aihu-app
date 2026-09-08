declare module '@aihu/context/ssr' {
  export function setSsrContextMap(map: Map<symbol, unknown>): void
  export function clearSsrContextMap(): void
  export function runWithContext<T>(map: Map<symbol, unknown>, fn: () => T): T
}
