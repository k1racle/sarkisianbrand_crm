export type PublicLesson = { id: string; title: string; kind: 'TEXT' | 'VIDEO' | 'PRESENTATION' | 'LIVE'; sortOrder: number; isPreview: boolean };
export type CourseModule = { id: string; title: string; sortOrder: number; lessons: PublicLesson[] };
export type CourseTariff = { id: string; title: string; price: string | number; accessDays: number | null };
export type PublicCourse = { id: string; titleRu: string; titleEn?: string | null; description?: unknown; modules: CourseModule[]; tariffs: CourseTariff[] };
export type CourseMaterial = PublicLesson & { content?: string | null; videoUrl?: string | null; presentationUrl?: string | null };
export type CourseEnrollment = { id: string; courseId: string; progress: number; isCompleted: boolean; accessExpiresAt: string | null; course: PublicCourse; lessonsProgress?: { lessonId: string; completedAt: string }[] };
export type CourseAsset = { id: string; lessonId: string; filename: string; mimeType: string; size: number; createdAt: string; isPublished?: boolean; everPublished?: boolean };
export function courseDescription(description: unknown): string {
  if (typeof description === 'string') return description;
  if (description && typeof description === 'object' && 'text' in description && typeof description.text === 'string') return description.text;
  return '';
}
export function coursePrice(value: string | number): string {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 }).format(n) : 'Цена уточняется';
}
export function safeCourseLink(value: string | null | undefined): string | null {
  if (!value) return null;
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; }
}
