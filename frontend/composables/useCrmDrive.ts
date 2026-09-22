export type CrmDriveItem = { id: string; name: string; kind: 'FILE' | 'FOLDER'; scope: string; parentId: string | null; mime: string; size: number; updatedAt: string; deletedAt?: string };
export function useCrmDrive(apiRoot = '/crm') {
  const config = useRuntimeConfig(), { token } = useWorkspaceSession();
  const request = <T = any>(path: string, options: any = {}) => $fetch<T>(`${apiRoot}/${path}`, { baseURL: config.public.apiBase, ...options, headers: { Authorization: `Bearer ${token.value}` }, retry: 0 });
  const message = (e: any) => Array.isArray(e?.data?.message) ? e.data.message.join(', ') : e?.data?.message || e?.message || 'Не удалось выполнить действие. Повторите попытку.';
  const size = (bytes: number) => !bytes ? '0 байт' : bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} ГиБ` : bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(1)} МиБ` : `${Math.max(1, Math.round(bytes / 1024))} КиБ`;
  function upload(file: File, scope: string, parentId: string | null, progress: (value: number) => void = () => {}) {
    return new Promise<CrmDriveItem>((resolve, reject) => {
      const xhr = new XMLHttpRequest(), query = new URLSearchParams({ scope });
      if (parentId) query.set('parentId', parentId);
      xhr.open('POST', `${config.public.apiBase}${apiRoot}/drive/upload?${query}`);
      xhr.setRequestHeader('Authorization', `Bearer ${token.value}`);
      xhr.timeout = 180000;
      xhr.upload.onprogress = event => { if (event.lengthComputable) progress(Math.round(event.loaded / event.total * 100)); };
      xhr.onload = () => { let data: any; try { data = JSON.parse(xhr.responseText); } catch { data = {}; }
        xhr.status >= 200 && xhr.status < 300 ? resolve(data) : reject({ data }); };
      xhr.onerror = () => reject(new Error('Ошибка сети. Файл не загружен.'));
      xhr.ontimeout = () => reject(new Error('Загрузка заняла слишком много времени. Повторите попытку.'));
      const form = new FormData(); form.append('file', file); xhr.send(form);
    });
  }
  async function download(item: CrmDriveItem) {
    const blob = await request<Blob>(`drive/${item.id}/content`, { responseType: 'blob' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = item.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 15000);
  }
  return { request, upload, download, message, size };
}
