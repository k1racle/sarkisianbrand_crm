export function useStorefrontPanels() {
  const catalogOpen = useState('storefront-catalog-open', () => false);
  const authOpen = useState('storefront-auth-open', () => false);
  const cartOpen = useState('storefront-cart-open', () => false);
  const favoritesOpen = useState('storefront-favorites-open', () => false);

  function closeAll() {
    catalogOpen.value = false;
    authOpen.value = false;
    cartOpen.value = false;
    favoritesOpen.value = false;
  }

  function openCatalog() {
    closeAll();
    catalogOpen.value = true;
  }

  function openAuth() {
    closeAll();
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

  return { catalogOpen, authOpen, cartOpen, favoritesOpen, closeAll, openCatalog, openAuth, openCart, openFavorites };
}
