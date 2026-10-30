import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { readFile } from 'fs/promises';
import { join } from 'path';
import PDFDocument = require('pdfkit');
import { activeSession, SessionClaims } from '../auth/active-session';
import { PrismaService } from '../prisma/prisma.service';

const certificateSelect = { id: true, courseId: true, fullName: true, courseTitle: true, issuedAt: true } as const;

@Injectable()
export class LmsCertificateService {
  constructor(private readonly db: PrismaService) {}

  async get(user: SessionClaims, courseId: string) {
    await activeSession(this.db, user);
    return this.db.lmsCertificate.findFirst({ where: { userId: user.sub, courseId }, select: certificateSelect });
  }

  async list(user: SessionClaims) {
    await activeSession(this.db, user);
    return this.db.lmsCertificate.findMany({ where: { userId: user.sub }, select: certificateSelect, orderBy: [{ issuedAt: 'desc' }, { id: 'asc' }], take: 100 });
  }

  async issue(user: SessionClaims, courseId: string) {
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Course" WHERE id = ${courseId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Enrollment" WHERE "userId" = ${user.sub} AND "courseId" = ${courseId} FOR UPDATE`;
      await activeSession(tx as PrismaService, user);
      const enrollment = await tx.enrollment.findUnique({ where: { userId_courseId: { userId: user.sub, courseId } }, include: { user: { select: { firstName: true, lastName: true } }, course: { select: { titleRu: true } }, certificate: true } });
      if (!enrollment) throw new NotFoundException('Курс недоступен');
      if (enrollment.certificate) return tx.lmsCertificate.findUniqueOrThrow({ where: { id: enrollment.certificate.id }, select: certificateSelect });
      if (enrollment.accessStatus !== 'ACTIVE' || (enrollment.accessExpiresAt && enrollment.accessExpiresAt <= new Date())) throw new NotFoundException('Доступ к курсу недоступен или истёк');
      const lessonWhere: Prisma.LessonWhereInput = { courseId, isPublished: true, moduleId: { not: null } };
      const [total, done] = await Promise.all([
        tx.lesson.count({ where: lessonWhere }),
        tx.lessonProgress.count({ where: { enrollmentId: enrollment.id, lesson: lessonWhere } }),
      ]);
      if (!total || done !== total) throw new BadRequestException('Сначала пройдите все опубликованные уроки и обязательные тесты курса.');
      const fullName = [enrollment.user.firstName, enrollment.user.lastName].map(value => value?.trim()).filter(Boolean).join(' ');
      if (!enrollment.user.firstName?.trim() || !enrollment.user.lastName?.trim()) throw new BadRequestException('Укажите имя и фамилию в профиле, чтобы получить сертификат.');
      const certificate = await tx.lmsCertificate.create({ data: { enrollmentId: enrollment.id, userId: user.sub, courseId, fullName, courseTitle: enrollment.course.titleRu }, select: certificateSelect });
      await tx.enrollment.update({ where: { id: enrollment.id }, data: { certificateIssued: true } });
      return certificate;
    });
  }

  async pdf(user: SessionClaims, certificateId: string) {
    await activeSession(this.db, user);
    const certificate = await this.db.lmsCertificate.findFirst({ where: { id: certificateId, userId: user.sub }, select: certificateSelect });
    if (!certificate) throw new NotFoundException('Сертификат не найден');
    const [font, bold] = await Promise.all(['Montserrat.ttf', 'Montserrat-Bold.ttf'].map(name => readFile(join(process.cwd(), 'assets', 'fonts', name))));
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, info: { Title: 'Сертификат о прохождении курса', Author: 'SARKISIAN' } });
    const chunks: Buffer[] = [];
    const result = new Promise<Buffer>((resolve, reject) => { doc.on('data', chunk => chunks.push(Buffer.from(chunk))); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });
    doc.font(font);
    const text = (value: string) => value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f7f7f5');
    doc.rect(22, 22, doc.page.width - 44, doc.page.height - 44).lineWidth(1).stroke('#c8c8c3');
    doc.fillColor('#343434').fontSize(17).text('SARKISIAN', 58, 54, { width: 300, characterSpacing: 3 });
    doc.moveTo(58, 93).lineTo(doc.page.width - 58, 93).lineWidth(1).stroke('#b2b2ac');
    doc.fillColor('#343434').fontSize(12).text('СЕРТИФИКАТ О ПРОХОЖДЕНИИ', 58, 125, { width: doc.page.width - 116, align: 'center', characterSpacing: 1 });
    const centered = (value: string, y: number, height: number, initialSize: number) => {
      const width = doc.page.width - 160, clean = text(value);
      doc.font(bold);
      let size = initialSize;
      while (size > 10 && doc.fontSize(size).heightOfString(clean, { width }) > height) size--;
      doc.fontSize(size).text(clean, 80, y, { width, height, align: 'center' });
    };
    centered(certificate.fullName, 172, 85, 27);
    doc.font(font).fontSize(12).text('успешно прошёл(ла) курс', 80, 275, { width: doc.page.width - 160, align: 'center' });
    centered(certificate.courseTitle, 312, 90, 21);
    doc.moveTo(58, 468).lineTo(doc.page.width - 58, 468).stroke('#b2b2ac');
    const date = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Moscow' }).format(certificate.issuedAt);
    doc.font(font).fontSize(10).text(`Дата выдачи: ${date}`, 58, 490, { width: 320 });
    doc.text(`Номер: ${certificate.id}`, 58, 510, { width: 500 });
    doc.end();
    return result;
  }
}
