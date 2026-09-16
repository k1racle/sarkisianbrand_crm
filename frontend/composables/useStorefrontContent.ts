import type { StorefrontCatalogMenu } from './useStorefrontCatalog';

type StorefrontContent = {
  settings: { announcementText: string; catalogMenu?: StorefrontCatalogMenu | null; catalogMenuRevision?: number };
  banners: any[];
  categories: any[];
  socialLinks: any[];
  menuItems: Array<{ id: string; label: string; url: string; newTab: boolean }>;
};

const defaultAnnouncement = 'SARKISIAN BRAND – это официальный интернет-магазин скоростного мастера-блогера Светланы Саркисян';

export function useStorefrontContent() {
  const config = useRuntimeConfig();
  const content = useState<StorefrontContent>('storefront-content', () => ({
    settings: { announcementText: defaultAnnouncement },
    banners: [],
    categories: [],
    socialLinks: [],
    menuItems: [],
  }));
  const contentLoaded = useState('storefront-content-loaded', () => false);

  async function loadStorefrontContent(force = false) {
    if (contentLoaded.value && !force) return content.value;
    try {
      content.value = await $fetch<StorefrontContent>('/products/storefront-content', { baseURL: config.public.apiBase });
      contentLoaded.value = true;
    } catch {
      content.value.settings.announcementText ||= defaultAnnouncement;
    }
    return content.value;
  }

  function storefrontMediaUrl(url?: string | null) {
    if (!url) return '';
    if (/^https?:\/\//i.test(url) || !url.startsWith('/api/')) return url;
    return new URL(url, config.public.apiBase).toString();
  }

  return { content, loadStorefrontContent, storefrontMediaUrl };
}
