import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
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
    const lessons = course.modules.flatMap(module => module.lessons);
    if (!course.tariffs.some(tariff => tariff.isActive) || !lessons.length || lessons.some(lesson => !lessonComplete(lesson) || (lesson.kind === 'LIVE' && lesson.isPreview)))
      throw new BadRequestException('Для публикации добавьте действующий тариф и заполните все уроки');
  }
  private async updateCourseTransaction<T>(id: string, action: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.db.$transaction(async tx => { await this.lockCourse(tx, id); const result = await action(tx); await this.validatePublished(tx, id); return result; });
  }

  async adminList(query: CourseListDto = { page: 1, limit: 20 }) { const { page, limit } = query; const search = query.search?.trim(); const where: Prisma.CourseWhereInput = search ? { OR: [{ titleRu: { contains: search, mode: 'insensitive' } }, { titleEn: { contains: search, mode: 'insensitive' } }] } : {}; const [items, total] = await Promise.all([this.db.course.findMany({ where, include: adminInclude, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit }), this.db.course.count({ where })]); return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)), limit }; }
  async adminDetail(id: string) { const item = await this.db.course.findUnique({ where: { id }, include: adminInclude }); if (!item) throw new NotFoundException('Курс не найден'); return item; }
  createCourse(dto: CreateCourseDto) { return this.db.course.create({ data: { titleRu: title(dto.titleRu), titleEn: dto.titleEn?.trim() || null, ...(dto.description != null ? { description: dto.description } : {}), price: 0, status: 'DRAFT', isActive: true }, include: adminInclude }); }
  updateCourse(id: string, dto: UpdateCourseDto) {
    return this.updateCourseTransaction(id, async tx => {
      if (dto.status === 'PUBLISHED') {
        await tx.lesson.updateMany({ where: { courseId: id, moduleId: { not: null } }, data: { isPublished: true } });
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
    return this.updateCourseTransaction(module.courseId, async tx => { const course = await tx.course.findUniqueOrThrow({ where: { id: module.courseId }, select: { status: true } }); return tx.lesson.create({ data: { ...lessonData(dto), courseId: module.courseId, moduleId, title: title(dto.title), kind: dto.kind, isPublished: course.status === 'PUBLISHED' } }); });
  }
  async updateLesson(id: string, dto: UpdateLessonDto) {
    const lesson = await this.db.lesson.findUnique({ where: { id }, select: { courseId: true } }); if (!lesson) throw new NotFoundException('Урок не найден');
    return this.updateCourseTransaction(lesson.courseId, async tx => {
      const current = await tx.lesson.findUniqueOrThrow({ where: { id }, select: { kind: true, isPreview: true } });
      if ((dto.kind ?? current.kind) === 'LIVE' && (dto.isPreview ?? current.isPreview)) throw new BadRequestException('Прямой эфир доступен только ученикам курса');
      return tx.lesson.update({ where: { id }, data: lessonData(dto) });
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
