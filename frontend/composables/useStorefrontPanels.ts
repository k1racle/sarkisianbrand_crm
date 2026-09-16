export function useStorefrontPanels() {
  const catalogOpen = useState('storefront-catalog-open', () => false);
  const authOpen = useState('storefront-auth-open', () => false);
  const authMode = useState<'login' | 'register'>('storefront-auth-mode', () => 'login');
  const cartOpen = useState('storefront-cart-open', () => false);
  const favoritesOpen = useState('storefront-favorites-open', () => false);
  const menuOpen = useState('storefront-menu-open', () => false);

  function closeAll() {
    catalogOpen.value = false;
    authOpen.value = false;
    cartOpen.value = false;
    favoritesOpen.value = false;
    menuOpen.value = false;
  }

  function openCatalog() {
    closeAll();
    catalogOpen.value = true;
  }

  function openAuth(requestedMode: 'login' | 'register' | Event = 'login') {
    closeAll();
    authMode.value = requestedMode === 'register' ? 'register' : 'login';
    authOpen.value = true;
  }

  function openCart() {
    closeAll();
    cartOpen.value = true;
  }

  function openFavorites() {
    closeAll();
    favoritesOpen.value = true;
  }

  function openMenu() {
    closeAll();
    menuOpen.value = true;
  }

  return { catalogOpen, authOpen, authMode, cartOpen, favoritesOpen, menuOpen, closeAll, openCatalog, openAuth, openCart, openFavorites, openMenu };
}
