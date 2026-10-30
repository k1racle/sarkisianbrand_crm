export type CourseCertificate = { id: string; courseId: string; fullName: string; courseTitle: string; issuedAt: string };

export async function downloadCourseCertificate(apiBase: string, token: string, id: string) {
  const blob = await $fetch<Blob>(`/lms/certificates/${encodeURIComponent(id)}/file`, {
    baseURL: apiBase, headers: { Authorization: `Bearer ${token}` }, responseType: 'blob',
  });
  if (!(blob instanceof Blob) || blob.type !== 'application/pdf' || !blob.size) throw new Error('Invalid certificate');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = 'sarkisian-certificate.pdf';
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
