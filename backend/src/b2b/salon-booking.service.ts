import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { B2BBookingStatus, OrganizationMemberRole, OrganizationStatus, Prisma, SalonBookingSetting } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateB2BBookingDto, UpdateB2BBookingDto } from './dto/b2b.dto';
import { PublicSalonBookingDto, SalonBookingSettingDto, SalonSlotsDto } from './dto/salon-booking.dto';
import { dateKey, isOccupied, localInstant } from './salon-booking-time';
import { randomUUID } from 'crypto';
import { SalonPresentationDto } from './dto/salon-presentation.dto';
import { presentationSelect, publicPresentation } from './salon-presentation';

const unavailable = [B2BBookingStatus.CANCELLED, B2BBookingStatus.NO_SHOW];
const included = { client: true, service: true, masterMember: { include: { user: { select: { firstName: true, lastName: true } } } } } as const;
const defaults = { enabled: false, timeZone: 'Europe/Moscow', startMinute: 540, endMinute: 1200, slotStep: 15, horizonDays: 30, workingDays: [1, 2, 3, 4, 5, 6], masterIds: [] as string[] };

@Injectable()
export class SalonBookingService {
  constructor(private readonly db: PrismaService) {}

  private async membership(userId: string) {
    const member = await this.db.organizationMember.findFirst({ where: { userId, isActive: true } });
    if (!member) throw new ForbiddenException('Нет доступа к организации');
    if (![OrganizationMemberRole.OWNER, OrganizationMemberRole.EMPLOYEE].includes(member.role as any)) throw new ForbiddenException('Для вашей роли недоступны настройки салона');
    return member;
  }

  private async lock(tx: Prisma.TransactionClient, organizationId: string) {
    // All booking writers (private/public/move) share a transaction-scoped lock.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId}, 0))`;
  }

  async presentation(userId:string) {
    const member=await this.membership(userId);
    const value=await this.db.salonPresentation.findUnique({where:{organizationId:member.organizationId},select:presentationSelect});
    return {...publicPresentation(value,member.organizationId),canEdit:member.role===OrganizationMemberRole.OWNER};
  }
  async savePresentation(userId:string,dto:SalonPresentationDto) {
    const member=await this.membership(userId);
    if(member.role!==OrganizationMemberRole.OWNER)throw new ForbiddenException('Оформление салона доступно владельцу');
    if(dto.phones.some(phone=>!/^\+?[\d ()-]{8,40}$/.test(phone)||phone.replace(/\D/g,'').length<8))throw new BadRequestException('Некорректный телефон');
    const data={...dto,displayName:dto.displayName.trim(),address:dto.address.trim(),socialLinks:dto.socialLinks.map(link=>({label:link.label.trim(),url:link.url}))};
    const value=await this.db.salonPresentation.upsert({where:{organizationId:member.organizationId},create:{organizationId:member.organizationId,...data},update:data,select:presentationSelect});
    return publicPresentation(value,member.organizationId);
  }
  async uploadLogo(userId:string,file?:{buffer:Buffer;mimetype:string;size:number}) {
    const member=await this.membership(userId);
    if(member.role!==OrganizationMemberRole.OWNER)throw new ForbiddenException('Логотип может изменить владелец');
    if(!file?.buffer?.length||file.size>3*1024*1024)throw new BadRequestException('Выберите PNG, JPG или WEBP размером до 3 МБ');
    const b=file.buffer,mime=file.mimetype;
    const valid=(mime==='image/png'&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))||(mime==='image/jpeg'&&b[0]===255&&b[1]===216)||(mime==='image/webp'&&b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP');
    if(!valid)throw new BadRequestException('Поддерживаются PNG, JPG и WEBP; SVG недоступен');
    const data={logoBytes:b,logoMime:mime,logoVersion:randomUUID()};
    const value=await this.db.salonPresentation.upsert({where:{organizationId:member.organizationId},create:{organizationId:member.organizationId,...data},update:data,select:presentationSelect});
    return publicPresentation(value,member.organizationId);
  }
  async removeLogo(userId:string) {
    const member=await this.membership(userId);
    if(member.role!==OrganizationMemberRole.OWNER)throw new ForbiddenException('Логотип может изменить владелец');
    await this.db.salonPresentation.updateMany({where:{organizationId:member.organizationId},data:{logoBytes:null,logoMime:null,logoVersion:null}});
    return {logoUrl:null};
  }
  async logo(organizationId:string,version?:string) {
    const value=await this.db.salonPresentation.findUnique({where:{organizationId},select:{logoBytes:true,logoMime:true,logoVersion:true}});
    if(!value?.logoBytes||!version||value.logoVersion!==version)throw new NotFoundException('Логотип не найден');
    return {buffer:Buffer.from(value.logoBytes),mime:value.logoMime!};
  }

  async settings(userId: string) {
    const member = await this.membership(userId);
    return { ...defaults, ...await this.db.salonBookingSetting.findUnique({ where: { organizationId: member.organizationId } }), organizationId: member.organizationId, canEdit: member.role === OrganizationMemberRole.OWNER };
  }

  async saveSettings(userId: string, dto: SalonBookingSettingDto) {
    const member = await this.membership(userId);
    if (member.role !== OrganizationMemberRole.OWNER) throw new ForbiddenException('Настройки публикации доступны владельцу');
    try { new Intl.DateTimeFormat('ru-RU', { timeZone: dto.timeZone }).format(); } catch { throw new BadRequestException('Некорректный часовой пояс'); }
    if (dto.startMinute >= dto.endMinute) throw new BadRequestException('Окончание рабочего дня должно быть позже начала');
    if (dto.enabled && (!dto.masterIds.length || !dto.workingDays.length)) throw new BadRequestException('Укажите мастеров и рабочие дни для онлайн-записи');
    for(const day of dto.weeklySchedule||[]){
      if(day.startMinute>=day.endMinute)throw new BadRequestException('Проверьте часы работы каждого дня');
      const pauses=[...day.breaks].sort((a,b)=>a.startMinute-b.startMinute);
      if(pauses.some((pause,i)=>pause.startMinute>=pause.endMinute||pause.startMinute<day.startMinute||pause.endMinute>day.endMinute||(i>0&&pauses[i-1].endMinute>pause.startMinute)))throw new BadRequestException('Перерывы должны быть внутри рабочего дня и не пересекаться');
    }
    const {weeklySchedule,...common}=dto;
    const data={...common,...(weeklySchedule?{weeklySchedule:JSON.parse(JSON.stringify(weeklySchedule)) as Prisma.InputJsonValue}:{})};
    return this.db.$transaction(async tx => {
      await this.lock(tx, member.organizationId);
      const count = await tx.organizationMember.count({ where: { id: { in: dto.masterIds }, organizationId: member.organizationId, isActive: true } });
      if (count !== dto.masterIds.length) throw new BadRequestException('Некоторые мастера недоступны в этой организации');
      return tx.salonBookingSetting.upsert({ where: { organizationId: member.organizationId }, create: { organizationId: member.organizationId, ...data }, update: data });
    });
  }

  private async published(organizationId: string, db: Prisma.TransactionClient = this.db) {
    const setting = await db.salonBookingSetting.findUnique({ where: { organizationId }, include: { organization: { select: { name: true, status: true } } } });
    if (!setting?.enabled || setting.organization.status !== OrganizationStatus.ACTIVE) throw new NotFoundException('Онлайн-запись недоступна');
    return setting;
  }

  async publicProfile(organizationId: string) {
    const setting = await this.published(organizationId);
    const presentation=publicPresentation(await this.db.salonPresentation.findUnique({where:{organizationId},select:presentationSelect}),organizationId);
    const [services, members] = await Promise.all([
      this.db.b2BService.findMany({ where: { organizationId, isActive: true }, select: { id: true, name: true, description: true, duration: true, price: true }, orderBy: { name: 'asc' } }),
      this.db.organizationMember.findMany({ where: { id: { in: setting.masterIds }, organizationId, isActive: true }, select: { id: true, user: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: 'asc' } }),
    ]);
    return { name: presentation.displayName||setting.organization.name, presentation, weeklySchedule:setting.weeklySchedule,workingDays:setting.workingDays,startMinute:setting.startMinute,endMinute:setting.endMinute,timeZone: setting.timeZone, horizonDays: setting.horizonDays, today: dateKey(new Date(), setting.timeZone), services, masters: members.map(m => ({ id: m.id, name: [m.user.firstName, m.user.lastName].filter(Boolean).join(' ') || 'Мастер' })) };
  }

  private validateDay(day: string, setting: SalonBookingSetting, now: Date) {
    const midnight = Date.parse(`${day}T00:00:00.000Z`);
    if (!Number.isFinite(midnight) || new Date(midnight).toISOString().slice(0, 10) !== day) throw new BadRequestException('Некорректная дата');
    const today = Date.parse(`${dateKey(now, setting.timeZone)}T00:00:00.000Z`);
    const offset = (midnight - today) / 86400000;
    if (offset < 0 || offset >= setting.horizonDays) throw new BadRequestException('Дата вне доступного периода записи');
    return setting.workingDays.includes(new Date(midnight).getUTCDay());
  }

  private async available(db: Prisma.TransactionClient, organizationId: string, dto: SalonSlotsDto, setting: SalonBookingSetting, now = new Date()) {
    if (!setting.masterIds.includes(dto.masterMemberId)) throw new NotFoundException('Мастер недоступен для онлайн-записи');
    const [service, master] = await Promise.all([
      db.b2BService.findFirst({ where: { id: dto.serviceId, organizationId, isActive: true } }),
      db.organizationMember.findFirst({ where: { id: dto.masterMemberId, organizationId, isActive: true }, select: { id: true } }),
    ]);
    if (!service || !master) throw new NotFoundException('Услуга или мастер недоступны');
    if (!this.validateDay(dto.date, setting, now)) return { service, slots: [] as string[] };
    // Extend query bounds to include visits spanning midnight, without exposing them.
    const from = new Date(Date.parse(`${dto.date}T00:00:00.000Z`) - 86400000);
    const to = new Date(from.getTime() + 3 * 86400000);
    const busy = await db.b2BBooking.findMany({ where: { organizationId, masterMemberId: dto.masterMemberId, status: { notIn: unavailable }, startTime: { lt: to }, endTime: { gt: from } }, select: { startTime: true, endTime: true } });
    const weekday=new Date(`${dto.date}T12:00:00Z`).getUTCDay();
    const daily=(Array.isArray(setting.weeklySchedule)?setting.weeklySchedule:[]).find((day:any)=>day.day===weekday) as any;
    const opens=daily?.startMinute??setting.startMinute,closes=daily?.endMinute??setting.endMinute;
    const breaks=(daily?.breaks||[]).map((pause:any)=>({startTime:localInstant(dto.date,pause.startMinute,setting.timeZone),endTime:localInstant(dto.date,pause.endMinute,setting.timeZone)})).filter((pause:any)=>pause.startTime&&pause.endTime);
    const closing = localInstant(dto.date, closes, setting.timeZone);
    const slots: string[] = [];
    for (let minute = opens; minute + service.duration <= closes; minute += setting.slotStep) {
      const start = localInstant(dto.date, minute, setting.timeZone);
      if (!start || start <= now || !closing) continue;
      const end = new Date(start.getTime() + service.duration * 60000);
      if (end <= closing && !isOccupied(start, end, [...busy,...breaks])) slots.push(start.toISOString());
    }
    return { service, slots };
  }

  async slots(organizationId: string, dto: SalonSlotsDto) {
    const setting = await this.published(organizationId);
    return { slots: (await this.available(this.db, organizationId, dto, setting)).slots, timeZone: setting.timeZone };
  }

  async publicCreate(organizationId: string, dto: PublicSalonBookingDto) {
    if (dto.personalDataConsent !== true || !dto.firstName.trim()) throw new BadRequestException('Укажите имя и согласие на обработку данных');
    const phone = dto.phone.replace(/\D/g, '');
    if (phone.length < 8 || phone.length > 15) throw new BadRequestException('Укажите корректный телефон');
    return this.db.$transaction(async tx => {
      await this.lock(tx, organizationId);
      const setting = await this.published(organizationId, tx);
      const { service, slots } = await this.available(tx, organizationId, dto, setting);
      if (!slots.includes(dto.startTime)) throw new ConflictException('Это время уже недоступно. Выберите другой слот.');
      const existing = await tx.b2BClient.findFirst({ where: { organizationId, phone: { in: [...new Set([phone, `+${phone}`, dto.phone.trim()])] }, status: 'ACTIVE' } });
      // Existing personal data is neither returned nor overwritten by an anonymous caller.
      const client = existing || await tx.b2BClient.create({ data: { organizationId, firstName: dto.firstName.trim(), phone, consentPersonalDataAt: new Date() } });
      const start = new Date(dto.startTime);
      const booking = await tx.b2BBooking.create({ data: { organizationId, clientId: client.id, serviceId: service.id, masterMemberId: dto.masterMemberId, startTime: start, endTime: new Date(start.getTime() + service.duration * 60000), status: B2BBookingStatus.NEW, notes: 'Создано через онлайн-запись' }, select: { id: true, startTime: true, endTime: true, status: true } });
      return { ...booking, serviceName: service.name, timeZone: setting.timeZone };
    });
  }

  async create(organizationId: string, dto: CreateB2BBookingDto) {
    return this.db.$transaction(async tx => {
      await this.lock(tx, organizationId);
      const [client, service] = await Promise.all([
        tx.b2BClient.findFirst({ where: { id: dto.clientId, organizationId, status: 'ACTIVE' } }),
        tx.b2BService.findFirst({ where: { id: dto.serviceId, organizationId, isActive: true } }),
      ]);
      if (!client || !service) throw new NotFoundException('Клиент или услуга недоступны в этой организации');
      const start = new Date(dto.startTime), end = new Date(start.getTime() + service.duration * 60000);
      if (!Number.isFinite(start.getTime()) || start < new Date(Date.now() - 60000)) throw new BadRequestException('Нельзя создать запись в прошлом или с некорректной датой');
      await this.checkMaster(tx, organizationId, dto.masterMemberId, start, end);
      return tx.b2BBooking.create({ data: { organizationId, clientId: dto.clientId, serviceId: dto.serviceId, masterMemberId: dto.masterMemberId || null, startTime: start, endTime: end, notes: dto.notes }, include: included });
    });
  }

  private async checkMaster(tx: Prisma.TransactionClient, organizationId: string, masterId: string | null | undefined, start: Date, end: Date, except?: string, enforceSchedule = true) {
    // Once a per-day schedule is configured, every create/move writer observes it.
    // Existing legacy visits remain visible and may be completed/cancelled.
    const setting=enforceSchedule ? await tx.salonBookingSetting.findUnique({where:{organizationId}}) : null;
    const rows=Array.isArray(setting?.weeklySchedule)?setting.weeklySchedule:[];
    if(setting&&rows.length){
      const day=dateKey(start,setting.timeZone),weekday=new Date(`${day}T12:00:00Z`).getUTCDay();
      const row=(rows.find((value:any)=>value.day===weekday)||setting) as any;
      const opens=localInstant(day,row.startMinute,setting.timeZone),closes=localInstant(day,row.endMinute,setting.timeZone);
      if(!setting.workingDays.includes(weekday)||!opens||!closes||start<opens||end>closes)throw new ConflictException('Время записи вне рабочего графика');
      const pauses=(row.breaks||[]).map((pause:any)=>({startTime:localInstant(day,pause.startMinute,setting.timeZone),endTime:localInstant(day,pause.endMinute,setting.timeZone)})).filter((pause:any)=>pause.startTime&&pause.endTime);
      if(isOccupied(start,end,pauses))throw new ConflictException('Запись пересекает перерыв');
    }
    if (!masterId) return;
    if (!await tx.organizationMember.findFirst({ where: { id: masterId, organizationId, isActive: true } })) throw new NotFoundException('Мастер недоступен в этой организации');
    if (await tx.b2BBooking.findFirst({ where: { organizationId, masterMemberId: masterId, ...(except ? { id: { not: except } } : {}), status: { notIn: unavailable }, startTime: { lt: end }, endTime: { gt: start } } })) throw new ConflictException('У выбранного мастера это время уже занято');
  }

  async update(organizationId: string, id: string, dto: UpdateB2BBookingDto) {
    return this.db.$transaction(async tx => {
      await this.lock(tx, organizationId);
      const booking = await tx.b2BBooking.findFirst({ where: { id, organizationId }, include: { service: true } });
      if (!booking) throw new NotFoundException('Запись не найдена');
      const changingTime = Boolean(dto.startTime && dto.startTime !== booking.startTime.toISOString());
      const changingMaster = dto.masterMemberId !== undefined && dto.masterMemberId !== booking.masterMemberId;
      if (booking.status === B2BBookingStatus.COMPLETED && (changingTime || changingMaster || (dto.status && dto.status !== booking.status))) throw new BadRequestException('Завершённый визит нельзя переносить или повторно завершать');
      const start = dto.startTime ? new Date(dto.startTime) : booking.startTime;
      if (!Number.isFinite(start.getTime()) || (changingTime && start < new Date(Date.now() - 60000))) throw new BadRequestException('Нельзя перенести запись в прошлое');
      // Preserve stored duration if only changing status/notes/master.
      const end = new Date(start.getTime() + (booking.endTime.getTime() - booking.startTime.getTime()));
      const masterId = dto.masterMemberId !== undefined ? dto.masterMemberId : booking.masterMemberId;
      const status = dto.status || booking.status;
      if (!unavailable.includes(status as typeof unavailable[number])) await this.checkMaster(tx, organizationId, masterId, start, end, id, changingTime || changingMaster || unavailable.includes(booking.status as typeof unavailable[number]));
      const updated = await tx.b2BBooking.update({ where: { id }, data: { status: dto.status, masterMemberId: dto.masterMemberId, startTime: dto.startTime ? start : undefined, endTime: dto.startTime ? end : undefined, notes: dto.notes }, include: included });
      if (status === B2BBookingStatus.COMPLETED && booking.status !== status) await tx.b2BClient.update({ where: { id: booking.clientId }, data: { lastVisitAt: booking.startTime, totalVisits: { increment: 1 }, totalSpent: { increment: booking.service.price } } });
      return updated;
    });
  }
}
