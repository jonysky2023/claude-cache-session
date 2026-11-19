export type CacheView = {
  /** ms of the last response with usage; 0 before the first */
  lastAt: number
  /** prompt tokens the next request re-sends */
  tokens: number
  lastRead: number
  lastWrite: number
  /** whole minutes left on the cache entry; <= 0 means expired */
  minutesLeft: number
  /** context window fill, percent */
  percent: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'cache-counter': { view: CacheView }
  }
}
