export function useUserProfilePanel() {
  const isOpen = useState<boolean>('user-profile-panel-open', () => false);
  const openProfile = () => { isOpen.value = true; };
  const closeProfile = () => { isOpen.value = false; };
  return { isOpen, openProfile, closeProfile };
}
