import { RuntimeConfig as UserRuntimeConfig, PublicRuntimeConfig as UserPublicRuntimeConfig } from 'nuxt/schema'
  interface SharedRuntimeConfig {
   appSecret: string,

   app: {
      buildId: string,

      baseURL: string,

      buildAssetsDir: string,

      cdnURL: string,
   },

   apiProxyBase: string,

   seoApiBase: string,
  }
  interface SharedPublicRuntimeConfig {
   apiBase: string,

   apiProxyEnabled: string,

   apiRealtimePort: string,

   siteUrl: string,

   seoIndexingEnabled: string,
  }
declare module '@nuxt/schema' {
  interface RuntimeConfig extends UserRuntimeConfig {}
  interface PublicRuntimeConfig extends UserPublicRuntimeConfig {}
}
declare module 'nuxt/schema' {
  interface RuntimeConfig extends SharedRuntimeConfig {}
  interface PublicRuntimeConfig extends SharedPublicRuntimeConfig {}
}
declare module 'vue' {
        interface ComponentCustomProperties {
          $config: UserRuntimeConfig
        }
      }