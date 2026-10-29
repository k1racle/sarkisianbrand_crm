export type MiddlewareKey = "catalog-legacy-links"
declare module '@nuxt/schema' {
  interface RouteRuleConfigExtensions {
    appMiddleware?: MiddlewareKey | MiddlewareKey[] | Record<MiddlewareKey, boolean>
  }
}
declare module 'nuxt/schema' {
  interface RouteRuleConfigExtensions {
    appMiddleware?: MiddlewareKey | MiddlewareKey[] | Record<MiddlewareKey, boolean>
  }
}