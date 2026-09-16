import type { NavigationGuard } from 'vue-router'
export type MiddlewareKey = "catalog-legacy-links"
declare module 'nuxt/app' {
  interface PageMeta {
    middleware?: MiddlewareKey | NavigationGuard | Array<MiddlewareKey | NavigationGuard>
  }
}