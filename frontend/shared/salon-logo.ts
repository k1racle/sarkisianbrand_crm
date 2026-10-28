/** Inspect the file itself: Windows may supply an empty or generic MIME type. */
export class SalonLogoError extends Error {}
export async function salonLogoFile(file: File): Promise<Blob> {
  if (!file.size || file.size > 3 * 1024 * 1024) throw new SalonLogoError('Выберите PNG, JPG или WEBP размером до 3 МБ.');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  const mime = bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10' ? 'image/png'
    : bytes[0] === 255 && bytes[1] === 216 ? 'image/jpeg'
    : ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP' ? 'image/webp' : '';
  if (!mime) throw new SalonLogoError('Этот формат не поддерживается. Выберите PNG, JPG или WEBP.');
  const blob = new Blob([file], { type: mime });
  const image = new Image(), url = URL.createObjectURL(blob);
  try {
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error();
  } catch {
    throw new SalonLogoError('Изображение повреждено или не читается. Сохраните его заново как PNG, JPG или WEBP.');
  } finally {
    URL.revokeObjectURL(url);
  }
  return blob;
}
