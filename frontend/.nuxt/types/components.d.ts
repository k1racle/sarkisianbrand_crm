
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

interface _GlobalComponents {
  AdminMediaBrowser: typeof import("../../components/AdminMediaBrowser.vue")['default']
  AdminMediaPicker: typeof import("../../components/AdminMediaPicker.vue")['default']
  AdminNewProduct: typeof import("../../components/AdminNewProduct.vue")['default']
  AdminOrderDrawer: typeof import("../../components/AdminOrderDrawer.vue")['default']
  AdminProductEditor: typeof import("../../components/AdminProductEditor.vue")['default']
  B2BPortalRail: typeof import("../../components/B2BPortalRail.vue")['default']
  BotCommandsSettings: typeof import("../../components/BotCommandsSettings.vue")['default']
  ConsoleRail: typeof import("../../components/ConsoleRail.vue")['default']
  CrmPipelineSettings: typeof import("../../components/CrmPipelineSettings.vue")['default']
  CrmTaskAutomation: typeof import("../../components/CrmTaskAutomation.vue")['default']
  EcosystemAccounts: typeof import("../../components/EcosystemAccounts.vue")['default']
  EcosystemIntegrations: typeof import("../../components/EcosystemIntegrations.vue")['default']
  EcosystemTrash: typeof import("../../components/EcosystemTrash.vue")['default']
  IntegrationBrandLogo: typeof import("../../components/IntegrationBrandLogo.vue")['default']
  MarketplaceRail: typeof import("../../components/MarketplaceRail.vue")['default']
  PlatformChatDrawer: typeof import("../../components/PlatformChatDrawer.vue")['default']
  TaskReminderCenter: typeof import("../../components/TaskReminderCenter.vue")['default']
  UserProfileDrawer: typeof import("../../components/UserProfileDrawer.vue")['default']
  WorkspaceContextMenu: typeof import("../../components/WorkspaceContextMenu.vue")['default']
  WorkspaceLoading: typeof import("../../components/WorkspaceLoading.vue")['default']
  ProductCard: typeof import("../../components/storefront/ProductCard.vue")['default']
  SiteAccountAddresses: typeof import("../../components/storefront/SiteAccountAddresses.vue")['default']
  SiteAccountDashboard: typeof import("../../components/storefront/SiteAccountDashboard.vue")['default']
  SiteAccountDrawer: typeof import("../../components/storefront/SiteAccountDrawer.vue")['default']
  SiteAccountGiftCards: typeof import("../../components/storefront/SiteAccountGiftCards.vue")['default']
  SiteAccountNotifications: typeof import("../../components/storefront/SiteAccountNotifications.vue")['default']
  SiteAccountOrders: typeof import("../../components/storefront/SiteAccountOrders.vue")['default']
  SiteAccountProfile: typeof import("../../components/storefront/SiteAccountProfile.vue")['default']
  SiteAuthDrawer: typeof import("../../components/storefront/SiteAuthDrawer.vue")['default']
  SiteCartDrawer: typeof import("../../components/storefront/SiteCartDrawer.vue")['default']
  SiteCartRecommendations: typeof import("../../components/storefront/SiteCartRecommendations.vue")['default']
  SiteCatalogDrawer: typeof import("../../components/storefront/SiteCatalogDrawer.vue")['default']
  SiteCatalogFilters: typeof import("../../components/storefront/SiteCatalogFilters.vue")['default']
  SiteCatalogMenuEditor: typeof import("../../components/storefront/SiteCatalogMenuEditor.vue")['default']
  SiteCheckout: typeof import("../../components/storefront/SiteCheckout.vue")['default']
  SiteContentPage: typeof import("../../components/storefront/SiteContentPage.vue")['default']
  SiteFavoritesDrawer: typeof import("../../components/storefront/SiteFavoritesDrawer.vue")['default']
  SiteFooter: typeof import("../../components/storefront/SiteFooter.vue")['default']
  SiteGiftCardsEditor: typeof import("../../components/storefront/SiteGiftCardsEditor.vue")['default']
  SiteHeader: typeof import("../../components/storefront/SiteHeader.vue")['default']
  SiteLoyaltyPreview: typeof import("../../components/storefront/SiteLoyaltyPreview.vue")['default']
  SiteMenuDrawer: typeof import("../../components/storefront/SiteMenuDrawer.vue")['default']
  SiteMenuLink: typeof import("../../components/storefront/SiteMenuLink.vue")['default']
  SitePagesEditor: typeof import("../../components/storefront/SitePagesEditor.vue")['default']
  SitePromoCodesEditor: typeof import("../../components/storefront/SitePromoCodesEditor.vue")['default']
  SiteQuantityControl: typeof import("../../components/storefront/SiteQuantityControl.vue")['default']
  SiteShell: typeof import("../../components/storefront/SiteShell.vue")['default']
  SiteSocialLoginButtons: typeof import("../../components/storefront/SiteSocialLoginButtons.vue")['default']
  NuxtWelcome: typeof import("../../node_modules/nuxt/dist/app/components/welcome.vue")['default']
  NuxtLayout: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-layout")['default']
  NuxtErrorBoundary: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
  ClientOnly: typeof import("../../node_modules/nuxt/dist/app/components/client-only")['default']
  DevOnly: typeof import("../../node_modules/nuxt/dist/app/components/dev-only")['default']
  ServerPlaceholder: typeof import("../../node_modules/nuxt/dist/app/components/server-placeholder")['default']
  NuxtLink: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-link")['default']
  NuxtLoadingIndicator: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
  NuxtTime: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
  NuxtRouteAnnouncer: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
  NuxtImg: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']
  NuxtPicture: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']
  NuxtPage: typeof import("../../node_modules/nuxt/dist/pages/runtime/page")['default']
  NoScript: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['NoScript']
  Link: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Link']
  Base: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Base']
  Title: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Title']
  Meta: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Meta']
  Style: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Style']
  Head: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Head']
  Html: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Html']
  Body: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Body']
  NuxtIsland: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-island")['default']
  LazyAdminMediaBrowser: LazyComponent<typeof import("../../components/AdminMediaBrowser.vue")['default']>
  LazyAdminMediaPicker: LazyComponent<typeof import("../../components/AdminMediaPicker.vue")['default']>
  LazyAdminNewProduct: LazyComponent<typeof import("../../components/AdminNewProduct.vue")['default']>
  LazyAdminOrderDrawer: LazyComponent<typeof import("../../components/AdminOrderDrawer.vue")['default']>
  LazyAdminProductEditor: LazyComponent<typeof import("../../components/AdminProductEditor.vue")['default']>
  LazyB2BPortalRail: LazyComponent<typeof import("../../components/B2BPortalRail.vue")['default']>
  LazyBotCommandsSettings: LazyComponent<typeof import("../../components/BotCommandsSettings.vue")['default']>
  LazyConsoleRail: LazyComponent<typeof import("../../components/ConsoleRail.vue")['default']>
  LazyCrmPipelineSettings: LazyComponent<typeof import("../../components/CrmPipelineSettings.vue")['default']>
  LazyCrmTaskAutomation: LazyComponent<typeof import("../../components/CrmTaskAutomation.vue")['default']>
  LazyEcosystemAccounts: LazyComponent<typeof import("../../components/EcosystemAccounts.vue")['default']>
  LazyEcosystemIntegrations: LazyComponent<typeof import("../../components/EcosystemIntegrations.vue")['default']>
  LazyEcosystemTrash: LazyComponent<typeof import("../../components/EcosystemTrash.vue")['default']>
  LazyIntegrationBrandLogo: LazyComponent<typeof import("../../components/IntegrationBrandLogo.vue")['default']>
  LazyMarketplaceRail: LazyComponent<typeof import("../../components/MarketplaceRail.vue")['default']>
  LazyPlatformChatDrawer: LazyComponent<typeof import("../../components/PlatformChatDrawer.vue")['default']>
  LazyTaskReminderCenter: LazyComponent<typeof import("../../components/TaskReminderCenter.vue")['default']>
  LazyUserProfileDrawer: LazyComponent<typeof import("../../components/UserProfileDrawer.vue")['default']>
  LazyWorkspaceContextMenu: LazyComponent<typeof import("../../components/WorkspaceContextMenu.vue")['default']>
  LazyWorkspaceLoading: LazyComponent<typeof import("../../components/WorkspaceLoading.vue")['default']>
  LazyProductCard: LazyComponent<typeof import("../../components/storefront/ProductCard.vue")['default']>
  LazySiteAccountAddresses: LazyComponent<typeof import("../../components/storefront/SiteAccountAddresses.vue")['default']>
  LazySiteAccountDashboard: LazyComponent<typeof import("../../components/storefront/SiteAccountDashboard.vue")['default']>
  LazySiteAccountDrawer: LazyComponent<typeof import("../../components/storefront/SiteAccountDrawer.vue")['default']>
  LazySiteAccountGiftCards: LazyComponent<typeof import("../../components/storefront/SiteAccountGiftCards.vue")['default']>
  LazySiteAccountNotifications: LazyComponent<typeof import("../../components/storefront/SiteAccountNotifications.vue")['default']>
  LazySiteAccountOrders: LazyComponent<typeof import("../../components/storefront/SiteAccountOrders.vue")['default']>
  LazySiteAccountProfile: LazyComponent<typeof import("../../components/storefront/SiteAccountProfile.vue")['default']>
  LazySiteAuthDrawer: LazyComponent<typeof import("../../components/storefront/SiteAuthDrawer.vue")['default']>
  LazySiteCartDrawer: LazyComponent<typeof import("../../components/storefront/SiteCartDrawer.vue")['default']>
  LazySiteCartRecommendations: LazyComponent<typeof import("../../components/storefront/SiteCartRecommendations.vue")['default']>
  LazySiteCatalogDrawer: LazyComponent<typeof import("../../components/storefront/SiteCatalogDrawer.vue")['default']>
  LazySiteCatalogFilters: LazyComponent<typeof import("../../components/storefront/SiteCatalogFilters.vue")['default']>
  LazySiteCatalogMenuEditor: LazyComponent<typeof import("../../components/storefront/SiteCatalogMenuEditor.vue")['default']>
  LazySiteCheckout: LazyComponent<typeof import("../../components/storefront/SiteCheckout.vue")['default']>
  LazySiteContentPage: LazyComponent<typeof import("../../components/storefront/SiteContentPage.vue")['default']>
  LazySiteFavoritesDrawer: LazyComponent<typeof import("../../components/storefront/SiteFavoritesDrawer.vue")['default']>
  LazySiteFooter: LazyComponent<typeof import("../../components/storefront/SiteFooter.vue")['default']>
  LazySiteGiftCardsEditor: LazyComponent<typeof import("../../components/storefront/SiteGiftCardsEditor.vue")['default']>
  LazySiteHeader: LazyComponent<typeof import("../../components/storefront/SiteHeader.vue")['default']>
  LazySiteLoyaltyPreview: LazyComponent<typeof import("../../components/storefront/SiteLoyaltyPreview.vue")['default']>
  LazySiteMenuDrawer: LazyComponent<typeof import("../../components/storefront/SiteMenuDrawer.vue")['default']>
  LazySiteMenuLink: LazyComponent<typeof import("../../components/storefront/SiteMenuLink.vue")['default']>
  LazySitePagesEditor: LazyComponent<typeof import("../../components/storefront/SitePagesEditor.vue")['default']>
  LazySitePromoCodesEditor: LazyComponent<typeof import("../../components/storefront/SitePromoCodesEditor.vue")['default']>
  LazySiteQuantityControl: LazyComponent<typeof import("../../components/storefront/SiteQuantityControl.vue")['default']>
  LazySiteShell: LazyComponent<typeof import("../../components/storefront/SiteShell.vue")['default']>
  LazySiteSocialLoginButtons: LazyComponent<typeof import("../../components/storefront/SiteSocialLoginButtons.vue")['default']>
  LazyNuxtWelcome: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/welcome.vue")['default']>
  LazyNuxtLayout: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
  LazyNuxtErrorBoundary: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
  LazyClientOnly: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/client-only")['default']>
  LazyDevOnly: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/dev-only")['default']>
  LazyServerPlaceholder: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
  LazyNuxtLink: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-link")['default']>
  LazyNuxtLoadingIndicator: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
  LazyNuxtTime: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
  LazyNuxtRouteAnnouncer: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
  LazyNuxtImg: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']>
  LazyNuxtPicture: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']>
  LazyNuxtPage: LazyComponent<typeof import("../../node_modules/nuxt/dist/pages/runtime/page")['default']>
  LazyNoScript: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['NoScript']>
  LazyLink: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Link']>
  LazyBase: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Base']>
  LazyTitle: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Title']>
  LazyMeta: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Meta']>
  LazyStyle: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Style']>
  LazyHead: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Head']>
  LazyHtml: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Html']>
  LazyBody: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Body']>
  LazyNuxtIsland: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-island")['default']>
}

declare module 'vue' {
  export interface GlobalComponents extends _GlobalComponents { }
}

export {}
