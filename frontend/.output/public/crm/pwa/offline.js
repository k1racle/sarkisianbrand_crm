const retry = document.getElementById('retry');
const status = document.getElementById('status');
async function reconnect() {
  if (retry.disabled) return;
  if (!navigator.onLine) { status.textContent = 'Соединение пока не восстановлено.'; return; }
  retry.disabled = true;
  status.textContent = 'Проверяем соединение…';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    // This public file is intentionally absent from the offline cache whitelist.
    const response = await fetch('/crm/pwa/connection.json?check=' + Date.now(), { cache: 'no-store', signal: controller.signal });
    if (!response.ok || (await response.json()).app !== 'SARKISIAN CRM') throw new Error('Unavailable');
    location.reload();
  } catch { status.textContent = 'Соединение пока не восстановлено.'; retry.disabled = false; }
  finally { clearTimeout(timeout); }
}
retry.addEventListener('click', reconnect);
window.addEventListener('online', reconnect);
