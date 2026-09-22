export type CrmInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function useCrmPwa() {
  const online = useState('crm-online', () => true);
  const installed = useState('crm-installed', () => false);
  const installPrompt = useState<CrmInstallPrompt | null>('crm-install-prompt', () => null);
  const installHelp = useState('crm-install-help', () => false);
  const installBusy = useState('crm-install-busy', () => false);
  const ios = useState('crm-ios', () => false);
  async function install() {
    if (installBusy.value || installed.value) return;
    const prompt = installPrompt.value;
    if (!prompt) { installHelp.value = true; return; }
    installBusy.value = true;
    installPrompt.value = null;
    try {
      await prompt.prompt();
      await prompt.userChoice;
      // appinstalled is authoritative; accepting a prompt is not completed installation.
    } catch { installHelp.value = true; }
    finally { installBusy.value = false; }
  }
  return { online, installed, installPrompt, installHelp, installBusy, ios, install };
}
