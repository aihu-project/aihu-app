// @aihu/runtime/app is the integration bridge introduced with the next
// runtime release. Keep the app source typeable against the currently
// published runtime while that peer release is being staged; the published
// app package still leaves this subpath external and consumes the runtime's
// own declaration once it is available.
declare module '@aihu/runtime/app' {
  export function _setHydrate(fn: ((...args: any[]) => unknown) | null): void
  export function _setMount(fn: (...args: any[]) => unknown): void
  export function _setSignal(fn: (...args: any[]) => unknown): void
  export function _withOwnerContext<T>(node: object, fn: () => T): T
}
