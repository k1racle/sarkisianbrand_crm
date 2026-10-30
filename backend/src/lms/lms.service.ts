import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CourseListDto, CreateCourseDto, CreateLessonDto, CreateModuleDto, CreateTariffDto, UpdateCourseDto, UpdateLessonDto, UpdateModuleDto, UpdateTariffDto } from './lms.dto';
import { courseSalesEnabled } from './lms-purchase.service';

const ordered = { orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }] };
const adminInclude = { tariffs: { orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }] }, modules: { ...ordered, include: { lessons: { ...ordered, include: { assets: { where: { pendingDelete: false }, select: { id: true, lessonId: true, filename: true, mimeType: true, size: true, isPublished: true, everPublished: true, createdAt: true } } } } } } };
const published = { status: 'PUBLISHED', isActive: true };
const publicLesson = { id: true, title: true, kind: true, sortOrder: true, isPreview: true };
const publicTariff = { id: true, title: true, price: true, accessDays: true };
const publicCourse = { id: true, titleRu: true, titleEn: true, description: true };

function title(value: string) {
  if (typeof value !== 'string' || !value.trim()) throw new BadRequestException('Название не может быть пустым');
  return value.trim();
}
function safeUrl(value: string | null | undefined) {
  if (value === undefined || value === null || value === '') return value || null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || /[\r\n]/.test(value)) throw new Error();
    return url.toString();
  } catch { throw new BadRequestException('Укажите ссылку, начинающуюся с https://, без логина и пароля'); }
}
function lessonData(dto: CreateLessonDto | UpdateLessonDto) {
  return { ...(dto.title !== undefined ? { title: title(dto.title) } : {}), ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
    ...(dto.content !== undefined ? { content: dto.content } : {}), ...(dto.videoUrl !== undefined ? { videoUrl: safeUrl(dto.videoUrl) } : {}),
    ...(dto.presentationUrl !== undefined ? { presentationUrl: safeUrl(dto.presentationUrl) } : {}),
    ...(dto.isPreview !== undefined ? { isPreview: dto.isPreview } : {}), ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}) };
}
type LessonFields = { title: string; kind: string; content: string | null; videoUrl: string | null; presentationUrl: string | null; isPreview: boolean; sortOrder: number };
function draftFields(lesson: LessonFields & { draftData?: Prisma.JsonValue | null }): LessonFields {
  // Only server-generated keys are applied; never spread arbitrary JSON into
  // Prisma updates or public responses.
  const d = lesson.draftData as Partial<LessonFields> | null;
  return { title: d?.title ?? lesson.title, kind: d?.kind ?? lesson.kind,
    content: d && 'content' in d ? d.content ?? null : lesson.content,
    videoUrl: d && 'videoUrl' in d ? d.videoUrl ?? null : lesson.videoUrl,
    presentationUrl: d && 'presentationUrl' in d ? d.presentationUrl ?? null : lesson.presentationUrl,
    isPreview: d?.isPreview ?? lesson.isPreview, sortOrder: d?.sortOrder ?? lesson.sortOrder };
}
function adminCourse<T extends { modules: Array<{ lessons: Array<LessonFields & { id: string; draftData: Prisma.JsonValue | null; isPublished: boolean; assets: Array<{ mimeType: string; isPublished: boolean; everPublished: boolean }> }> }> }>(course: T) {
  return { ...course, modules: course.modules.map(module => ({ ...module, lessons: module.lessons.map(lesson => {
    const { draftData, ...rest } = lesson, fields = draftFields(lesson);
    const pendingAsset = lesson.assets.some(asset => !asset.isPublished && !asset.everPublished && (fields.kind === 'VIDEO' && ['video/mp4','video/webm'].includes(asset.mimeType) || fields.kind === 'PRESENTATION' && asset.mimeType === 'application/pdf'));
    return { ...rest, ...fields, hasDraftChanges: draftData !== null || pendingAsset };
  }).sort((a,b) => a.sortOrder-b.sortOrder || a.id.localeCompare(b.id)) })) };
}
function lessonComplete(lesson: { kind: string; isPreview: boolean; content: string | null; videoUrl: string | null; presentationUrl: string | null; assets?: Array<{ mimeType: string }> }) {
  if (lesson.kind === 'TEXT' || lesson.kind === 'LIVE') return !!lesson.content?.trim();
  const link = lesson.kind === 'VIDEO' ? lesson.videoUrl : lesson.kind === 'PRESENTATION' ? lesson.presentationUrl : null;
  if (!link) return !lesson.isPreview && !!lesson.assets?.some(asset => lesson.kind === 'VIDEO' ? ['video/mp4','video/webm'].includes(asset.mimeType) : lesson.kind === 'PRESENTATION' && asset.mimeType === 'application/pdf');
  try { return !!safeUrl(link); } catch { return false; }
}
function progressFor(modules: Array<{ lessons: Array<{ id: string }> }>, completed: Array<{ lessonId: string }>) {
  const ids = new Set(modules.flatMap(module => module.lessons.map(lesson => lesson.id)));
  const done = new Set(completed.map(item => item.lessonId).filter(id => ids.has(id))).size;
  return { progress: ids.size ? Math.floor(done / ids.size * 100) : 0, isCompleted: ids.size > 0 && done === ids.size };
}
function materialView(lesson: { id: string; title: string; kind: string; sortOrder: number; isPreview: boolean; content: string | null; videoUrl: string | null; presentationUrl: string | null }) {
  // A draft may retain old fields after its type changes; only expose the
  // material belonging to the type explicitly selected by the editor.
  return { id: lesson.id, title: lesson.title, kind: lesson.kind, sortOrder: lesson.sortOrder, isPreview: lesson.isPreview,
    content: lesson.kind === 'TEXT' || lesson.kind === 'LIVE' ? lesson.content : null,
    videoUrl: lesson.kind === 'VIDEO' ? lesson.videoUrl : null,
    presentationUrl: lesson.kind === 'PRESENTATION' ? lesson.presentationUrl : null };
}

@Injectable()
export class LmsService {
  constructor(private readonly db: PrismaService, @Optional() private readonly config?: ConfigService) {}
  private purchasingAvailable() { return this.config ? courseSalesEnabled(this.config) : false; }

  private async lockCourse(tx: Prisma.TransactionClient, id: string) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Course" WHERE id = ${id} FOR UPDATE`;
    if (!rows.length) throw new NotFoundException('Курс не найден');
  }
  private async validatePublished(tx: Prisma.TransactionClient, id: string) {
    const course = await tx.course.findUnique({ where: { id }, include: adminInclude });
    if (!course) throw new NotFoundException('Курс не найден');
    if (course.status !== 'PUBLISHED') return;
    const lessons = course.modules.flatMap(module => module.lessons).filter(lesson => lesson.isPublished);
    if (!course.tariffs.some(tariff => tariff.isActive) || !lessons.length || lessons.some(lesson => !lessonComplete(lesson) || (lesson.kind === 'LIVE' && lesson.isPreview)))
      throw new BadRequestException('Для публикации добавьте действующий тариф и заполните все уроки');
  }
  private async updateCourseTransaction<T>(id: string, action: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.db.$transaction(async tx => { await this.lockCourse(tx, id); const result = await action(tx); await this.validatePublished(tx, id); return result; });
  }

  async adminList(query: CourseListDto = { page: 1, limit: 20 }) { const { page, limit } = query; const search = query.search?.trim(); const where: Prisma.CourseWhereInput = search ? { OR: [{ titleRu: { contains: search, mode: 'insensitive' } }, { titleEn: { contains: search, mode: 'insensitive' } }] } : {}; const [items, total] = await Promise.all([this.db.course.findMany({ where, include: adminInclude, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit }), this.db.course.count({ where })]); return { items: items.map(adminCourse), total, page, pages: Math.max(1, Math.ceil(total / limit)), limit }; }
  async adminDetail(id: string) { const item = await this.db.course.findUnique({ where: { id }, include: adminInclude }); if (!item) throw new NotFoundException('Курс не найден'); return adminCourse(item); }
  async adminStudents(query: CourseListDto = { page: 1, limit: 20 }) {
    const { page, limit } = query;
    const search = query.search?.trim();
    const where: Prisma.EnrollmentWhereInput = search ? { AND: search.split(/\s+/).filter(Boolean).slice(0, 10).map(term => ({ OR: [
      { user: { firstName: { contains: term, mode: 'insensitive' } } },
      { user: { lastName: { contains: term, mode: 'insensitive' } } },
      { user: { email: { contains: term, mode: 'insensitive' } } },
      { user: { phone: { contains: term, mode: 'insensitive' } } },
      { course: { titleRu: { contains: term, mode: 'insensitive' } } },
    ] })) } : {};
    const publishedLesson = { isPublished: true, moduleId: { not: null } };
    const [rows, total] = await Promise.all([
      this.db.enrollment.findMany({ where, orderBy: [{ enrolledAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit,
        select: { id: true, enrolledAt: true, accessStatus: true, accessExpiresAt: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, isActive: true } },
          course: { select: { id: true, titleRu: true, _count: { select: { lessons: { where: publishedLesson } } } } },
          lessonsProgress: { where: { lesson: publishedLesson }, select: { lesson: { select: { courseId: true } } } },
        } }),
      this.db.enrollment.count({ where }),
    ]);
    const now = Date.now();
    return { items: rows.map(({ course, lessonsProgress, ...row }) => {
      const totalLessons = course._count.lessons;
      const completedLessons = Math.min(totalLessons, lessonsProgress.filter(progress => progress.lesson.courseId === course.id).length);
      const effectiveStatus = row.accessStatus === 'ACTIVE' && !row.user.isActive ? 'ACCOUNT_DISABLED' : row.accessStatus === 'ACTIVE' && row.accessExpiresAt && row.accessExpiresAt.getTime() <= now ? 'EXPIRED' : row.accessStatus;
      return { ...row, effectiveStatus, course: { id: course.id, title: course.titleRu }, totalLessons, completedLessons,
        progress: totalLessons ? Math.floor(completedLessons * 100 / totalLessons) : 0 };
    }), total, page, pages: Math.max(1, Math.ceil(total / limit)), limit };
  }
  createCourse(dto: CreateCourseDto) { return this.db.course.create({ data: { titleRu: title(dto.titleRu), titleEn: dto.titleEn?.trim() || null, ...(dto.description != null ? { description: dto.description } : {}), price: 0, status: 'DRAFT', isActive: true }, include: adminInclude }); }
  updateCourse(id: string, dto: UpdateCourseDto) {
    return this.updateCourseTransaction(id, async tx => {
      if (dto.status === 'PUBLISHED') {
        // The course row lock serialises edits, publication and file uploads.
        // Draft values are promoted inside this transaction; failed validation
        // rolls back both visibility and the previous published version.
        const drafts = await tx.lesson.findMany({ where: { courseId: id, moduleId: { not: null }, draftData: { not: Prisma.DbNull } } });
        for (const lesson of drafts) await tx.lesson.update({ where: { id: lesson.id }, data: { ...draftFields(lesson), draftData: Prisma.DbNull } });
        // Publication also changes what a form is editing. Stale forms must
        // not overwrite a version that another employee has just published.
        await tx.lesson.updateMany({ where: { courseId: id, moduleId: { not: null } }, data: { isPublished: true, revision: { increment: 1 } } });
        await tx.courseAsset.updateMany({ where: { lesson: { courseId: id } }, data: { isPublished: false } });
        await tx.courseAsset.updateMany({ where: { pendingDelete: false, lesson: { courseId: id, kind: 'VIDEO' }, mimeType: { in: ['video/mp4','video/webm'] } }, data: { isPublished: true, everPublished: true } });
        await tx.courseAsset.updateMany({ where: { pendingDelete: false, lesson: { courseId: id, kind: 'PRESENTATION' }, mimeType: 'application/pdf' }, data: { isPublished: true, everPublished: true } });
      }
      return tx.course.update({ where: { id }, data: { ...(dto.titleRu !== undefined ? { titleRu: title(dto.titleRu) } : {}), ...(dto.titleEn !== undefined ? { titleEn: dto.titleEn?.trim() || null } : {}), ...(dto.description !== undefined ? { description: dto.description === null ? Prisma.DbNull : dto.description } : {}), ...(dto.status !== undefined ? { status: dto.status, isActive: dto.status !== 'ARCHIVED' } : {}) }, include: adminInclude });
    });
  }
  createTariff(courseId: string, dto: CreateTariffDto) { return this.updateCourseTransaction(courseId, tx => tx.courseTariff.create({ data: { courseId, title: title(dto.title), price: dto.price, accessDays: dto.accessDays ?? null, isActive: dto.isActive ?? true } })); }
  async updateTariff(id: string, dto: UpdateTariffDto) {
    const row = await this.db.courseTariff.findUnique({ where: { id }, select: { courseId: true } }); if (!row) throw new NotFoundException('Тариф не найден');
    return this.updateCourseTransaction(row.courseId, tx => tx.courseTariff.update({ where: { id }, data: { ...(dto.title !== undefined ? { title: title(dto.title) } : {}), ...(dto.price !== undefined ? { price: dto.price } : {}), ...(dto.accessDays !== undefined ? { accessDays: dto.accessDays } : {}), ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}) } }));
  }
  createModule(courseId: string, dto: CreateModuleDto) { return this.updateCourseTransaction(courseId, tx => tx.courseModule.create({ data: { courseId, title: title(dto.title), sortOrder: dto.sortOrder ?? 0 } })); }
  async updateModule(id: string, dto: UpdateModuleDto) {
    const row = await this.db.courseModule.findUnique({ where: { id }, select: { courseId: true } }); if (!row) throw new NotFoundException('Модуль не найден');
    return this.updateCourseTransaction(row.courseId, tx => tx.courseModule.update({ where: { id }, data: { ...(dto.title !== undefined ? { title: title(dto.title) } : {}), ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}) } }));
  }
  async createLesson(moduleId: string, dto: CreateLessonDto) {
    const module = await this.db.courseModule.findUnique({ where: { id: moduleId }, select: { courseId: true } }); if (!module) throw new NotFoundException('Модуль не найден');
    if (dto.kind === 'LIVE' && dto.isPreview) throw new BadRequestException('Прямой эфир доступен только ученикам курса');
    return this.updateCourseTransaction(module.courseId, tx => tx.lesson.create({ data: { ...lessonData(dto), courseId: module.courseId, moduleId, title: title(dto.title), kind: dto.kind, isPublished: false } }));
  }
  async updateLesson(id: string, dto: UpdateLessonDto) {
    if (!Number.isSafeInteger(dto.revision) || dto.revision < 0) throw new ConflictException('Версия урока неизвестна. Обновите страницу и откройте урок заново.');
    const lesson = await this.db.lesson.findUnique({ where: { id }, select: { courseId: true } }); if (!lesson) throw new NotFoundException('Урок не найден');
    return this.updateCourseTransaction(lesson.courseId, async tx => {
      const current = await tx.lesson.findUniqueOrThrow({ where: { id } });
      if (current.revision !== dto.revision) throw new ConflictException('Урок изменён другим сотрудником или опубликован. Скопируйте ваши изменения и откройте урок заново.');
      const next = { ...draftFields(current), ...lessonData(dto) };
      if (next.kind === 'LIVE' && next.isPreview) throw new BadRequestException('Прямой эфир доступен только ученикам курса');
      if (current.isPublished) {
        const original = draftFields({ ...current, draftData: null });
        const hasDraftChanges = Object.keys(original).some(key => original[key as keyof LessonFields] !== next[key as keyof LessonFields]);
        const row = await tx.lesson.update({ where: { id }, data: { draftData: hasDraftChanges ? next : Prisma.DbNull, revision: { increment: 1 } } });
        const { draftData, ...rest } = row; return { ...rest, ...draftFields(row), hasDraftChanges };
      }
      return tx.lesson.update({ where: { id }, data: { ...lessonData(dto), revision: { increment: 1 } } });
    });
  }

  async catalog(query: CourseListDto = { page: 1, limit: 20 }) { const { page, limit } = query; const search = query.search?.trim(); const where: Prisma.CourseWhereInput = { ...published, ...(search ? { OR: [{ titleRu: { contains: search, mode: 'insensitive' } }, { titleEn: { contains: search, mode: 'insensitive' } }] } : {}) }; const [items, total] = await Promise.all([this.db.course.findMany({ where, select: { ...publicCourse, tariffs: { where: { isActive: true }, select: publicTariff, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }, modules: { ...ordered, where: { lessons: { some: { isPublished: true } } }, select: { id: true, title: true, sortOrder: true, lessons: { ...ordered, where: { isPublished: true }, select: publicLesson } } } }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit }), this.db.course.count({ where })]); return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)), limit, purchasingAvailable: this.purchasingAvailable(), liveAvailable: false }; }
  async catalogDetail(id: string) { const course = await this.db.course.findFirst({ where: { id, ...published }, select: { ...publicCourse, tariffs: { where: { isActive: true }, select: publicTariff, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }, modules: { ...ordered, where: { lessons: { some: { isPublished: true } } }, select: { id: true, title: true, sortOrder: true, lessons: { ...ordered, where: { isPublished: true }, select: publicLesson } } } } }); if (!course) throw new NotFoundException('Курс не найден'); return { ...course, purchasingAvailable: this.purchasingAvailable(), liveAvailable: false }; }
  async preview(courseId: string, lessonId: string) { const lesson = await this.db.lesson.findFirst({ where: { id: lessonId, courseId, isPublished: true, isPreview: true, kind: { not: 'LIVE' }, course: published }, select: { ...publicLesson, content: true, videoUrl: true, presentationUrl: true } }); if (!lesson) throw new NotFoundException('Урок не найден'); return materialView(lesson); }

  // Removing a course from the store must not silently revoke paid access.
  private accessWhere(userId: string, courseId?: string) { return { userId, ...(courseId ? { courseId } : {}), accessStatus: 'ACTIVE', OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: new Date() } }] }; }
  async myCourses(userId: string) {
    const rows = await this.db.enrollment.findMany({ where: this.accessWhere(userId), select: { id: true, courseId: true, accessExpiresAt: true, lessonsProgress: { where: { lesson: { isPublished: true } }, select: { lessonId: true } }, course: { select: { ...publicCourse, modules: { select: { lessons: { where: { isPublished: true }, select: { id: true } } } } } } }, orderBy: { enrolledAt: 'desc' } });
    return rows.map(({ lessonsProgress, course, ...row }) => { const { modules, ...metadata } = course; return { ...row, ...progressFor(modules, lessonsProgress), course: metadata }; });
  }
  async myCourse(userId: string, courseId: string) {
    const enrollment = await this.db.enrollment.findFirst({ where: this.accessWhere(userId, courseId), select: { id: true, courseId: true, progress: true, isCompleted: true, accessExpiresAt: true, lessonsProgress: { where: { lesson: { isPublished: true } }, select: { lessonId: true, completedAt: true } }, course: { select: { ...publicCourse, modules: { ...ordered, where: { lessons: { some: { isPublished: true } } }, select: { id: true, title: true, sortOrder: true, lessons: { ...ordered, where: { isPublished: true }, select: publicLesson } } } } } } });
    if (!enrollment) throw new NotFoundException('Курс недоступен'); return { ...enrollment, ...progressFor(enrollment.course.modules, enrollment.lessonsProgress) };
  }
  async myLesson(userId: string, courseId: string, lessonId: string) {
    const lesson = await this.db.lesson.findFirst({ where: { id: lessonId, courseId, isPublished: true, moduleId: { not: null }, course: { enrollments: { some: this.accessWhere(userId, courseId) } } }, select: { ...publicLesson, content: true, videoUrl: true, presentationUrl: true } });
    if (!lesson) throw new NotFoundException('Курс или урок недоступен'); return materialView(lesson);
  }
  async complete(userId: string, courseId: string, lessonId: string) {
    return this.db.$transaction(async tx => {
      await this.lockCourse(tx, courseId);
      await tx.$queryRaw`SELECT id FROM "Enrollment" WHERE "userId" = ${userId} AND "courseId" = ${courseId} FOR UPDATE`;
      const enrollment = await tx.enrollment.findFirst({ where: this.accessWhere(userId, courseId), select: { id: true } }); if (!enrollment) throw new NotFoundException('Курс недоступен');
      const lesson = await tx.lesson.findFirst({ where: { id: lessonId, courseId, isPublished: true, moduleId: { not: null } }, select: { id: true } }); if (!lesson) throw new NotFoundException('Урок не найден');
      await tx.lessonProgress.upsert({ where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } }, create: { enrollmentId: enrollment.id, lessonId }, update: {} });
      const [total, done] = await Promise.all([tx.lesson.count({ where: { courseId, isPublished: true, moduleId: { not: null } } }), tx.lessonProgress.count({ where: { enrollmentId: enrollment.id, lesson: { courseId, isPublished: true, moduleId: { not: null } } } })]);
      return tx.enrollment.update({ where: { id: enrollment.id }, data: { progress: total ? Math.floor(done / total * 100) : 0, isCompleted: total > 0 && done === total }, select: { progress: true, isCompleted: true } });
    });
  }
}
