
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
  BusinessCatalog: typeof import("../../components/BusinessCatalog.vue")['default']
  BusinessOrders: typeof import("../../components/BusinessOrders.vue")['default']
  BusinessPurchasesDashboard: typeof import("../../components/BusinessPurchasesDashboard.vue")['default']
  BusinessSettings: typeof import("../../components/BusinessSettings.vue")['default']
  BusinessToolbar: typeof import("../../components/BusinessToolbar.vue")['default']
  ConsoleRail: typeof import("../../components/ConsoleRail.vue")['default']
  CrmAccountManagerField: typeof import("../../components/CrmAccountManagerField.vue")['default']
  CrmCardComments: typeof import("../../components/CrmCardComments.vue")['default']
  CrmCardTabs: typeof import("../../components/CrmCardTabs.vue")['default']
  CrmChangeHistory: typeof import("../../components/CrmChangeHistory.vue")['default']
  CrmDrivePicker: typeof import("../../components/CrmDrivePicker.vue")['default']
  CrmDriveThumbnail: typeof import("../../components/CrmDriveThumbnail.vue")['default']
  CrmFilePreview: typeof import("../../components/CrmFilePreview.vue")['default']
  CrmLeadTasks: typeof import("../../components/CrmLeadTasks.vue")['default']
  CrmPdfViewer: typeof import("../../components/CrmPdfViewer.vue")['default']
  CrmPipelineSettings: typeof import("../../components/CrmPipelineSettings.vue")['default']
  CrmStockRules: typeof import("../../components/CrmStockRules.vue")['default']
  CrmSubtasks: typeof import("../../components/CrmSubtasks.vue")['default']
  CrmTaskAutomation: typeof import("../../components/CrmTaskAutomation.vue")['default']
  CrmTaskFiles: typeof import("../../components/CrmTaskFiles.vue")['default']
  CrmTaskParticipants: typeof import("../../components/CrmTaskParticipants.vue")['default']
  CrmTaskPeoplePicker: typeof import("../../components/CrmTaskPeoplePicker.vue")['default']
  EcosystemAccounts: typeof import("../../components/EcosystemAccounts.vue")['default']
  EcosystemIntegrations: typeof import("../../components/EcosystemIntegrations.vue")['default']
  EcosystemTrash: typeof import("../../components/EcosystemTrash.vue")['default']
  IntegrationBrandLogo: typeof import("../../components/IntegrationBrandLogo.vue")['default']
  PlatformChatDrawer: typeof import("../../components/PlatformChatDrawer.vue")['default']
  SalonBookingForm: typeof import("../../components/SalonBookingForm.vue")['default']
  SalonBookingHistory: typeof import("../../components/SalonBookingHistory.vue")['default']
  SalonCalendar: typeof import("../../components/SalonCalendar.vue")['default']
  SalonClients: typeof import("../../components/SalonClients.vue")['default']
  SalonDashboard: typeof import("../../components/SalonDashboard.vue")['default']
  SalonOnlineBookingSettings: typeof import("../../components/SalonOnlineBookingSettings.vue")['default']
  SalonOrganizationCard: typeof import("../../components/SalonOrganizationCard.vue")['default']
  SalonPresentationSettings: typeof import("../../components/SalonPresentationSettings.vue")['default']
  SalonServices: typeof import("../../components/SalonServices.vue")['default']
  SalonTeam: typeof import("../../components/SalonTeam.vue")['default']
  SalonWeeklySchedule: typeof import("../../components/SalonWeeklySchedule.vue")['default']
  TaskReminderCenter: typeof import("../../components/TaskReminderCenter.vue")['default']
  UserProfileDrawer: typeof import("../../components/UserProfileDrawer.vue")['default']
  WorkspaceContextMenu: typeof import("../../components/WorkspaceContextMenu.vue")['default']
  WorkspaceLoading: typeof import("../../components/WorkspaceLoading.vue")['default']
  WorkspaceOrdersTable: typeof import("../../components/WorkspaceOrdersTable.vue")['default']
  WorkspaceOverview: typeof import("../../components/WorkspaceOverview.vue")['default']
  WorkspaceSectionIcon: typeof import("../../components/WorkspaceSectionIcon.vue")['default']
  WorkspaceToolbar: typeof import("../../components/WorkspaceToolbar.vue")['default']
  CrmAccessBoundary: typeof import("../../components/crm/CrmAccessBoundary.vue")['default']
  CrmAccessProfiles: typeof import("../../components/crm/CrmAccessProfiles.vue")['default']
  CrmDayWidget: typeof import("../../components/crm/CrmDayWidget.vue")['default']
  CrmDensityToggle: typeof import("../../components/crm/CrmDensityToggle.vue")['default']
  CrmEmployeeAccessReview: typeof import("../../components/crm/CrmEmployeeAccessReview.vue")['default']
  CrmInstallButton: typeof import("../../components/crm/CrmInstallButton.vue")['default']
  CrmKnowledgeBase: typeof import("../../components/crm/CrmKnowledgeBase.vue")['default']
  CrmMarketplaceMapping: typeof import("../../components/crm/CrmMarketplaceMapping.vue")['default']
  CrmMeetingCalendar: typeof import("../../components/crm/CrmMeetingCalendar.vue")['default']
  CrmMeetingCalendarSync: typeof import("../../components/crm/CrmMeetingCalendarSync.vue")['default']
  CrmMeetingGuests: typeof import("../../components/crm/CrmMeetingGuests.vue")['default']
  CrmNotificationCenter: typeof import("../../components/crm/CrmNotificationCenter.vue")['default']
  CrmOrderAdjustments: typeof import("../../components/crm/CrmOrderAdjustments.vue")['default']
  CrmOrderExecution: typeof import("../../components/crm/CrmOrderExecution.vue")['default']
  CrmOrderFinance: typeof import("../../components/crm/CrmOrderFinance.vue")['default']
  CrmOrdersRegister: typeof import("../../components/crm/CrmOrdersRegister.vue")['default']
  CrmReceivables: typeof import("../../components/crm/CrmReceivables.vue")['default']
  CrmSchedulePatterns: typeof import("../../components/crm/CrmSchedulePatterns.vue")['default']
  CrmSectionNavigation: typeof import("../../components/crm/CrmSectionNavigation.vue")['default']
  CrmShell: typeof import("../../components/crm/CrmShell.vue")['default']
  CrmTaskPipelineEditor: typeof import("../../components/crm/CrmTaskPipelineEditor.vue")['default']
  CrmThemeToggle: typeof import("../../components/crm/CrmThemeToggle.vue")['default']
  CrmTimeCorrections: typeof import("../../components/crm/CrmTimeCorrections.vue")['default']
  CrmTimesheet: typeof import("../../components/crm/CrmTimesheet.vue")['default']
  CrmWorkClock: typeof import("../../components/crm/CrmWorkClock.vue")['default']
  NailArt: typeof import("../../components/sarkisian-studio/NailArt.vue")['default']
  NailFinish: typeof import("../../components/sarkisian-studio/NailFinish.vue")['default']
  NailPhotoLighting: typeof import("../../components/sarkisian-studio/NailPhotoLighting.vue")['default']
  SarkisianStudio: typeof import("../../components/sarkisian-studio/SarkisianStudio.vue")['default']
  Anatomy: typeof import("../../components/sarkisian-studio/anatomy")['default']
  DesignPalette: typeof import("../../components/sarkisian-studio/atelier/DesignPalette.vue")['default']
  FinishGame: typeof import("../../components/sarkisian-studio/atelier/FinishGame.vue")['default']
  KeriPortrait: typeof import("../../components/sarkisian-studio/atelier/KeriPortrait.vue")['default']
  MaterialShelf: typeof import("../../components/sarkisian-studio/atelier/MaterialShelf.vue")['default']
  NailFit: typeof import("../../components/sarkisian-studio/atelier/NailFit.vue")['default']
  NailPreparation: typeof import("../../components/sarkisian-studio/atelier/NailPreparation.vue")['default']
  RewardShop: typeof import("../../components/sarkisian-studio/atelier/RewardShop.vue")['default']
  ShiftGoals: typeof import("../../components/sarkisian-studio/atelier/ShiftGoals.vue")['default']
  StudioClock: typeof import("../../components/sarkisian-studio/atelier/StudioClock.vue")['default']
  StudioScene: typeof import("../../components/sarkisian-studio/atelier/StudioScene.vue")['default']
  StudioTool: typeof import("../../components/sarkisian-studio/atelier/StudioTool.vue")['default']
  SupplyMark: typeof import("../../components/sarkisian-studio/atelier/SupplyMark.vue")['default']
  Preparation: typeof import("../../components/sarkisian-studio/atelier/preparation")['default']
  Progression: typeof import("../../components/sarkisian-studio/atelier/progression")['default']
  Supplies: typeof import("../../components/sarkisian-studio/atelier/supplies")['default']
  Appearance: typeof import("../../components/sarkisian-studio/character/appearance")['default']
  KeriAvatar: typeof import("../../components/sarkisian-studio/keri/KeriAvatar.vue")['default']
  KeriChoice: typeof import("../../components/sarkisian-studio/keri/KeriChoice.vue")['default']
  KeriWardrobe: typeof import("../../components/sarkisian-studio/keri/KeriWardrobe.vue")['default']
  Clothing: typeof import("../../components/sarkisian-studio/keri/clothing")['default']
  Look: typeof import("../../components/sarkisian-studio/keri/look")['default']
  Makeup: typeof import("../../components/sarkisian-studio/keri/makeup")['default']
  Render: typeof import("../../components/sarkisian-studio/keri/render")['default']
  Styling: typeof import("../../components/sarkisian-studio/keri/styling")['default']
  ManicureCatalog: typeof import("../../components/sarkisian-studio/manicure-catalog")['default']
  Model: typeof import("../../components/sarkisian-studio/model")['default']
  NailArtGeometry: typeof import("../../components/sarkisian-studio/nail-art-geometry")['default']
  NailEffects: typeof import("../../components/sarkisian-studio/nail-effects")['default']
  NailShapes: typeof import("../../components/sarkisian-studio/nail-shapes")['default']
  PhotoLighting: typeof import("../../components/sarkisian-studio/photo-lighting")['default']
  ProductCard: typeof import("../../components/storefront/ProductCard.vue")['default']
  SiteAboutPage: typeof import("../../components/storefront/SiteAboutPage.vue")['default']
  SiteAccountAddresses: typeof import("../../components/storefront/SiteAccountAddresses.vue")['default']
  SiteAccountDashboard: typeof import("../../components/storefront/SiteAccountDashboard.vue")['default']
  SiteAccountDrawer: typeof import("../../components/storefront/SiteAccountDrawer.vue")['default']
  SiteAccountGiftCards: typeof import("../../components/storefront/SiteAccountGiftCards.vue")['default']
  SiteAccountNotifications: typeof import("../../components/storefront/SiteAccountNotifications.vue")['default']
  SiteAccountOrders: typeof import("../../components/storefront/SiteAccountOrders.vue")['default']
  SiteAccountProfile: typeof import("../../components/storefront/SiteAccountProfile.vue")['default']
  SiteAuthDrawer: typeof import("../../components/storefront/SiteAuthDrawer.vue")['default']
  SiteBloggersPage: typeof import("../../components/storefront/SiteBloggersPage.vue")['default']
  SiteBusinessPage: typeof import("../../components/storefront/SiteBusinessPage.vue")['default']
  SiteBusinessPreview: typeof import("../../components/storefront/SiteBusinessPreview.vue")['default']
  SiteBusinessRegistrationDrawer: typeof import("../../components/storefront/SiteBusinessRegistrationDrawer.vue")['default']
  SiteCartBadge: typeof import("../../components/storefront/SiteCartBadge.vue")['default']
  SiteCartDrawer: typeof import("../../components/storefront/SiteCartDrawer.vue")['default']
  SiteCartRecommendations: typeof import("../../components/storefront/SiteCartRecommendations.vue")['default']
  SiteCartSuggestion: typeof import("../../components/storefront/SiteCartSuggestion.vue")['default']
  SiteCatalogDesignFilters: typeof import("../../components/storefront/SiteCatalogDesignFilters.vue")['default']
  SiteCatalogDrawer: typeof import("../../components/storefront/SiteCatalogDrawer.vue")['default']
  SiteCatalogFilters: typeof import("../../components/storefront/SiteCatalogFilters.vue")['default']
  SiteCatalogMenuEditor: typeof import("../../components/storefront/SiteCatalogMenuEditor.vue")['default']
  SiteCatalogPage: typeof import("../../components/storefront/SiteCatalogPage.vue")['default']
  SiteCategoriesEditor: typeof import("../../components/storefront/SiteCategoriesEditor.vue")['default']
  SiteCheckout: typeof import("../../components/storefront/SiteCheckout.vue")['default']
  SiteClubBlock: typeof import("../../components/storefront/SiteClubBlock.vue")['default']
  SiteClubHub: typeof import("../../components/storefront/SiteClubHub.vue")['default']
  SiteClubReferral: typeof import("../../components/storefront/SiteClubReferral.vue")['default']
  SiteClubReferralStack: typeof import("../../components/storefront/SiteClubReferralStack.vue")['default']
  SiteClubReferralsPage: typeof import("../../components/storefront/SiteClubReferralsPage.vue")['default']
  SiteContactForm: typeof import("../../components/storefront/SiteContactForm.vue")['default']
  SiteContentEditor: typeof import("../../components/storefront/SiteContentEditor.vue")['default']
  SiteContentPage: typeof import("../../components/storefront/SiteContentPage.vue")['default']
  SiteFavoritesDrawer: typeof import("../../components/storefront/SiteFavoritesDrawer.vue")['default']
  SiteFloatingActions: typeof import("../../components/storefront/SiteFloatingActions.vue")['default']
  SiteFooter: typeof import("../../components/storefront/SiteFooter.vue")['default']
  SiteFounderBiography: typeof import("../../components/storefront/SiteFounderBiography.vue")['default']
  SiteGiftCardsEditor: typeof import("../../components/storefront/SiteGiftCardsEditor.vue")['default']
  SiteHeader: typeof import("../../components/storefront/SiteHeader.vue")['default']
  SiteHomeCourses: typeof import("../../components/storefront/SiteHomeCourses.vue")['default']
  SiteHomeEffects: typeof import("../../components/storefront/SiteHomeEffects.vue")['default']
  SiteHomeFooter: typeof import("../../components/storefront/SiteHomeFooter.vue")['default']
  SiteHomeNavigation: typeof import("../../components/storefront/SiteHomeNavigation.vue")['default']
  SiteHomeRegion: typeof import("../../components/storefront/SiteHomeRegion.vue")['default']
  SiteLoyaltyPreview: typeof import("../../components/storefront/SiteLoyaltyPreview.vue")['default']
  SiteMenuDrawer: typeof import("../../components/storefront/SiteMenuDrawer.vue")['default']
  SiteMenuLink: typeof import("../../components/storefront/SiteMenuLink.vue")['default']
  SitePageArt: typeof import("../../components/storefront/SitePageArt.vue")['default']
  SitePagesEditor: typeof import("../../components/storefront/SitePagesEditor.vue")['default']
  SitePartnerAccount: typeof import("../../components/storefront/SitePartnerAccount.vue")['default']
  SitePartnerLink: typeof import("../../components/storefront/SitePartnerLink.vue")['default']
  SitePartnershipBlock: typeof import("../../components/storefront/SitePartnershipBlock.vue")['default']
  SitePartnershipPage: typeof import("../../components/storefront/SitePartnershipPage.vue")['default']
  SitePartnershipScene: typeof import("../../components/storefront/SitePartnershipScene.vue")['default']
  SiteProductBadgesEditor: typeof import("../../components/storefront/SiteProductBadgesEditor.vue")['default']
  SiteProductPage: typeof import("../../components/storefront/SiteProductPage.vue")['default']
  SitePromoCodesEditor: typeof import("../../components/storefront/SitePromoCodesEditor.vue")['default']
  SiteQuantityControl: typeof import("../../components/storefront/SiteQuantityControl.vue")['default']
  SiteShell: typeof import("../../components/storefront/SiteShell.vue")['default']
  SiteSocialLoginButtons: typeof import("../../components/storefront/SiteSocialLoginButtons.vue")['default']
  ChannelsWorkspacePage: typeof import("../../components/workspace/ChannelsWorkspacePage.vue")['default']
  ContactMessagesWorkspace: typeof import("../../components/workspace/ContactMessagesWorkspace.vue")['default']
  MarketplaceExchangePanel: typeof import("../../components/workspace/MarketplaceExchangePanel.vue")['default']
  PartnerDocumentsSettingsPage: typeof import("../../components/workspace/PartnerDocumentsSettingsPage.vue")['default']
  PartnerGiftsPage: typeof import("../../components/workspace/PartnerGiftsPage.vue")['default']
  PartnerLegalEntitiesPage: typeof import("../../components/workspace/PartnerLegalEntitiesPage.vue")['default']
  PartnerWorkspacePage: typeof import("../../components/workspace/PartnerWorkspacePage.vue")['default']
  ReportsWorkspacePage: typeof import("../../components/workspace/ReportsWorkspacePage.vue")['default']
  SalonSubscriptionSettings: typeof import("../../components/workspace/SalonSubscriptionSettings.vue")['default']
  StoreDashboard: typeof import("../../components/workspace/StoreDashboard.vue")['default']
  StoreWorkspacePage: typeof import("../../components/workspace/StoreWorkspacePage.vue")['default']
  SupportWorkspacePage: typeof import("../../components/workspace/SupportWorkspacePage.vue")['default']
  SystemWorkspacePage: typeof import("../../components/workspace/SystemWorkspacePage.vue")['default']
  /**
   * Displays the welcome screen used by new Nuxt projects.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-welcome
   */
  NuxtWelcome: typeof import("../../node_modules/nuxt/dist/app/components/welcome.vue")['default']
  /**
   * Renders the selected layout around pages or error content.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-layout
   */
  NuxtLayout: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-layout")['default']
  /**
   * Catches client-side errors from its default slot and renders an error slot.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-error-boundary
   */
  NuxtErrorBoundary: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
  /**
   * Renders its default slot only on the client, with an optional server fallback.
   *
   * @see https://nuxt.com/docs/4.x/api/components/client-only
   */
  ClientOnly: typeof import("../../node_modules/nuxt/dist/app/components/client-only")['default']
  /**
   * Renders its content only during development.
   *
   * @see https://nuxt.com/docs/4.x/api/components/dev-only
   */
  DevOnly: typeof import("../../node_modules/nuxt/dist/app/components/dev-only")['default']
  ServerPlaceholder: typeof import("../../node_modules/nuxt/dist/app/components/server-placeholder")['default']
  /**
   * A drop-in replacement for Vue Router's `<RouterLink>` and the HTML `<a>` element.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-link
   */
  NuxtLink: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-link")['default']
  /**
   * Displays a progress bar during page navigation.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-loading-indicator
   */
  NuxtLoadingIndicator: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
  /**
   * Formats dates and times consistently across server and client using the user's locale.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-time
   */
  NuxtTime: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
  /**
   * Announces route changes to assistive technologies using the current page title.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-route-announcer
   */
  NuxtRouteAnnouncer: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
  /**
   * Announces dynamic content changes to assistive technologies.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-announcer
   */
  NuxtAnnouncer: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-announcer")['default']
  /**
   * Renders an optimized image through the Nuxt Image module.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-img
   */
  NuxtImg: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']
  /**
   * Renders responsive optimized images through the Nuxt Image module.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-picture
   */
  NuxtPicture: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']
  /**
   * Renders the current page from the `pages/` directory.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-page
   */
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
  /**
   * Renders a non-interactive server component without shipping client-side JavaScript.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-island
   */
  NuxtIsland: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-island")['default']
  LazyAdminMediaBrowser: LazyComponent<typeof import("../../components/AdminMediaBrowser.vue")['default']>
  LazyAdminMediaPicker: LazyComponent<typeof import("../../components/AdminMediaPicker.vue")['default']>
  LazyAdminNewProduct: LazyComponent<typeof import("../../components/AdminNewProduct.vue")['default']>
  LazyAdminOrderDrawer: LazyComponent<typeof import("../../components/AdminOrderDrawer.vue")['default']>
  LazyAdminProductEditor: LazyComponent<typeof import("../../components/AdminProductEditor.vue")['default']>
  LazyB2BPortalRail: LazyComponent<typeof import("../../components/B2BPortalRail.vue")['default']>
  LazyBotCommandsSettings: LazyComponent<typeof import("../../components/BotCommandsSettings.vue")['default']>
  LazyBusinessCatalog: LazyComponent<typeof import("../../components/BusinessCatalog.vue")['default']>
  LazyBusinessOrders: LazyComponent<typeof import("../../components/BusinessOrders.vue")['default']>
  LazyBusinessPurchasesDashboard: LazyComponent<typeof import("../../components/BusinessPurchasesDashboard.vue")['default']>
  LazyBusinessSettings: LazyComponent<typeof import("../../components/BusinessSettings.vue")['default']>
  LazyBusinessToolbar: LazyComponent<typeof import("../../components/BusinessToolbar.vue")['default']>
  LazyConsoleRail: LazyComponent<typeof import("../../components/ConsoleRail.vue")['default']>
  LazyCrmAccountManagerField: LazyComponent<typeof import("../../components/CrmAccountManagerField.vue")['default']>
  LazyCrmCardComments: LazyComponent<typeof import("../../components/CrmCardComments.vue")['default']>
  LazyCrmCardTabs: LazyComponent<typeof import("../../components/CrmCardTabs.vue")['default']>
  LazyCrmChangeHistory: LazyComponent<typeof import("../../components/CrmChangeHistory.vue")['default']>
  LazyCrmDrivePicker: LazyComponent<typeof import("../../components/CrmDrivePicker.vue")['default']>
  LazyCrmDriveThumbnail: LazyComponent<typeof import("../../components/CrmDriveThumbnail.vue")['default']>
  LazyCrmFilePreview: LazyComponent<typeof import("../../components/CrmFilePreview.vue")['default']>
  LazyCrmLeadTasks: LazyComponent<typeof import("../../components/CrmLeadTasks.vue")['default']>
  LazyCrmPdfViewer: LazyComponent<typeof import("../../components/CrmPdfViewer.vue")['default']>
  LazyCrmPipelineSettings: LazyComponent<typeof import("../../components/CrmPipelineSettings.vue")['default']>
  LazyCrmStockRules: LazyComponent<typeof import("../../components/CrmStockRules.vue")['default']>
  LazyCrmSubtasks: LazyComponent<typeof import("../../components/CrmSubtasks.vue")['default']>
  LazyCrmTaskAutomation: LazyComponent<typeof import("../../components/CrmTaskAutomation.vue")['default']>
  LazyCrmTaskFiles: LazyComponent<typeof import("../../components/CrmTaskFiles.vue")['default']>
  LazyCrmTaskParticipants: LazyComponent<typeof import("../../components/CrmTaskParticipants.vue")['default']>
  LazyCrmTaskPeoplePicker: LazyComponent<typeof import("../../components/CrmTaskPeoplePicker.vue")['default']>
  LazyEcosystemAccounts: LazyComponent<typeof import("../../components/EcosystemAccounts.vue")['default']>
  LazyEcosystemIntegrations: LazyComponent<typeof import("../../components/EcosystemIntegrations.vue")['default']>
  LazyEcosystemTrash: LazyComponent<typeof import("../../components/EcosystemTrash.vue")['default']>
  LazyIntegrationBrandLogo: LazyComponent<typeof import("../../components/IntegrationBrandLogo.vue")['default']>
  LazyPlatformChatDrawer: LazyComponent<typeof import("../../components/PlatformChatDrawer.vue")['default']>
  LazySalonBookingForm: LazyComponent<typeof import("../../components/SalonBookingForm.vue")['default']>
  LazySalonBookingHistory: LazyComponent<typeof import("../../components/SalonBookingHistory.vue")['default']>
  LazySalonCalendar: LazyComponent<typeof import("../../components/SalonCalendar.vue")['default']>
  LazySalonClients: LazyComponent<typeof import("../../components/SalonClients.vue")['default']>
  LazySalonDashboard: LazyComponent<typeof import("../../components/SalonDashboard.vue")['default']>
  LazySalonOnlineBookingSettings: LazyComponent<typeof import("../../components/SalonOnlineBookingSettings.vue")['default']>
  LazySalonOrganizationCard: LazyComponent<typeof import("../../components/SalonOrganizationCard.vue")['default']>
  LazySalonPresentationSettings: LazyComponent<typeof import("../../components/SalonPresentationSettings.vue")['default']>
  LazySalonServices: LazyComponent<typeof import("../../components/SalonServices.vue")['default']>
  LazySalonTeam: LazyComponent<typeof import("../../components/SalonTeam.vue")['default']>
  LazySalonWeeklySchedule: LazyComponent<typeof import("../../components/SalonWeeklySchedule.vue")['default']>
  LazyTaskReminderCenter: LazyComponent<typeof import("../../components/TaskReminderCenter.vue")['default']>
  LazyUserProfileDrawer: LazyComponent<typeof import("../../components/UserProfileDrawer.vue")['default']>
  LazyWorkspaceContextMenu: LazyComponent<typeof import("../../components/WorkspaceContextMenu.vue")['default']>
  LazyWorkspaceLoading: LazyComponent<typeof import("../../components/WorkspaceLoading.vue")['default']>
  LazyWorkspaceOrdersTable: LazyComponent<typeof import("../../components/WorkspaceOrdersTable.vue")['default']>
  LazyWorkspaceOverview: LazyComponent<typeof import("../../components/WorkspaceOverview.vue")['default']>
  LazyWorkspaceSectionIcon: LazyComponent<typeof import("../../components/WorkspaceSectionIcon.vue")['default']>
  LazyWorkspaceToolbar: LazyComponent<typeof import("../../components/WorkspaceToolbar.vue")['default']>
  LazyCrmAccessBoundary: LazyComponent<typeof import("../../components/crm/CrmAccessBoundary.vue")['default']>
  LazyCrmAccessProfiles: LazyComponent<typeof import("../../components/crm/CrmAccessProfiles.vue")['default']>
  LazyCrmDayWidget: LazyComponent<typeof import("../../components/crm/CrmDayWidget.vue")['default']>
  LazyCrmDensityToggle: LazyComponent<typeof import("../../components/crm/CrmDensityToggle.vue")['default']>
  LazyCrmEmployeeAccessReview: LazyComponent<typeof import("../../components/crm/CrmEmployeeAccessReview.vue")['default']>
  LazyCrmInstallButton: LazyComponent<typeof import("../../components/crm/CrmInstallButton.vue")['default']>
  LazyCrmKnowledgeBase: LazyComponent<typeof import("../../components/crm/CrmKnowledgeBase.vue")['default']>
  LazyCrmMarketplaceMapping: LazyComponent<typeof import("../../components/crm/CrmMarketplaceMapping.vue")['default']>
  LazyCrmMeetingCalendar: LazyComponent<typeof import("../../components/crm/CrmMeetingCalendar.vue")['default']>
  LazyCrmMeetingCalendarSync: LazyComponent<typeof import("../../components/crm/CrmMeetingCalendarSync.vue")['default']>
  LazyCrmMeetingGuests: LazyComponent<typeof import("../../components/crm/CrmMeetingGuests.vue")['default']>
  LazyCrmNotificationCenter: LazyComponent<typeof import("../../components/crm/CrmNotificationCenter.vue")['default']>
  LazyCrmOrderAdjustments: LazyComponent<typeof import("../../components/crm/CrmOrderAdjustments.vue")['default']>
  LazyCrmOrderExecution: LazyComponent<typeof import("../../components/crm/CrmOrderExecution.vue")['default']>
  LazyCrmOrderFinance: LazyComponent<typeof import("../../components/crm/CrmOrderFinance.vue")['default']>
  LazyCrmOrdersRegister: LazyComponent<typeof import("../../components/crm/CrmOrdersRegister.vue")['default']>
  LazyCrmReceivables: LazyComponent<typeof import("../../components/crm/CrmReceivables.vue")['default']>
  LazyCrmSchedulePatterns: LazyComponent<typeof import("../../components/crm/CrmSchedulePatterns.vue")['default']>
  LazyCrmSectionNavigation: LazyComponent<typeof import("../../components/crm/CrmSectionNavigation.vue")['default']>
  LazyCrmShell: LazyComponent<typeof import("../../components/crm/CrmShell.vue")['default']>
  LazyCrmTaskPipelineEditor: LazyComponent<typeof import("../../components/crm/CrmTaskPipelineEditor.vue")['default']>
  LazyCrmThemeToggle: LazyComponent<typeof import("../../components/crm/CrmThemeToggle.vue")['default']>
  LazyCrmTimeCorrections: LazyComponent<typeof import("../../components/crm/CrmTimeCorrections.vue")['default']>
  LazyCrmTimesheet: LazyComponent<typeof import("../../components/crm/CrmTimesheet.vue")['default']>
  LazyCrmWorkClock: LazyComponent<typeof import("../../components/crm/CrmWorkClock.vue")['default']>
  LazyNailArt: LazyComponent<typeof import("../../components/sarkisian-studio/NailArt.vue")['default']>
  LazyNailFinish: LazyComponent<typeof import("../../components/sarkisian-studio/NailFinish.vue")['default']>
  LazyNailPhotoLighting: LazyComponent<typeof import("../../components/sarkisian-studio/NailPhotoLighting.vue")['default']>
  LazySarkisianStudio: LazyComponent<typeof import("../../components/sarkisian-studio/SarkisianStudio.vue")['default']>
  LazyAnatomy: LazyComponent<typeof import("../../components/sarkisian-studio/anatomy")['default']>
  LazyDesignPalette: LazyComponent<typeof import("../../components/sarkisian-studio/atelier/DesignPalette.vue")['default']>
  LazyFinishGame: LazyComponent<typeof import("../../components/sarkisian-studio/atelier/FinishGame.vue")['default']>
  LazyKeriPortrait: LazyComponent<typeof import("../../components/sarkisian-studio/atelier/KeriPortrait.vue")['default']>
  LazyMaterialShelf: LazyComponent<typeof import("../../components/sarkisian-studio/atelier/MaterialShelf.vue")['default']>
  LazyNailFit: LazyComponent<typeof import("../../components/sarkisian-studio/atelier/NailFit.vue")['default']>
  LazyNailPreparation: LazyComponent<typeof import("../../components/sarkisian-studio/atelier/NailPreparation.vue")['default']>
  LazyRewardShop: LazyComponent<typeof import("../../components/sarkisian-studio/atelier/RewardShop.vue")['default']>
  LazyShiftGoals: LazyComponent<typeof import("../../components/sarkisian-studio/atelier/ShiftGoals.vue")['default']>
  LazyStudioClock: LazyComponent<typeof import("../../components/sarkisian-studio/atelier/StudioClock.vue")['default']>
  LazyStudioScene: LazyComponent<typeof import("../../components/sarkisian-studio/atelier/StudioScene.vue")['default']>
  LazyStudioTool: LazyComponent<typeof import("../../components/sarkisian-studio/atelier/StudioTool.vue")['default']>
  LazySupplyMark: LazyComponent<typeof import("../../components/sarkisian-studio/atelier/SupplyMark.vue")['default']>
  LazyPreparation: LazyComponent<typeof import("../../components/sarkisian-studio/atelier/preparation")['default']>
  LazyProgression: LazyComponent<typeof import("../../components/sarkisian-studio/atelier/progression")['default']>
  LazySupplies: LazyComponent<typeof import("../../components/sarkisian-studio/atelier/supplies")['default']>
  LazyAppearance: LazyComponent<typeof import("../../components/sarkisian-studio/character/appearance")['default']>
  LazyKeriAvatar: LazyComponent<typeof import("../../components/sarkisian-studio/keri/KeriAvatar.vue")['default']>
  LazyKeriChoice: LazyComponent<typeof import("../../components/sarkisian-studio/keri/KeriChoice.vue")['default']>
  LazyKeriWardrobe: LazyComponent<typeof import("../../components/sarkisian-studio/keri/KeriWardrobe.vue")['default']>
  LazyClothing: LazyComponent<typeof import("../../components/sarkisian-studio/keri/clothing")['default']>
  LazyLook: LazyComponent<typeof import("../../components/sarkisian-studio/keri/look")['default']>
  LazyMakeup: LazyComponent<typeof import("../../components/sarkisian-studio/keri/makeup")['default']>
  LazyRender: LazyComponent<typeof import("../../components/sarkisian-studio/keri/render")['default']>
  LazyStyling: LazyComponent<typeof import("../../components/sarkisian-studio/keri/styling")['default']>
  LazyManicureCatalog: LazyComponent<typeof import("../../components/sarkisian-studio/manicure-catalog")['default']>
  LazyModel: LazyComponent<typeof import("../../components/sarkisian-studio/model")['default']>
  LazyNailArtGeometry: LazyComponent<typeof import("../../components/sarkisian-studio/nail-art-geometry")['default']>
  LazyNailEffects: LazyComponent<typeof import("../../components/sarkisian-studio/nail-effects")['default']>
  LazyNailShapes: LazyComponent<typeof import("../../components/sarkisian-studio/nail-shapes")['default']>
  LazyPhotoLighting: LazyComponent<typeof import("../../components/sarkisian-studio/photo-lighting")['default']>
  LazyProductCard: LazyComponent<typeof import("../../components/storefront/ProductCard.vue")['default']>
  LazySiteAboutPage: LazyComponent<typeof import("../../components/storefront/SiteAboutPage.vue")['default']>
  LazySiteAccountAddresses: LazyComponent<typeof import("../../components/storefront/SiteAccountAddresses.vue")['default']>
  LazySiteAccountDashboard: LazyComponent<typeof import("../../components/storefront/SiteAccountDashboard.vue")['default']>
  LazySiteAccountDrawer: LazyComponent<typeof import("../../components/storefront/SiteAccountDrawer.vue")['default']>
  LazySiteAccountGiftCards: LazyComponent<typeof import("../../components/storefront/SiteAccountGiftCards.vue")['default']>
  LazySiteAccountNotifications: LazyComponent<typeof import("../../components/storefront/SiteAccountNotifications.vue")['default']>
  LazySiteAccountOrders: LazyComponent<typeof import("../../components/storefront/SiteAccountOrders.vue")['default']>
  LazySiteAccountProfile: LazyComponent<typeof import("../../components/storefront/SiteAccountProfile.vue")['default']>
  LazySiteAuthDrawer: LazyComponent<typeof import("../../components/storefront/SiteAuthDrawer.vue")['default']>
  LazySiteBloggersPage: LazyComponent<typeof import("../../components/storefront/SiteBloggersPage.vue")['default']>
  LazySiteBusinessPage: LazyComponent<typeof import("../../components/storefront/SiteBusinessPage.vue")['default']>
  LazySiteBusinessPreview: LazyComponent<typeof import("../../components/storefront/SiteBusinessPreview.vue")['default']>
  LazySiteBusinessRegistrationDrawer: LazyComponent<typeof import("../../components/storefront/SiteBusinessRegistrationDrawer.vue")['default']>
  LazySiteCartBadge: LazyComponent<typeof import("../../components/storefront/SiteCartBadge.vue")['default']>
  LazySiteCartDrawer: LazyComponent<typeof import("../../components/storefront/SiteCartDrawer.vue")['default']>
  LazySiteCartRecommendations: LazyComponent<typeof import("../../components/storefront/SiteCartRecommendations.vue")['default']>
  LazySiteCartSuggestion: LazyComponent<typeof import("../../components/storefront/SiteCartSuggestion.vue")['default']>
  LazySiteCatalogDesignFilters: LazyComponent<typeof import("../../components/storefront/SiteCatalogDesignFilters.vue")['default']>
  LazySiteCatalogDrawer: LazyComponent<typeof import("../../components/storefront/SiteCatalogDrawer.vue")['default']>
  LazySiteCatalogFilters: LazyComponent<typeof import("../../components/storefront/SiteCatalogFilters.vue")['default']>
  LazySiteCatalogMenuEditor: LazyComponent<typeof import("../../components/storefront/SiteCatalogMenuEditor.vue")['default']>
  LazySiteCatalogPage: LazyComponent<typeof import("../../components/storefront/SiteCatalogPage.vue")['default']>
  LazySiteCategoriesEditor: LazyComponent<typeof import("../../components/storefront/SiteCategoriesEditor.vue")['default']>
  LazySiteCheckout: LazyComponent<typeof import("../../components/storefront/SiteCheckout.vue")['default']>
  LazySiteClubBlock: LazyComponent<typeof import("../../components/storefront/SiteClubBlock.vue")['default']>
  LazySiteClubHub: LazyComponent<typeof import("../../components/storefront/SiteClubHub.vue")['default']>
  LazySiteClubReferral: LazyComponent<typeof import("../../components/storefront/SiteClubReferral.vue")['default']>
  LazySiteClubReferralStack: LazyComponent<typeof import("../../components/storefront/SiteClubReferralStack.vue")['default']>
  LazySiteClubReferralsPage: LazyComponent<typeof import("../../components/storefront/SiteClubReferralsPage.vue")['default']>
  LazySiteContactForm: LazyComponent<typeof import("../../components/storefront/SiteContactForm.vue")['default']>
  LazySiteContentEditor: LazyComponent<typeof import("../../components/storefront/SiteContentEditor.vue")['default']>
  LazySiteContentPage: LazyComponent<typeof import("../../components/storefront/SiteContentPage.vue")['default']>
  LazySiteFavoritesDrawer: LazyComponent<typeof import("../../components/storefront/SiteFavoritesDrawer.vue")['default']>
  LazySiteFloatingActions: LazyComponent<typeof import("../../components/storefront/SiteFloatingActions.vue")['default']>
  LazySiteFooter: LazyComponent<typeof import("../../components/storefront/SiteFooter.vue")['default']>
  LazySiteFounderBiography: LazyComponent<typeof import("../../components/storefront/SiteFounderBiography.vue")['default']>
  LazySiteGiftCardsEditor: LazyComponent<typeof import("../../components/storefront/SiteGiftCardsEditor.vue")['default']>
  LazySiteHeader: LazyComponent<typeof import("../../components/storefront/SiteHeader.vue")['default']>
  LazySiteHomeCourses: LazyComponent<typeof import("../../components/storefront/SiteHomeCourses.vue")['default']>
  LazySiteHomeEffects: LazyComponent<typeof import("../../components/storefront/SiteHomeEffects.vue")['default']>
  LazySiteHomeFooter: LazyComponent<typeof import("../../components/storefront/SiteHomeFooter.vue")['default']>
  LazySiteHomeNavigation: LazyComponent<typeof import("../../components/storefront/SiteHomeNavigation.vue")['default']>
  LazySiteHomeRegion: LazyComponent<typeof import("../../components/storefront/SiteHomeRegion.vue")['default']>
  LazySiteLoyaltyPreview: LazyComponent<typeof import("../../components/storefront/SiteLoyaltyPreview.vue")['default']>
  LazySiteMenuDrawer: LazyComponent<typeof import("../../components/storefront/SiteMenuDrawer.vue")['default']>
  LazySiteMenuLink: LazyComponent<typeof import("../../components/storefront/SiteMenuLink.vue")['default']>
  LazySitePageArt: LazyComponent<typeof import("../../components/storefront/SitePageArt.vue")['default']>
  LazySitePagesEditor: LazyComponent<typeof import("../../components/storefront/SitePagesEditor.vue")['default']>
  LazySitePartnerAccount: LazyComponent<typeof import("../../components/storefront/SitePartnerAccount.vue")['default']>
  LazySitePartnerLink: LazyComponent<typeof import("../../components/storefront/SitePartnerLink.vue")['default']>
  LazySitePartnershipBlock: LazyComponent<typeof import("../../components/storefront/SitePartnershipBlock.vue")['default']>
  LazySitePartnershipPage: LazyComponent<typeof import("../../components/storefront/SitePartnershipPage.vue")['default']>
  LazySitePartnershipScene: LazyComponent<typeof import("../../components/storefront/SitePartnershipScene.vue")['default']>
  LazySiteProductBadgesEditor: LazyComponent<typeof import("../../components/storefront/SiteProductBadgesEditor.vue")['default']>
  LazySiteProductPage: LazyComponent<typeof import("../../components/storefront/SiteProductPage.vue")['default']>
  LazySitePromoCodesEditor: LazyComponent<typeof import("../../components/storefront/SitePromoCodesEditor.vue")['default']>
  LazySiteQuantityControl: LazyComponent<typeof import("../../components/storefront/SiteQuantityControl.vue")['default']>
  LazySiteShell: LazyComponent<typeof import("../../components/storefront/SiteShell.vue")['default']>
  LazySiteSocialLoginButtons: LazyComponent<typeof import("../../components/storefront/SiteSocialLoginButtons.vue")['default']>
  LazyChannelsWorkspacePage: LazyComponent<typeof import("../../components/workspace/ChannelsWorkspacePage.vue")['default']>
  LazyContactMessagesWorkspace: LazyComponent<typeof import("../../components/workspace/ContactMessagesWorkspace.vue")['default']>
  LazyMarketplaceExchangePanel: LazyComponent<typeof import("../../components/workspace/MarketplaceExchangePanel.vue")['default']>
  LazyPartnerDocumentsSettingsPage: LazyComponent<typeof import("../../components/workspace/PartnerDocumentsSettingsPage.vue")['default']>
  LazyPartnerGiftsPage: LazyComponent<typeof import("../../components/workspace/PartnerGiftsPage.vue")['default']>
  LazyPartnerLegalEntitiesPage: LazyComponent<typeof import("../../components/workspace/PartnerLegalEntitiesPage.vue")['default']>
  LazyPartnerWorkspacePage: LazyComponent<typeof import("../../components/workspace/PartnerWorkspacePage.vue")['default']>
  LazyReportsWorkspacePage: LazyComponent<typeof import("../../components/workspace/ReportsWorkspacePage.vue")['default']>
  LazySalonSubscriptionSettings: LazyComponent<typeof import("../../components/workspace/SalonSubscriptionSettings.vue")['default']>
  LazyStoreDashboard: LazyComponent<typeof import("../../components/workspace/StoreDashboard.vue")['default']>
  LazyStoreWorkspacePage: LazyComponent<typeof import("../../components/workspace/StoreWorkspacePage.vue")['default']>
  LazySupportWorkspacePage: LazyComponent<typeof import("../../components/workspace/SupportWorkspacePage.vue")['default']>
  LazySystemWorkspacePage: LazyComponent<typeof import("../../components/workspace/SystemWorkspacePage.vue")['default']>
  /**
   * Lazy-loaded version of `<NuxtWelcome>`.
   *
   * Displays the welcome screen used by new Nuxt projects.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-welcome
   */
  LazyNuxtWelcome: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/welcome.vue")['default']>
  /**
   * Lazy-loaded version of `<NuxtLayout>`.
   *
   * Renders the selected layout around pages or error content.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-layout
   */
  LazyNuxtLayout: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
  /**
   * Lazy-loaded version of `<NuxtErrorBoundary>`.
   *
   * Catches client-side errors from its default slot and renders an error slot.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-error-boundary
   */
  LazyNuxtErrorBoundary: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
  /**
   * Lazy-loaded version of `<ClientOnly>`.
   *
   * Renders its default slot only on the client, with an optional server fallback.
   *
   * @see https://nuxt.com/docs/4.x/api/components/client-only
   */
  LazyClientOnly: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/client-only")['default']>
  /**
   * Lazy-loaded version of `<DevOnly>`.
   *
   * Renders its content only during development.
   *
   * @see https://nuxt.com/docs/4.x/api/components/dev-only
   */
  LazyDevOnly: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/dev-only")['default']>
  LazyServerPlaceholder: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
  /**
   * Lazy-loaded version of `<NuxtLink>`.
   *
   * A drop-in replacement for Vue Router's `<RouterLink>` and the HTML `<a>` element.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-link
   */
  LazyNuxtLink: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-link")['default']>
  /**
   * Lazy-loaded version of `<NuxtLoadingIndicator>`.
   *
   * Displays a progress bar during page navigation.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-loading-indicator
   */
  LazyNuxtLoadingIndicator: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
  /**
   * Lazy-loaded version of `<NuxtTime>`.
   *
   * Formats dates and times consistently across server and client using the user's locale.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-time
   */
  LazyNuxtTime: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
  /**
   * Lazy-loaded version of `<NuxtRouteAnnouncer>`.
   *
   * Announces route changes to assistive technologies using the current page title.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-route-announcer
   */
  LazyNuxtRouteAnnouncer: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
  /**
   * Lazy-loaded version of `<NuxtAnnouncer>`.
   *
   * Announces dynamic content changes to assistive technologies.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-announcer
   */
  LazyNuxtAnnouncer: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-announcer")['default']>
  /**
   * Lazy-loaded version of `<NuxtImg>`.
   *
   * Renders an optimized image through the Nuxt Image module.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-img
   */
  LazyNuxtImg: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']>
  /**
   * Lazy-loaded version of `<NuxtPicture>`.
   *
   * Renders responsive optimized images through the Nuxt Image module.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-picture
   */
  LazyNuxtPicture: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']>
  /**
   * Lazy-loaded version of `<NuxtPage>`.
   *
   * Renders the current page from the `pages/` directory.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-page
   */
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
  /**
   * Lazy-loaded version of `<NuxtIsland>`.
   *
   * Renders a non-interactive server component without shipping client-side JavaScript.
   *
   * @see https://nuxt.com/docs/4.x/api/components/nuxt-island
   */
  LazyNuxtIsland: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-island")['default']>
}

declare module 'vue' {
  export interface GlobalComponents extends _GlobalComponents { }
}

export {}
