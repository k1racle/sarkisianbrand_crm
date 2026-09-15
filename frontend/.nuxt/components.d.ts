
import type { DefineComponent, SlotsType } from 'vue'
type IslandComponent<T> = DefineComponent<{}, {refresh: () => Promise<void>}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, SlotsType<{ fallback: { error: unknown } }>> & T

type HydrationStrategies = {
  hydrateOnVisible?: IntersectionObserverInit | true
  hydrateOnIdle?: number | true
  hydrateOnInteraction?: keyof HTMLElementEventMap | Array<keyof HTMLElementEventMap> | true
  hydrateOnMediaQuery?: string
  hydrateAfter?: number
  hydrateWhen?: boolean
  hydrateNever?: true
}
type LazyComponent<T> = DefineComponent<HydrationStrategies, {}, {}, {}, {}, {}, {}, { hydrated: () => void }> & T


export const AdminNewProduct: typeof import("../components/AdminNewProduct.vue")['default']
export const AdminOrderDrawer: typeof import("../components/AdminOrderDrawer.vue")['default']
export const AdminProductEditor: typeof import("../components/AdminProductEditor.vue")['default']
export const B2BPortalRail: typeof import("../components/B2BPortalRail.vue")['default']
export const BotCommandsSettings: typeof import("../components/BotCommandsSettings.vue")['default']
export const ConsoleRail: typeof import("../components/ConsoleRail.vue")['default']
export const CrmPipelineSettings: typeof import("../components/CrmPipelineSettings.vue")['default']
export const CrmTaskAutomation: typeof import("../components/CrmTaskAutomation.vue")['default']
export const EcosystemAccounts: typeof import("../components/EcosystemAccounts.vue")['default']
export const EcosystemIntegrations: typeof import("../components/EcosystemIntegrations.vue")['default']
export const EcosystemTrash: typeof import("../components/EcosystemTrash.vue")['default']
export const IntegrationBrandLogo: typeof import("../components/IntegrationBrandLogo.vue")['default']
export const MarketplaceRail: typeof import("../components/MarketplaceRail.vue")['default']
export const PlatformChatDrawer: typeof import("../components/PlatformChatDrawer.vue")['default']
export const TaskReminderCenter: typeof import("../components/TaskReminderCenter.vue")['default']
export const UserProfileDrawer: typeof import("../components/UserProfileDrawer.vue")['default']
export const WorkspaceContextMenu: typeof import("../components/WorkspaceContextMenu.vue")['default']
export const WorkspaceLoading: typeof import("../components/WorkspaceLoading.vue")['default']
export const ProductCard: typeof import("../components/storefront/ProductCard.vue")['default']
export const SiteAuthDrawer: typeof import("../components/storefront/SiteAuthDrawer.vue")['default']
export const SiteCartDrawer: typeof import("../components/storefront/SiteCartDrawer.vue")['default']
export const SiteCatalogDrawer: typeof import("../components/storefront/SiteCatalogDrawer.vue")['default']
export const SiteFavoritesDrawer: typeof import("../components/storefront/SiteFavoritesDrawer.vue")['default']
export const SiteFooter: typeof import("../components/storefront/SiteFooter.vue")['default']
export const SiteHeader: typeof import("../components/storefront/SiteHeader.vue")['default']
export const SiteShell: typeof import("../components/storefront/SiteShell.vue")['default']
export const NuxtWelcome: typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']
export const NuxtLayout: typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']
export const NuxtErrorBoundary: typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
export const ClientOnly: typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']
export const DevOnly: typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']
export const ServerPlaceholder: typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']
export const NuxtLink: typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']
export const NuxtLoadingIndicator: typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
export const NuxtTime: typeof import("../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
export const NuxtRouteAnnouncer: typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
export const NuxtImg: typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']
export const NuxtPicture: typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']
export const NuxtPage: typeof import("../node_modules/nuxt/dist/pages/runtime/page")['default']
export const NoScript: typeof import("../node_modules/nuxt/dist/head/runtime/components")['NoScript']
export const Link: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Link']
export const Base: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Base']
export const Title: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Title']
export const Meta: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Meta']
export const Style: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Style']
export const Head: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Head']
export const Html: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Html']
export const Body: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Body']
export const NuxtIsland: typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']
export const LazyAdminNewProduct: LazyComponent<typeof import("../components/AdminNewProduct.vue")['default']>
export const LazyAdminOrderDrawer: LazyComponent<typeof import("../components/AdminOrderDrawer.vue")['default']>
export const LazyAdminProductEditor: LazyComponent<typeof import("../components/AdminProductEditor.vue")['default']>
export const LazyB2BPortalRail: LazyComponent<typeof import("../components/B2BPortalRail.vue")['default']>
export const LazyBotCommandsSettings: LazyComponent<typeof import("../components/BotCommandsSettings.vue")['default']>
export const LazyConsoleRail: LazyComponent<typeof import("../components/ConsoleRail.vue")['default']>
export const LazyCrmPipelineSettings: LazyComponent<typeof import("../components/CrmPipelineSettings.vue")['default']>
export const LazyCrmTaskAutomation: LazyComponent<typeof import("../components/CrmTaskAutomation.vue")['default']>
export const LazyEcosystemAccounts: LazyComponent<typeof import("../components/EcosystemAccounts.vue")['default']>
export const LazyEcosystemIntegrations: LazyComponent<typeof import("../components/EcosystemIntegrations.vue")['default']>
export const LazyEcosystemTrash: LazyComponent<typeof import("../components/EcosystemTrash.vue")['default']>
export const LazyIntegrationBrandLogo: LazyComponent<typeof import("../components/IntegrationBrandLogo.vue")['default']>
export const LazyMarketplaceRail: LazyComponent<typeof import("../components/MarketplaceRail.vue")['default']>
export const LazyPlatformChatDrawer: LazyComponent<typeof import("../components/PlatformChatDrawer.vue")['default']>
export const LazyTaskReminderCenter: LazyComponent<typeof import("../components/TaskReminderCenter.vue")['default']>
export const LazyUserProfileDrawer: LazyComponent<typeof import("../components/UserProfileDrawer.vue")['default']>
export const LazyWorkspaceContextMenu: LazyComponent<typeof import("../components/WorkspaceContextMenu.vue")['default']>
export const LazyWorkspaceLoading: LazyComponent<typeof import("../components/WorkspaceLoading.vue")['default']>
export const LazyProductCard: LazyComponent<typeof import("../components/storefront/ProductCard.vue")['default']>
export const LazySiteAuthDrawer: LazyComponent<typeof import("../components/storefront/SiteAuthDrawer.vue")['default']>
export const LazySiteCartDrawer: LazyComponent<typeof import("../components/storefront/SiteCartDrawer.vue")['default']>
export const LazySiteCatalogDrawer: LazyComponent<typeof import("../components/storefront/SiteCatalogDrawer.vue")['default']>
export const LazySiteFavoritesDrawer: LazyComponent<typeof import("../components/storefront/SiteFavoritesDrawer.vue")['default']>
export const LazySiteFooter: LazyComponent<typeof import("../components/storefront/SiteFooter.vue")['default']>
export const LazySiteHeader: LazyComponent<typeof import("../components/storefront/SiteHeader.vue")['default']>
export const LazySiteShell: LazyComponent<typeof import("../components/storefront/SiteShell.vue")['default']>
export const LazyNuxtWelcome: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']>
export const LazyNuxtLayout: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
export const LazyNuxtErrorBoundary: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
export const LazyClientOnly: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']>
export const LazyDevOnly: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']>
export const LazyServerPlaceholder: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
export const LazyNuxtLink: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']>
export const LazyNuxtLoadingIndicator: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
export const LazyNuxtTime: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
export const LazyNuxtRouteAnnouncer: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
export const LazyNuxtImg: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']>
export const LazyNuxtPicture: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']>
export const LazyNuxtPage: LazyComponent<typeof import("../node_modules/nuxt/dist/pages/runtime/page")['default']>
export const LazyNoScript: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['NoScript']>
export const LazyLink: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Link']>
export const LazyBase: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Base']>
export const LazyTitle: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Title']>
export const LazyMeta: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Meta']>
export const LazyStyle: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Style']>
export const LazyHead: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Head']>
export const LazyHtml: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Html']>
export const LazyBody: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Body']>
export const LazyNuxtIsland: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']>

export const componentNames: string[]
