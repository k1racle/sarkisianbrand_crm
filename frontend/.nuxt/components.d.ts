
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


export const AdminMediaBrowser: typeof import("../components/AdminMediaBrowser.vue")['default']
export const AdminMediaPicker: typeof import("../components/AdminMediaPicker.vue")['default']
export const AdminNewProduct: typeof import("../components/AdminNewProduct.vue")['default']
export const AdminOrderDrawer: typeof import("../components/AdminOrderDrawer.vue")['default']
export const AdminProductEditor: typeof import("../components/AdminProductEditor.vue")['default']
export const B2BPortalRail: typeof import("../components/B2BPortalRail.vue")['default']
export const BotCommandsSettings: typeof import("../components/BotCommandsSettings.vue")['default']
export const BusinessCatalog: typeof import("../components/BusinessCatalog.vue")['default']
export const BusinessOrders: typeof import("../components/BusinessOrders.vue")['default']
export const BusinessPurchasesDashboard: typeof import("../components/BusinessPurchasesDashboard.vue")['default']
export const BusinessSettings: typeof import("../components/BusinessSettings.vue")['default']
export const BusinessToolbar: typeof import("../components/BusinessToolbar.vue")['default']
export const ConsoleRail: typeof import("../components/ConsoleRail.vue")['default']
export const CrmAccountManagerField: typeof import("../components/CrmAccountManagerField.vue")['default']
export const CrmCardComments: typeof import("../components/CrmCardComments.vue")['default']
export const CrmCardTabs: typeof import("../components/CrmCardTabs.vue")['default']
export const CrmChangeHistory: typeof import("../components/CrmChangeHistory.vue")['default']
export const CrmDrivePicker: typeof import("../components/CrmDrivePicker.vue")['default']
export const CrmDriveThumbnail: typeof import("../components/CrmDriveThumbnail.vue")['default']
export const CrmFilePreview: typeof import("../components/CrmFilePreview.vue")['default']
export const CrmLeadTasks: typeof import("../components/CrmLeadTasks.vue")['default']
export const CrmPdfViewer: typeof import("../components/CrmPdfViewer.vue")['default']
export const CrmPipelineSettings: typeof import("../components/CrmPipelineSettings.vue")['default']
export const CrmStockRules: typeof import("../components/CrmStockRules.vue")['default']
export const CrmSubtasks: typeof import("../components/CrmSubtasks.vue")['default']
export const CrmTaskAutomation: typeof import("../components/CrmTaskAutomation.vue")['default']
export const CrmTaskFiles: typeof import("../components/CrmTaskFiles.vue")['default']
export const CrmTaskParticipants: typeof import("../components/CrmTaskParticipants.vue")['default']
export const CrmTaskPeoplePicker: typeof import("../components/CrmTaskPeoplePicker.vue")['default']
export const EcosystemAccounts: typeof import("../components/EcosystemAccounts.vue")['default']
export const EcosystemIntegrations: typeof import("../components/EcosystemIntegrations.vue")['default']
export const EcosystemTrash: typeof import("../components/EcosystemTrash.vue")['default']
export const IntegrationBrandLogo: typeof import("../components/IntegrationBrandLogo.vue")['default']
export const PlatformChatDrawer: typeof import("../components/PlatformChatDrawer.vue")['default']
export const SalonBookingForm: typeof import("../components/SalonBookingForm.vue")['default']
export const SalonBookingHistory: typeof import("../components/SalonBookingHistory.vue")['default']
export const SalonCalendar: typeof import("../components/SalonCalendar.vue")['default']
export const SalonClients: typeof import("../components/SalonClients.vue")['default']
export const SalonDashboard: typeof import("../components/SalonDashboard.vue")['default']
export const SalonOnlineBookingSettings: typeof import("../components/SalonOnlineBookingSettings.vue")['default']
export const SalonOrganizationCard: typeof import("../components/SalonOrganizationCard.vue")['default']
export const SalonPresentationSettings: typeof import("../components/SalonPresentationSettings.vue")['default']
export const SalonServices: typeof import("../components/SalonServices.vue")['default']
export const SalonTeam: typeof import("../components/SalonTeam.vue")['default']
export const SalonWeeklySchedule: typeof import("../components/SalonWeeklySchedule.vue")['default']
export const TaskReminderCenter: typeof import("../components/TaskReminderCenter.vue")['default']
export const UserProfileDrawer: typeof import("../components/UserProfileDrawer.vue")['default']
export const WorkspaceContextMenu: typeof import("../components/WorkspaceContextMenu.vue")['default']
export const WorkspaceLoading: typeof import("../components/WorkspaceLoading.vue")['default']
export const WorkspaceOrdersTable: typeof import("../components/WorkspaceOrdersTable.vue")['default']
export const WorkspaceOverview: typeof import("../components/WorkspaceOverview.vue")['default']
export const WorkspaceSectionIcon: typeof import("../components/WorkspaceSectionIcon.vue")['default']
export const WorkspaceToolbar: typeof import("../components/WorkspaceToolbar.vue")['default']
export const CrmAccessBoundary: typeof import("../components/crm/CrmAccessBoundary.vue")['default']
export const CrmAccessProfiles: typeof import("../components/crm/CrmAccessProfiles.vue")['default']
export const CrmDayWidget: typeof import("../components/crm/CrmDayWidget.vue")['default']
export const CrmDensityToggle: typeof import("../components/crm/CrmDensityToggle.vue")['default']
export const CrmEmployeeAccessReview: typeof import("../components/crm/CrmEmployeeAccessReview.vue")['default']
export const CrmInstallButton: typeof import("../components/crm/CrmInstallButton.vue")['default']
export const CrmKnowledgeBase: typeof import("../components/crm/CrmKnowledgeBase.vue")['default']
export const CrmMarketplaceMapping: typeof import("../components/crm/CrmMarketplaceMapping.vue")['default']
export const CrmMeetingCalendar: typeof import("../components/crm/CrmMeetingCalendar.vue")['default']
export const CrmMeetingCalendarSync: typeof import("../components/crm/CrmMeetingCalendarSync.vue")['default']
export const CrmMeetingGuests: typeof import("../components/crm/CrmMeetingGuests.vue")['default']
export const CrmNotificationCenter: typeof import("../components/crm/CrmNotificationCenter.vue")['default']
export const CrmOrderAdjustments: typeof import("../components/crm/CrmOrderAdjustments.vue")['default']
export const CrmOrderExecution: typeof import("../components/crm/CrmOrderExecution.vue")['default']
export const CrmOrderFinance: typeof import("../components/crm/CrmOrderFinance.vue")['default']
export const CrmOrdersRegister: typeof import("../components/crm/CrmOrdersRegister.vue")['default']
export const CrmReceivables: typeof import("../components/crm/CrmReceivables.vue")['default']
export const CrmSchedulePatterns: typeof import("../components/crm/CrmSchedulePatterns.vue")['default']
export const CrmSectionNavigation: typeof import("../components/crm/CrmSectionNavigation.vue")['default']
export const CrmShell: typeof import("../components/crm/CrmShell.vue")['default']
export const CrmTaskPipelineEditor: typeof import("../components/crm/CrmTaskPipelineEditor.vue")['default']
export const CrmThemeToggle: typeof import("../components/crm/CrmThemeToggle.vue")['default']
export const CrmTimeCorrections: typeof import("../components/crm/CrmTimeCorrections.vue")['default']
export const CrmTimesheet: typeof import("../components/crm/CrmTimesheet.vue")['default']
export const CrmWorkClock: typeof import("../components/crm/CrmWorkClock.vue")['default']
export const NailArt: typeof import("../components/sarkisian-studio/NailArt.vue")['default']
export const NailFinish: typeof import("../components/sarkisian-studio/NailFinish.vue")['default']
export const NailPhotoLighting: typeof import("../components/sarkisian-studio/NailPhotoLighting.vue")['default']
export const SarkisianStudio: typeof import("../components/sarkisian-studio/SarkisianStudio.vue")['default']
export const Anatomy: typeof import("../components/sarkisian-studio/anatomy")['default']
export const DesignPalette: typeof import("../components/sarkisian-studio/atelier/DesignPalette.vue")['default']
export const FinishGame: typeof import("../components/sarkisian-studio/atelier/FinishGame.vue")['default']
export const KeriPortrait: typeof import("../components/sarkisian-studio/atelier/KeriPortrait.vue")['default']
export const MaterialShelf: typeof import("../components/sarkisian-studio/atelier/MaterialShelf.vue")['default']
export const NailFit: typeof import("../components/sarkisian-studio/atelier/NailFit.vue")['default']
export const NailPreparation: typeof import("../components/sarkisian-studio/atelier/NailPreparation.vue")['default']
export const RewardShop: typeof import("../components/sarkisian-studio/atelier/RewardShop.vue")['default']
export const ShiftGoals: typeof import("../components/sarkisian-studio/atelier/ShiftGoals.vue")['default']
export const StudioClock: typeof import("../components/sarkisian-studio/atelier/StudioClock.vue")['default']
export const StudioScene: typeof import("../components/sarkisian-studio/atelier/StudioScene.vue")['default']
export const StudioTool: typeof import("../components/sarkisian-studio/atelier/StudioTool.vue")['default']
export const SupplyMark: typeof import("../components/sarkisian-studio/atelier/SupplyMark.vue")['default']
export const Preparation: typeof import("../components/sarkisian-studio/atelier/preparation")['default']
export const Progression: typeof import("../components/sarkisian-studio/atelier/progression")['default']
export const Supplies: typeof import("../components/sarkisian-studio/atelier/supplies")['default']
export const Appearance: typeof import("../components/sarkisian-studio/character/appearance")['default']
export const KeriAvatar: typeof import("../components/sarkisian-studio/keri/KeriAvatar.vue")['default']
export const KeriChoice: typeof import("../components/sarkisian-studio/keri/KeriChoice.vue")['default']
export const KeriWardrobe: typeof import("../components/sarkisian-studio/keri/KeriWardrobe.vue")['default']
export const Clothing: typeof import("../components/sarkisian-studio/keri/clothing")['default']
export const Look: typeof import("../components/sarkisian-studio/keri/look")['default']
export const Makeup: typeof import("../components/sarkisian-studio/keri/makeup")['default']
export const Render: typeof import("../components/sarkisian-studio/keri/render")['default']
export const Styling: typeof import("../components/sarkisian-studio/keri/styling")['default']
export const ManicureCatalog: typeof import("../components/sarkisian-studio/manicure-catalog")['default']
export const Model: typeof import("../components/sarkisian-studio/model")['default']
export const NailArtGeometry: typeof import("../components/sarkisian-studio/nail-art-geometry")['default']
export const NailEffects: typeof import("../components/sarkisian-studio/nail-effects")['default']
export const NailShapes: typeof import("../components/sarkisian-studio/nail-shapes")['default']
export const PhotoLighting: typeof import("../components/sarkisian-studio/photo-lighting")['default']
export const ProductCard: typeof import("../components/storefront/ProductCard.vue")['default']
export const SiteAboutPage: typeof import("../components/storefront/SiteAboutPage.vue")['default']
export const SiteAccountAddresses: typeof import("../components/storefront/SiteAccountAddresses.vue")['default']
export const SiteAccountDashboard: typeof import("../components/storefront/SiteAccountDashboard.vue")['default']
export const SiteAccountDrawer: typeof import("../components/storefront/SiteAccountDrawer.vue")['default']
export const SiteAccountGiftCards: typeof import("../components/storefront/SiteAccountGiftCards.vue")['default']
export const SiteAccountNotifications: typeof import("../components/storefront/SiteAccountNotifications.vue")['default']
export const SiteAccountOrders: typeof import("../components/storefront/SiteAccountOrders.vue")['default']
export const SiteAccountProfile: typeof import("../components/storefront/SiteAccountProfile.vue")['default']
export const SiteAuthDrawer: typeof import("../components/storefront/SiteAuthDrawer.vue")['default']
export const SiteBloggersPage: typeof import("../components/storefront/SiteBloggersPage.vue")['default']
export const SiteBusinessPage: typeof import("../components/storefront/SiteBusinessPage.vue")['default']
export const SiteBusinessPreview: typeof import("../components/storefront/SiteBusinessPreview.vue")['default']
export const SiteBusinessRegistrationDrawer: typeof import("../components/storefront/SiteBusinessRegistrationDrawer.vue")['default']
export const SiteCartBadge: typeof import("../components/storefront/SiteCartBadge.vue")['default']
export const SiteCartDrawer: typeof import("../components/storefront/SiteCartDrawer.vue")['default']
export const SiteCartRecommendations: typeof import("../components/storefront/SiteCartRecommendations.vue")['default']
export const SiteCartSuggestion: typeof import("../components/storefront/SiteCartSuggestion.vue")['default']
export const SiteCatalogDesignFilters: typeof import("../components/storefront/SiteCatalogDesignFilters.vue")['default']
export const SiteCatalogDrawer: typeof import("../components/storefront/SiteCatalogDrawer.vue")['default']
export const SiteCatalogFilters: typeof import("../components/storefront/SiteCatalogFilters.vue")['default']
export const SiteCatalogMenuEditor: typeof import("../components/storefront/SiteCatalogMenuEditor.vue")['default']
export const SiteCatalogPage: typeof import("../components/storefront/SiteCatalogPage.vue")['default']
export const SiteCategoriesEditor: typeof import("../components/storefront/SiteCategoriesEditor.vue")['default']
export const SiteCheckout: typeof import("../components/storefront/SiteCheckout.vue")['default']
export const SiteClubBlock: typeof import("../components/storefront/SiteClubBlock.vue")['default']
export const SiteClubHub: typeof import("../components/storefront/SiteClubHub.vue")['default']
export const SiteClubReferral: typeof import("../components/storefront/SiteClubReferral.vue")['default']
export const SiteClubReferralStack: typeof import("../components/storefront/SiteClubReferralStack.vue")['default']
export const SiteClubReferralsPage: typeof import("../components/storefront/SiteClubReferralsPage.vue")['default']
export const SiteContactForm: typeof import("../components/storefront/SiteContactForm.vue")['default']
export const SiteContentEditor: typeof import("../components/storefront/SiteContentEditor.vue")['default']
export const SiteContentPage: typeof import("../components/storefront/SiteContentPage.vue")['default']
export const SiteFavoritesDrawer: typeof import("../components/storefront/SiteFavoritesDrawer.vue")['default']
export const SiteFloatingActions: typeof import("../components/storefront/SiteFloatingActions.vue")['default']
export const SiteFooter: typeof import("../components/storefront/SiteFooter.vue")['default']
export const SiteFounderBiography: typeof import("../components/storefront/SiteFounderBiography.vue")['default']
export const SiteGiftCardsEditor: typeof import("../components/storefront/SiteGiftCardsEditor.vue")['default']
export const SiteHeader: typeof import("../components/storefront/SiteHeader.vue")['default']
export const SiteHomeCourses: typeof import("../components/storefront/SiteHomeCourses.vue")['default']
export const SiteHomeEffects: typeof import("../components/storefront/SiteHomeEffects.vue")['default']
export const SiteHomeFooter: typeof import("../components/storefront/SiteHomeFooter.vue")['default']
export const SiteHomeNavigation: typeof import("../components/storefront/SiteHomeNavigation.vue")['default']
export const SiteHomeRegion: typeof import("../components/storefront/SiteHomeRegion.vue")['default']
export const SiteLoyaltyPreview: typeof import("../components/storefront/SiteLoyaltyPreview.vue")['default']
export const SiteMenuDrawer: typeof import("../components/storefront/SiteMenuDrawer.vue")['default']
export const SiteMenuLink: typeof import("../components/storefront/SiteMenuLink.vue")['default']
export const SitePageArt: typeof import("../components/storefront/SitePageArt.vue")['default']
export const SitePagesEditor: typeof import("../components/storefront/SitePagesEditor.vue")['default']
export const SitePartnerAccount: typeof import("../components/storefront/SitePartnerAccount.vue")['default']
export const SitePartnerLink: typeof import("../components/storefront/SitePartnerLink.vue")['default']
export const SitePartnershipBlock: typeof import("../components/storefront/SitePartnershipBlock.vue")['default']
export const SitePartnershipPage: typeof import("../components/storefront/SitePartnershipPage.vue")['default']
export const SitePartnershipScene: typeof import("../components/storefront/SitePartnershipScene.vue")['default']
export const SiteProductBadgesEditor: typeof import("../components/storefront/SiteProductBadgesEditor.vue")['default']
export const SiteProductPage: typeof import("../components/storefront/SiteProductPage.vue")['default']
export const SitePromoCodesEditor: typeof import("../components/storefront/SitePromoCodesEditor.vue")['default']
export const SiteQuantityControl: typeof import("../components/storefront/SiteQuantityControl.vue")['default']
export const SiteShell: typeof import("../components/storefront/SiteShell.vue")['default']
export const SiteSocialLoginButtons: typeof import("../components/storefront/SiteSocialLoginButtons.vue")['default']
export const ChannelsWorkspacePage: typeof import("../components/workspace/ChannelsWorkspacePage.vue")['default']
export const ContactMessagesWorkspace: typeof import("../components/workspace/ContactMessagesWorkspace.vue")['default']
export const MarketplaceExchangePanel: typeof import("../components/workspace/MarketplaceExchangePanel.vue")['default']
export const PartnerDocumentsSettingsPage: typeof import("../components/workspace/PartnerDocumentsSettingsPage.vue")['default']
export const PartnerGiftsPage: typeof import("../components/workspace/PartnerGiftsPage.vue")['default']
export const PartnerLegalEntitiesPage: typeof import("../components/workspace/PartnerLegalEntitiesPage.vue")['default']
export const PartnerWorkspacePage: typeof import("../components/workspace/PartnerWorkspacePage.vue")['default']
export const ReportsWorkspacePage: typeof import("../components/workspace/ReportsWorkspacePage.vue")['default']
export const SalonSubscriptionSettings: typeof import("../components/workspace/SalonSubscriptionSettings.vue")['default']
export const StoreDashboard: typeof import("../components/workspace/StoreDashboard.vue")['default']
export const StoreWorkspacePage: typeof import("../components/workspace/StoreWorkspacePage.vue")['default']
export const SupportWorkspacePage: typeof import("../components/workspace/SupportWorkspacePage.vue")['default']
export const SystemWorkspacePage: typeof import("../components/workspace/SystemWorkspacePage.vue")['default']
/**
 * Displays the welcome screen used by new Nuxt projects.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-welcome
 */
export const NuxtWelcome: typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']
/**
 * Renders the selected layout around pages or error content.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-layout
 */
export const NuxtLayout: typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']
/**
 * Catches client-side errors from its default slot and renders an error slot.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-error-boundary
 */
export const NuxtErrorBoundary: typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
/**
 * Renders its default slot only on the client, with an optional server fallback.
 *
 * @see https://nuxt.com/docs/4.x/api/components/client-only
 */
export const ClientOnly: typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']
/**
 * Renders its content only during development.
 *
 * @see https://nuxt.com/docs/4.x/api/components/dev-only
 */
export const DevOnly: typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']
export const ServerPlaceholder: typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']
/**
 * A drop-in replacement for Vue Router's `<RouterLink>` and the HTML `<a>` element.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-link
 */
export const NuxtLink: typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']
/**
 * Displays a progress bar during page navigation.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-loading-indicator
 */
export const NuxtLoadingIndicator: typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
/**
 * Formats dates and times consistently across server and client using the user's locale.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-time
 */
export const NuxtTime: typeof import("../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
/**
 * Announces route changes to assistive technologies using the current page title.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-route-announcer
 */
export const NuxtRouteAnnouncer: typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
/**
 * Announces dynamic content changes to assistive technologies.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-announcer
 */
export const NuxtAnnouncer: typeof import("../node_modules/nuxt/dist/app/components/nuxt-announcer")['default']
/**
 * Renders an optimized image through the Nuxt Image module.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-img
 */
export const NuxtImg: typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']
/**
 * Renders responsive optimized images through the Nuxt Image module.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-picture
 */
export const NuxtPicture: typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']
/**
 * Renders the current page from the `pages/` directory.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-page
 */
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
/**
 * Renders a non-interactive server component without shipping client-side JavaScript.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-island
 */
export const NuxtIsland: typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']
export const LazyAdminMediaBrowser: LazyComponent<typeof import("../components/AdminMediaBrowser.vue")['default']>
export const LazyAdminMediaPicker: LazyComponent<typeof import("../components/AdminMediaPicker.vue")['default']>
export const LazyAdminNewProduct: LazyComponent<typeof import("../components/AdminNewProduct.vue")['default']>
export const LazyAdminOrderDrawer: LazyComponent<typeof import("../components/AdminOrderDrawer.vue")['default']>
export const LazyAdminProductEditor: LazyComponent<typeof import("../components/AdminProductEditor.vue")['default']>
export const LazyB2BPortalRail: LazyComponent<typeof import("../components/B2BPortalRail.vue")['default']>
export const LazyBotCommandsSettings: LazyComponent<typeof import("../components/BotCommandsSettings.vue")['default']>
export const LazyBusinessCatalog: LazyComponent<typeof import("../components/BusinessCatalog.vue")['default']>
export const LazyBusinessOrders: LazyComponent<typeof import("../components/BusinessOrders.vue")['default']>
export const LazyBusinessPurchasesDashboard: LazyComponent<typeof import("../components/BusinessPurchasesDashboard.vue")['default']>
export const LazyBusinessSettings: LazyComponent<typeof import("../components/BusinessSettings.vue")['default']>
export const LazyBusinessToolbar: LazyComponent<typeof import("../components/BusinessToolbar.vue")['default']>
export const LazyConsoleRail: LazyComponent<typeof import("../components/ConsoleRail.vue")['default']>
export const LazyCrmAccountManagerField: LazyComponent<typeof import("../components/CrmAccountManagerField.vue")['default']>
export const LazyCrmCardComments: LazyComponent<typeof import("../components/CrmCardComments.vue")['default']>
export const LazyCrmCardTabs: LazyComponent<typeof import("../components/CrmCardTabs.vue")['default']>
export const LazyCrmChangeHistory: LazyComponent<typeof import("../components/CrmChangeHistory.vue")['default']>
export const LazyCrmDrivePicker: LazyComponent<typeof import("../components/CrmDrivePicker.vue")['default']>
export const LazyCrmDriveThumbnail: LazyComponent<typeof import("../components/CrmDriveThumbnail.vue")['default']>
export const LazyCrmFilePreview: LazyComponent<typeof import("../components/CrmFilePreview.vue")['default']>
export const LazyCrmLeadTasks: LazyComponent<typeof import("../components/CrmLeadTasks.vue")['default']>
export const LazyCrmPdfViewer: LazyComponent<typeof import("../components/CrmPdfViewer.vue")['default']>
export const LazyCrmPipelineSettings: LazyComponent<typeof import("../components/CrmPipelineSettings.vue")['default']>
export const LazyCrmStockRules: LazyComponent<typeof import("../components/CrmStockRules.vue")['default']>
export const LazyCrmSubtasks: LazyComponent<typeof import("../components/CrmSubtasks.vue")['default']>
export const LazyCrmTaskAutomation: LazyComponent<typeof import("../components/CrmTaskAutomation.vue")['default']>
export const LazyCrmTaskFiles: LazyComponent<typeof import("../components/CrmTaskFiles.vue")['default']>
export const LazyCrmTaskParticipants: LazyComponent<typeof import("../components/CrmTaskParticipants.vue")['default']>
export const LazyCrmTaskPeoplePicker: LazyComponent<typeof import("../components/CrmTaskPeoplePicker.vue")['default']>
export const LazyEcosystemAccounts: LazyComponent<typeof import("../components/EcosystemAccounts.vue")['default']>
export const LazyEcosystemIntegrations: LazyComponent<typeof import("../components/EcosystemIntegrations.vue")['default']>
export const LazyEcosystemTrash: LazyComponent<typeof import("../components/EcosystemTrash.vue")['default']>
export const LazyIntegrationBrandLogo: LazyComponent<typeof import("../components/IntegrationBrandLogo.vue")['default']>
export const LazyPlatformChatDrawer: LazyComponent<typeof import("../components/PlatformChatDrawer.vue")['default']>
export const LazySalonBookingForm: LazyComponent<typeof import("../components/SalonBookingForm.vue")['default']>
export const LazySalonBookingHistory: LazyComponent<typeof import("../components/SalonBookingHistory.vue")['default']>
export const LazySalonCalendar: LazyComponent<typeof import("../components/SalonCalendar.vue")['default']>
export const LazySalonClients: LazyComponent<typeof import("../components/SalonClients.vue")['default']>
export const LazySalonDashboard: LazyComponent<typeof import("../components/SalonDashboard.vue")['default']>
export const LazySalonOnlineBookingSettings: LazyComponent<typeof import("../components/SalonOnlineBookingSettings.vue")['default']>
export const LazySalonOrganizationCard: LazyComponent<typeof import("../components/SalonOrganizationCard.vue")['default']>
export const LazySalonPresentationSettings: LazyComponent<typeof import("../components/SalonPresentationSettings.vue")['default']>
export const LazySalonServices: LazyComponent<typeof import("../components/SalonServices.vue")['default']>
export const LazySalonTeam: LazyComponent<typeof import("../components/SalonTeam.vue")['default']>
export const LazySalonWeeklySchedule: LazyComponent<typeof import("../components/SalonWeeklySchedule.vue")['default']>
export const LazyTaskReminderCenter: LazyComponent<typeof import("../components/TaskReminderCenter.vue")['default']>
export const LazyUserProfileDrawer: LazyComponent<typeof import("../components/UserProfileDrawer.vue")['default']>
export const LazyWorkspaceContextMenu: LazyComponent<typeof import("../components/WorkspaceContextMenu.vue")['default']>
export const LazyWorkspaceLoading: LazyComponent<typeof import("../components/WorkspaceLoading.vue")['default']>
export const LazyWorkspaceOrdersTable: LazyComponent<typeof import("../components/WorkspaceOrdersTable.vue")['default']>
export const LazyWorkspaceOverview: LazyComponent<typeof import("../components/WorkspaceOverview.vue")['default']>
export const LazyWorkspaceSectionIcon: LazyComponent<typeof import("../components/WorkspaceSectionIcon.vue")['default']>
export const LazyWorkspaceToolbar: LazyComponent<typeof import("../components/WorkspaceToolbar.vue")['default']>
export const LazyCrmAccessBoundary: LazyComponent<typeof import("../components/crm/CrmAccessBoundary.vue")['default']>
export const LazyCrmAccessProfiles: LazyComponent<typeof import("../components/crm/CrmAccessProfiles.vue")['default']>
export const LazyCrmDayWidget: LazyComponent<typeof import("../components/crm/CrmDayWidget.vue")['default']>
export const LazyCrmDensityToggle: LazyComponent<typeof import("../components/crm/CrmDensityToggle.vue")['default']>
export const LazyCrmEmployeeAccessReview: LazyComponent<typeof import("../components/crm/CrmEmployeeAccessReview.vue")['default']>
export const LazyCrmInstallButton: LazyComponent<typeof import("../components/crm/CrmInstallButton.vue")['default']>
export const LazyCrmKnowledgeBase: LazyComponent<typeof import("../components/crm/CrmKnowledgeBase.vue")['default']>
export const LazyCrmMarketplaceMapping: LazyComponent<typeof import("../components/crm/CrmMarketplaceMapping.vue")['default']>
export const LazyCrmMeetingCalendar: LazyComponent<typeof import("../components/crm/CrmMeetingCalendar.vue")['default']>
export const LazyCrmMeetingCalendarSync: LazyComponent<typeof import("../components/crm/CrmMeetingCalendarSync.vue")['default']>
export const LazyCrmMeetingGuests: LazyComponent<typeof import("../components/crm/CrmMeetingGuests.vue")['default']>
export const LazyCrmNotificationCenter: LazyComponent<typeof import("../components/crm/CrmNotificationCenter.vue")['default']>
export const LazyCrmOrderAdjustments: LazyComponent<typeof import("../components/crm/CrmOrderAdjustments.vue")['default']>
export const LazyCrmOrderExecution: LazyComponent<typeof import("../components/crm/CrmOrderExecution.vue")['default']>
export const LazyCrmOrderFinance: LazyComponent<typeof import("../components/crm/CrmOrderFinance.vue")['default']>
export const LazyCrmOrdersRegister: LazyComponent<typeof import("../components/crm/CrmOrdersRegister.vue")['default']>
export const LazyCrmReceivables: LazyComponent<typeof import("../components/crm/CrmReceivables.vue")['default']>
export const LazyCrmSchedulePatterns: LazyComponent<typeof import("../components/crm/CrmSchedulePatterns.vue")['default']>
export const LazyCrmSectionNavigation: LazyComponent<typeof import("../components/crm/CrmSectionNavigation.vue")['default']>
export const LazyCrmShell: LazyComponent<typeof import("../components/crm/CrmShell.vue")['default']>
export const LazyCrmTaskPipelineEditor: LazyComponent<typeof import("../components/crm/CrmTaskPipelineEditor.vue")['default']>
export const LazyCrmThemeToggle: LazyComponent<typeof import("../components/crm/CrmThemeToggle.vue")['default']>
export const LazyCrmTimeCorrections: LazyComponent<typeof import("../components/crm/CrmTimeCorrections.vue")['default']>
export const LazyCrmTimesheet: LazyComponent<typeof import("../components/crm/CrmTimesheet.vue")['default']>
export const LazyCrmWorkClock: LazyComponent<typeof import("../components/crm/CrmWorkClock.vue")['default']>
export const LazyNailArt: LazyComponent<typeof import("../components/sarkisian-studio/NailArt.vue")['default']>
export const LazyNailFinish: LazyComponent<typeof import("../components/sarkisian-studio/NailFinish.vue")['default']>
export const LazyNailPhotoLighting: LazyComponent<typeof import("../components/sarkisian-studio/NailPhotoLighting.vue")['default']>
export const LazySarkisianStudio: LazyComponent<typeof import("../components/sarkisian-studio/SarkisianStudio.vue")['default']>
export const LazyAnatomy: LazyComponent<typeof import("../components/sarkisian-studio/anatomy")['default']>
export const LazyDesignPalette: LazyComponent<typeof import("../components/sarkisian-studio/atelier/DesignPalette.vue")['default']>
export const LazyFinishGame: LazyComponent<typeof import("../components/sarkisian-studio/atelier/FinishGame.vue")['default']>
export const LazyKeriPortrait: LazyComponent<typeof import("../components/sarkisian-studio/atelier/KeriPortrait.vue")['default']>
export const LazyMaterialShelf: LazyComponent<typeof import("../components/sarkisian-studio/atelier/MaterialShelf.vue")['default']>
export const LazyNailFit: LazyComponent<typeof import("../components/sarkisian-studio/atelier/NailFit.vue")['default']>
export const LazyNailPreparation: LazyComponent<typeof import("../components/sarkisian-studio/atelier/NailPreparation.vue")['default']>
export const LazyRewardShop: LazyComponent<typeof import("../components/sarkisian-studio/atelier/RewardShop.vue")['default']>
export const LazyShiftGoals: LazyComponent<typeof import("../components/sarkisian-studio/atelier/ShiftGoals.vue")['default']>
export const LazyStudioClock: LazyComponent<typeof import("../components/sarkisian-studio/atelier/StudioClock.vue")['default']>
export const LazyStudioScene: LazyComponent<typeof import("../components/sarkisian-studio/atelier/StudioScene.vue")['default']>
export const LazyStudioTool: LazyComponent<typeof import("../components/sarkisian-studio/atelier/StudioTool.vue")['default']>
export const LazySupplyMark: LazyComponent<typeof import("../components/sarkisian-studio/atelier/SupplyMark.vue")['default']>
export const LazyPreparation: LazyComponent<typeof import("../components/sarkisian-studio/atelier/preparation")['default']>
export const LazyProgression: LazyComponent<typeof import("../components/sarkisian-studio/atelier/progression")['default']>
export const LazySupplies: LazyComponent<typeof import("../components/sarkisian-studio/atelier/supplies")['default']>
export const LazyAppearance: LazyComponent<typeof import("../components/sarkisian-studio/character/appearance")['default']>
export const LazyKeriAvatar: LazyComponent<typeof import("../components/sarkisian-studio/keri/KeriAvatar.vue")['default']>
export const LazyKeriChoice: LazyComponent<typeof import("../components/sarkisian-studio/keri/KeriChoice.vue")['default']>
export const LazyKeriWardrobe: LazyComponent<typeof import("../components/sarkisian-studio/keri/KeriWardrobe.vue")['default']>
export const LazyClothing: LazyComponent<typeof import("../components/sarkisian-studio/keri/clothing")['default']>
export const LazyLook: LazyComponent<typeof import("../components/sarkisian-studio/keri/look")['default']>
export const LazyMakeup: LazyComponent<typeof import("../components/sarkisian-studio/keri/makeup")['default']>
export const LazyRender: LazyComponent<typeof import("../components/sarkisian-studio/keri/render")['default']>
export const LazyStyling: LazyComponent<typeof import("../components/sarkisian-studio/keri/styling")['default']>
export const LazyManicureCatalog: LazyComponent<typeof import("../components/sarkisian-studio/manicure-catalog")['default']>
export const LazyModel: LazyComponent<typeof import("../components/sarkisian-studio/model")['default']>
export const LazyNailArtGeometry: LazyComponent<typeof import("../components/sarkisian-studio/nail-art-geometry")['default']>
export const LazyNailEffects: LazyComponent<typeof import("../components/sarkisian-studio/nail-effects")['default']>
export const LazyNailShapes: LazyComponent<typeof import("../components/sarkisian-studio/nail-shapes")['default']>
export const LazyPhotoLighting: LazyComponent<typeof import("../components/sarkisian-studio/photo-lighting")['default']>
export const LazyProductCard: LazyComponent<typeof import("../components/storefront/ProductCard.vue")['default']>
export const LazySiteAboutPage: LazyComponent<typeof import("../components/storefront/SiteAboutPage.vue")['default']>
export const LazySiteAccountAddresses: LazyComponent<typeof import("../components/storefront/SiteAccountAddresses.vue")['default']>
export const LazySiteAccountDashboard: LazyComponent<typeof import("../components/storefront/SiteAccountDashboard.vue")['default']>
export const LazySiteAccountDrawer: LazyComponent<typeof import("../components/storefront/SiteAccountDrawer.vue")['default']>
export const LazySiteAccountGiftCards: LazyComponent<typeof import("../components/storefront/SiteAccountGiftCards.vue")['default']>
export const LazySiteAccountNotifications: LazyComponent<typeof import("../components/storefront/SiteAccountNotifications.vue")['default']>
export const LazySiteAccountOrders: LazyComponent<typeof import("../components/storefront/SiteAccountOrders.vue")['default']>
export const LazySiteAccountProfile: LazyComponent<typeof import("../components/storefront/SiteAccountProfile.vue")['default']>
export const LazySiteAuthDrawer: LazyComponent<typeof import("../components/storefront/SiteAuthDrawer.vue")['default']>
export const LazySiteBloggersPage: LazyComponent<typeof import("../components/storefront/SiteBloggersPage.vue")['default']>
export const LazySiteBusinessPage: LazyComponent<typeof import("../components/storefront/SiteBusinessPage.vue")['default']>
export const LazySiteBusinessPreview: LazyComponent<typeof import("../components/storefront/SiteBusinessPreview.vue")['default']>
export const LazySiteBusinessRegistrationDrawer: LazyComponent<typeof import("../components/storefront/SiteBusinessRegistrationDrawer.vue")['default']>
export const LazySiteCartBadge: LazyComponent<typeof import("../components/storefront/SiteCartBadge.vue")['default']>
export const LazySiteCartDrawer: LazyComponent<typeof import("../components/storefront/SiteCartDrawer.vue")['default']>
export const LazySiteCartRecommendations: LazyComponent<typeof import("../components/storefront/SiteCartRecommendations.vue")['default']>
export const LazySiteCartSuggestion: LazyComponent<typeof import("../components/storefront/SiteCartSuggestion.vue")['default']>
export const LazySiteCatalogDesignFilters: LazyComponent<typeof import("../components/storefront/SiteCatalogDesignFilters.vue")['default']>
export const LazySiteCatalogDrawer: LazyComponent<typeof import("../components/storefront/SiteCatalogDrawer.vue")['default']>
export const LazySiteCatalogFilters: LazyComponent<typeof import("../components/storefront/SiteCatalogFilters.vue")['default']>
export const LazySiteCatalogMenuEditor: LazyComponent<typeof import("../components/storefront/SiteCatalogMenuEditor.vue")['default']>
export const LazySiteCatalogPage: LazyComponent<typeof import("../components/storefront/SiteCatalogPage.vue")['default']>
export const LazySiteCategoriesEditor: LazyComponent<typeof import("../components/storefront/SiteCategoriesEditor.vue")['default']>
export const LazySiteCheckout: LazyComponent<typeof import("../components/storefront/SiteCheckout.vue")['default']>
export const LazySiteClubBlock: LazyComponent<typeof import("../components/storefront/SiteClubBlock.vue")['default']>
export const LazySiteClubHub: LazyComponent<typeof import("../components/storefront/SiteClubHub.vue")['default']>
export const LazySiteClubReferral: LazyComponent<typeof import("../components/storefront/SiteClubReferral.vue")['default']>
export const LazySiteClubReferralStack: LazyComponent<typeof import("../components/storefront/SiteClubReferralStack.vue")['default']>
export const LazySiteClubReferralsPage: LazyComponent<typeof import("../components/storefront/SiteClubReferralsPage.vue")['default']>
export const LazySiteContactForm: LazyComponent<typeof import("../components/storefront/SiteContactForm.vue")['default']>
export const LazySiteContentEditor: LazyComponent<typeof import("../components/storefront/SiteContentEditor.vue")['default']>
export const LazySiteContentPage: LazyComponent<typeof import("../components/storefront/SiteContentPage.vue")['default']>
export const LazySiteFavoritesDrawer: LazyComponent<typeof import("../components/storefront/SiteFavoritesDrawer.vue")['default']>
export const LazySiteFloatingActions: LazyComponent<typeof import("../components/storefront/SiteFloatingActions.vue")['default']>
export const LazySiteFooter: LazyComponent<typeof import("../components/storefront/SiteFooter.vue")['default']>
export const LazySiteFounderBiography: LazyComponent<typeof import("../components/storefront/SiteFounderBiography.vue")['default']>
export const LazySiteGiftCardsEditor: LazyComponent<typeof import("../components/storefront/SiteGiftCardsEditor.vue")['default']>
export const LazySiteHeader: LazyComponent<typeof import("../components/storefront/SiteHeader.vue")['default']>
export const LazySiteHomeCourses: LazyComponent<typeof import("../components/storefront/SiteHomeCourses.vue")['default']>
export const LazySiteHomeEffects: LazyComponent<typeof import("../components/storefront/SiteHomeEffects.vue")['default']>
export const LazySiteHomeFooter: LazyComponent<typeof import("../components/storefront/SiteHomeFooter.vue")['default']>
export const LazySiteHomeNavigation: LazyComponent<typeof import("../components/storefront/SiteHomeNavigation.vue")['default']>
export const LazySiteHomeRegion: LazyComponent<typeof import("../components/storefront/SiteHomeRegion.vue")['default']>
export const LazySiteLoyaltyPreview: LazyComponent<typeof import("../components/storefront/SiteLoyaltyPreview.vue")['default']>
export const LazySiteMenuDrawer: LazyComponent<typeof import("../components/storefront/SiteMenuDrawer.vue")['default']>
export const LazySiteMenuLink: LazyComponent<typeof import("../components/storefront/SiteMenuLink.vue")['default']>
export const LazySitePageArt: LazyComponent<typeof import("../components/storefront/SitePageArt.vue")['default']>
export const LazySitePagesEditor: LazyComponent<typeof import("../components/storefront/SitePagesEditor.vue")['default']>
export const LazySitePartnerAccount: LazyComponent<typeof import("../components/storefront/SitePartnerAccount.vue")['default']>
export const LazySitePartnerLink: LazyComponent<typeof import("../components/storefront/SitePartnerLink.vue")['default']>
export const LazySitePartnershipBlock: LazyComponent<typeof import("../components/storefront/SitePartnershipBlock.vue")['default']>
export const LazySitePartnershipPage: LazyComponent<typeof import("../components/storefront/SitePartnershipPage.vue")['default']>
export const LazySitePartnershipScene: LazyComponent<typeof import("../components/storefront/SitePartnershipScene.vue")['default']>
export const LazySiteProductBadgesEditor: LazyComponent<typeof import("../components/storefront/SiteProductBadgesEditor.vue")['default']>
export const LazySiteProductPage: LazyComponent<typeof import("../components/storefront/SiteProductPage.vue")['default']>
export const LazySitePromoCodesEditor: LazyComponent<typeof import("../components/storefront/SitePromoCodesEditor.vue")['default']>
export const LazySiteQuantityControl: LazyComponent<typeof import("../components/storefront/SiteQuantityControl.vue")['default']>
export const LazySiteShell: LazyComponent<typeof import("../components/storefront/SiteShell.vue")['default']>
export const LazySiteSocialLoginButtons: LazyComponent<typeof import("../components/storefront/SiteSocialLoginButtons.vue")['default']>
export const LazyChannelsWorkspacePage: LazyComponent<typeof import("../components/workspace/ChannelsWorkspacePage.vue")['default']>
export const LazyContactMessagesWorkspace: LazyComponent<typeof import("../components/workspace/ContactMessagesWorkspace.vue")['default']>
export const LazyMarketplaceExchangePanel: LazyComponent<typeof import("../components/workspace/MarketplaceExchangePanel.vue")['default']>
export const LazyPartnerDocumentsSettingsPage: LazyComponent<typeof import("../components/workspace/PartnerDocumentsSettingsPage.vue")['default']>
export const LazyPartnerGiftsPage: LazyComponent<typeof import("../components/workspace/PartnerGiftsPage.vue")['default']>
export const LazyPartnerLegalEntitiesPage: LazyComponent<typeof import("../components/workspace/PartnerLegalEntitiesPage.vue")['default']>
export const LazyPartnerWorkspacePage: LazyComponent<typeof import("../components/workspace/PartnerWorkspacePage.vue")['default']>
export const LazyReportsWorkspacePage: LazyComponent<typeof import("../components/workspace/ReportsWorkspacePage.vue")['default']>
export const LazySalonSubscriptionSettings: LazyComponent<typeof import("../components/workspace/SalonSubscriptionSettings.vue")['default']>
export const LazyStoreDashboard: LazyComponent<typeof import("../components/workspace/StoreDashboard.vue")['default']>
export const LazyStoreWorkspacePage: LazyComponent<typeof import("../components/workspace/StoreWorkspacePage.vue")['default']>
export const LazySupportWorkspacePage: LazyComponent<typeof import("../components/workspace/SupportWorkspacePage.vue")['default']>
export const LazySystemWorkspacePage: LazyComponent<typeof import("../components/workspace/SystemWorkspacePage.vue")['default']>
/**
 * Lazy-loaded version of `<NuxtWelcome>`.
 *
 * Displays the welcome screen used by new Nuxt projects.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-welcome
 */
export const LazyNuxtWelcome: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']>
/**
 * Lazy-loaded version of `<NuxtLayout>`.
 *
 * Renders the selected layout around pages or error content.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-layout
 */
export const LazyNuxtLayout: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
/**
 * Lazy-loaded version of `<NuxtErrorBoundary>`.
 *
 * Catches client-side errors from its default slot and renders an error slot.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-error-boundary
 */
export const LazyNuxtErrorBoundary: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
/**
 * Lazy-loaded version of `<ClientOnly>`.
 *
 * Renders its default slot only on the client, with an optional server fallback.
 *
 * @see https://nuxt.com/docs/4.x/api/components/client-only
 */
export const LazyClientOnly: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']>
/**
 * Lazy-loaded version of `<DevOnly>`.
 *
 * Renders its content only during development.
 *
 * @see https://nuxt.com/docs/4.x/api/components/dev-only
 */
export const LazyDevOnly: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']>
export const LazyServerPlaceholder: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
/**
 * Lazy-loaded version of `<NuxtLink>`.
 *
 * A drop-in replacement for Vue Router's `<RouterLink>` and the HTML `<a>` element.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-link
 */
export const LazyNuxtLink: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']>
/**
 * Lazy-loaded version of `<NuxtLoadingIndicator>`.
 *
 * Displays a progress bar during page navigation.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-loading-indicator
 */
export const LazyNuxtLoadingIndicator: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
/**
 * Lazy-loaded version of `<NuxtTime>`.
 *
 * Formats dates and times consistently across server and client using the user's locale.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-time
 */
export const LazyNuxtTime: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
/**
 * Lazy-loaded version of `<NuxtRouteAnnouncer>`.
 *
 * Announces route changes to assistive technologies using the current page title.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-route-announcer
 */
export const LazyNuxtRouteAnnouncer: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
/**
 * Lazy-loaded version of `<NuxtAnnouncer>`.
 *
 * Announces dynamic content changes to assistive technologies.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-announcer
 */
export const LazyNuxtAnnouncer: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-announcer")['default']>
/**
 * Lazy-loaded version of `<NuxtImg>`.
 *
 * Renders an optimized image through the Nuxt Image module.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-img
 */
export const LazyNuxtImg: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']>
/**
 * Lazy-loaded version of `<NuxtPicture>`.
 *
 * Renders responsive optimized images through the Nuxt Image module.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-picture
 */
export const LazyNuxtPicture: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']>
/**
 * Lazy-loaded version of `<NuxtPage>`.
 *
 * Renders the current page from the `pages/` directory.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-page
 */
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
/**
 * Lazy-loaded version of `<NuxtIsland>`.
 *
 * Renders a non-interactive server component without shipping client-side JavaScript.
 *
 * @see https://nuxt.com/docs/4.x/api/components/nuxt-island
 */
export const LazyNuxtIsland: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']>

export const componentNames: string[]
