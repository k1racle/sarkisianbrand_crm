export function marketplaceWorkspaceSection(section: unknown): 'dashboard' | 'orders' | 'integrations' {
  if (section === 'orders') return 'orders';
  if (section === 'integrations' || section === 'settings') return 'integrations';
  // The current CRM route uses "overview"; legacy links use "dashboard".
  return 'dashboard';
}
