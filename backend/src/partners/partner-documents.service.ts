import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PartnerDocumentSettingsDto, PartnerDocumentTemplateDto, PartnerGenerateDocumentsDto, PartnerLegalEntityDto, PartnerLegalProfileDto } from './partner-documents.dto';

const TEMPLATE_VERSION = 'partner-docs-2026-10-v1-draft';
const esc = (value: unknown) => String(value ?? '—').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const money = (value: unknown) => `${Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} руб.`;
const date = (value = new Date()) => value.toLocaleDateString('ru-RU');

@Injectable()
export class PartnerDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureDefaultTemplates() {
    const defaults = [
      { key: 'default-pep-consent', type: 'PEP_CONSENT', title: 'Согласие на применение простой электронной подписи', body: '<p><b>Черновик для юридической проверки.</b></p><p>Участник: {{partner_name}}, ИНН {{partner_inn}}, адрес: {{partner_address}}.</p><p>Участник и {{company_name}} (ИНН {{company_inn}}) согласуют применение простой электронной подписи для документов: договора, приложений и заданий, актов и заявлений на выплату.</p><p>Ключом простой электронной подписи является одноразовый код, направленный на подтверждённый номер телефона участника. Участник обязуется сохранять код в тайне. Документ считается подписанным после ввода кода в кабинете и фиксации системой номера телефона, документа, времени и результата проверки кода. Стороны получают доступ к подписанному экземпляру и журналу событий.</p><p>Телефон для подписания: ____________________. Согласие действует до отзыва в порядке, согласованном сторонами.</p>' },
      { key: 'default-service-agreement', type: 'SERVICE_AGREEMENT', title: 'Договор оказания информационных услуг', body: '<p><b>Черновик для юридической проверки.</b></p><p>{{company_name}}, ИНН {{company_inn}}, адрес: {{company_address}}, далее «Заказчик», и {{partner_name}}, ИНН {{partner_inn}}, адрес: {{partner_address}}, далее «Исполнитель», заключили договор оказания информационных услуг.</p><h2>Предмет договора</h2><p>Исполнитель оказывает согласованные информационные и рекламно-информационные услуги по программе «{{program_kind}}». Состав, сроки, каналы и критерии результата определяются заданием или приложением.</p><h2>Вознаграждение и расчёты</h2><p>Условия вознаграждения: {{reward_terms}}. Порядок подтверждения результата и срок оплаты фиксируются в задании и акте.</p><h2>Статус исполнителя и документы</h2><p>Исполнитель самостоятельно исполняет обязанности, связанные со своим налоговым статусом, сообщает об изменениях и передаёт документы, предусмотренные согласованным порядком.</p><h2>Электронный документооборот</h2><p>Обмен и подписание электронных документов по SMS применяются только после подписания отдельного согласия на ПЭП и включения соответствующего процесса в кабинете.</p><p>Номер {{document_number}}. Период действия и порядок разрешения споров стороны заполняют до подписания.</p>' },
      { key: 'default-reward-schedule', type: 'REWARD_SCHEDULE', title: 'Задание и условия вознаграждения', body: '<p><b>Черновик для юридической проверки.</b></p><p>Заказчик: {{company_name}}, ИНН {{company_inn}}. Исполнитель: {{partner_name}}, ИНН {{partner_inn}}.</p><p>Программа: {{program_kind}}. Период задания: {{period_start}} — {{period_end}}.</p><p>Условия вознаграждения: {{reward_terms}}.</p><p>Каналы, перечень материалов, требования к размещению и способ подтверждения результата: ______________________________________________.</p><p>Правила атрибуции, возвратов, отмен, удержания и приёмки результата согласуются сторонами в этом задании до начала оказания услуг.</p><p>Номер задания: {{document_number}}.</p>' },
      { key: 'default-service-act', type: 'SERVICE_ACT', title: 'Акт оказанных информационных услуг', body: '<p><b>Черновик для юридической проверки.</b></p><p>Заказчик: {{company_name}}, ИНН {{company_inn}}. Исполнитель: {{partner_name}}, ИНН {{partner_inn}}.</p><p>Период оказания услуг: {{period_start}} — {{period_end}}. Программа: {{program_kind}}.</p><p>Оказанные услуги и подтверждённый результат: ______________________________________________.</p><p>Сумма вознаграждения: {{reward_amount}}. Замечания Заказчика: ______________________________________________.</p><p>Настоящий акт подтверждает только фактически оказанные и принятые услуги, указанные сторонами.</p><p>Номер акта: {{document_number}}.</p>' },
      { key: 'default-payout-request', type: 'PAYOUT_REQUEST', title: 'Заявление на выплату вознаграждения', body: '<p><b>Черновик для юридической проверки.</b></p><p>Заказчик: {{company_name}}, ИНН {{company_inn}}. Получатель: {{partner_name}}, ИНН {{partner_inn}}, адрес: {{partner_address}}.</p><p>Прошу выплатить вознаграждение по программе «{{program_kind}}» в сумме {{payout_amount}}.</p><p>Основание и номер заявки на выплату: ______________________________________________.</p><p>Банковские реквизиты получателя указываются в защищённом платёжном процессе и не включаются в этот документ.</p><p>Дата: {{period_end}}. Номер документа: {{document_number}}.</p>' },
    ];
    for (const item of defaults) {
      const active = await this.prisma.partnerDocumentTemplateVersion.findFirst({ where: { documentType: item.type, isActive: true, audience: 'ALL', taxStatus: 'ALL', entityType: 'ALL' }, select: { id: true } });
      if (!active) await this.prisma.partnerDocumentTemplateVersion.upsert({ where: { templateKey_version: { templateKey: item.key, version: 1 } }, create: { templateKey: item.key, version: 1, documentType: item.type, title: item.title, bodyHtml: item.body, audience: 'ALL', taxStatus: 'ALL', entityType: 'ALL', isActive: true }, update: { isActive: true } });
    }
  }

  private async participant(userId: string, kind: string) {
    if (!['REFERRAL', 'BLOGGER'].includes(kind)) throw new BadRequestException('Неизвестная партнёрская программа');
    const participant = await this.prisma.partnerParticipant.findUnique({ where: { userId_kind: { userId, kind } } });
    if (!participant || !['ACTIVE', 'PENDING'].includes(participant.status)) throw new ForbiddenException('Сначала подайте заявку на участие в партнёрской программе');
    return participant;
  }

  async workspace(userId: string, kind: string) {
    const participant = await this.participant(userId, kind);
    const [legalProfile, entities, documents] = await Promise.all([
      this.prisma.partnerLegalProfile.findUnique({ where: { userId }, select: { id: true, taxStatus: true, fullName: true, inn: true, ogrnip: true, address: true, updatedAt: true } }),
      this.prisma.partnerLegalEntity.findMany({ where: { isActive: true }, select: { id: true, entityType: true, legalName: true, inn: true, kpp: true, ogrn: true, ogrnip: true, address: true, signerName: true, signerTitle: true, signerBasis: true, email: true }, orderBy: [{ entityType: 'asc' }, { legalName: 'asc' }] }),
      this.prisma.partnerGeneratedDocument.findMany({ where: { participantId: participant.id }, select: { id: true, documentType: true, title: true, fileName: true, status: true, templateVersion: true, createdAt: true, entity: { select: { legalName: true, entityType: true } } }, orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);
    return { legalProfile, entities, documents, signingEnabled: false, templateStatus: 'DRAFT_LEGAL_REVIEW' };
  }

  async saveProfile(userId: string, dto: PartnerLegalProfileDto) {
    if (dto.taxStatus === 'SELF_EMPLOYED' && dto.ogrnip) throw new BadRequestException('Для профиля плательщика НПД ОГРНИП указывать не нужно');
    if (dto.taxStatus === 'INDIVIDUAL_ENTREPRENEUR' && !dto.ogrnip) throw new BadRequestException('Для ИП укажите ОГРНИП');
    if (dto.taxStatus === 'SELF_EMPLOYED' && dto.inn.length !== 12) throw new BadRequestException('ИНН плательщика НПД физического лица должен содержать 12 цифр');
    if (dto.taxStatus === 'INDIVIDUAL_ENTREPRENEUR' && ![10, 12].includes(dto.inn.length)) throw new BadRequestException('Проверьте ИНН ИП');
    return this.prisma.partnerLegalProfile.upsert({ where: { userId }, create: { userId, ...dto }, update: dto, select: { taxStatus: true, fullName: true, inn: true, ogrnip: true, address: true, updatedAt: true } });
  }

  async adminEntities() {
    return this.prisma.partnerLegalEntity.findMany({ orderBy: [{ isActive: 'desc' }, { entityType: 'asc' }, { legalName: 'asc' }] });
  }

  async adminWorkspace() {
    await this.ensureDefaultTemplates();
    const [entities, templates, settings, sms] = await Promise.all([
      this.adminEntities(),
      this.prisma.partnerDocumentTemplateVersion.findMany({ orderBy: [{ documentType: 'asc' }, { templateKey: 'asc' }, { version: 'desc' }] }),
      this.prisma.partnerDocumentSettings.upsert({ where: { id: 'default' }, create: { id: 'default' }, update: {} }),
      this.prisma.ecosystemIntegration.findUnique({ where: { key: 'SMS_AERO' }, select: { isEnabled: true, status: true, configuredSecretKeys: true, config: true, lastTestAt: true, lastTestMessage: true } }),
    ]);
    const smsConfig = sms?.config as Record<string, unknown> | null;
    return { entities, templates, settings, smsIntegration: sms ? { isEnabled: sms.isEnabled, status: sms.status, configured: sms.configuredSecretKeys.includes('apiKey') && Boolean(smsConfig?.email) && Boolean(smsConfig?.signature), senderConfigured: Boolean(smsConfig?.signature), lastTestAt: sms.lastTestAt, lastTestMessage: sms.lastTestMessage } : null, signingWorkflowAvailable: false };
  }

  async adminParticipants(search = '') {
    const q = search.trim();
    const participants = await this.prisma.partnerParticipant.findMany({
      where: { ...(q ? { OR: [{ displayName: { contains: q, mode: 'insensitive' } }, { code: { contains: q, mode: 'insensitive' } }, { user: { email: { contains: q, mode: 'insensitive' } } }] } : {}), status: { in: ['ACTIVE', 'PENDING'] } },
      select: { id: true, userId: true, kind: true, status: true, displayName: true, code: true, user: { select: { email: true } } },
      orderBy: [{ kind: 'asc' }, { displayName: 'asc' }], take: 100,
    });
    return participants;
  }

  async saveTemplate(dto: PartnerDocumentTemplateDto) {
    const documentTypes = ['PEP_CONSENT', 'SERVICE_AGREEMENT', 'REWARD_SCHEDULE', 'SERVICE_ACT', 'PAYOUT_REQUEST'];
    if (!documentTypes.includes(dto.documentType)) throw new BadRequestException('Неизвестный тип документа');
    const tokens = [...dto.title.matchAll(/{{\s*([a-z_]+)\s*}}/gi), ...dto.bodyHtml.matchAll(/{{\s*([a-z_]+)\s*}}/gi)].map((match) => match[1]);
    const allowed = new Set(['partner_name', 'partner_inn', 'partner_address', 'program_kind', 'company_name', 'company_inn', 'company_address', 'reward_terms', 'period_start', 'period_end', 'document_number', 'reward_amount', 'payout_amount']);
    if (tokens.some((token) => !allowed.has(token))) throw new BadRequestException('Шаблон содержит неподдерживаемую переменную');
    const templateKey = dto.templateKey?.trim() || `custom-${randomBytes(5).toString('hex')}`;
    const version = (await this.prisma.partnerDocumentTemplateVersion.aggregate({ where: { templateKey }, _max: { version: true } }))._max.version ?? 0;
    return this.prisma.$transaction(async (tx) => {
      if (dto.isActive) await tx.partnerDocumentTemplateVersion.updateMany({ where: { documentType: dto.documentType, audience: dto.audience || 'ALL', taxStatus: dto.taxStatus || 'ALL', entityType: dto.entityType || 'ALL', isActive: true }, data: { isActive: false } });
      return tx.partnerDocumentTemplateVersion.create({ data: { templateKey, version: version + 1, documentType: dto.documentType, title: dto.title, bodyHtml: dto.bodyHtml, audience: dto.audience || 'ALL', taxStatus: dto.taxStatus || 'ALL', entityType: dto.entityType || 'ALL', isActive: dto.isActive ?? false } });
    });
  }

  async activateTemplate(id: string) {
    const target = await this.prisma.partnerDocumentTemplateVersion.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Версия шаблона не найдена');
    return this.prisma.$transaction(async (tx) => {
      await tx.partnerDocumentTemplateVersion.updateMany({ where: { documentType: target.documentType, audience: target.audience, taxStatus: target.taxStatus, entityType: target.entityType, isActive: true }, data: { isActive: false } });
      return tx.partnerDocumentTemplateVersion.update({ where: { id }, data: { isActive: true } });
    });
  }

  async saveDocumentSettings(dto: PartnerDocumentSettingsDto) {
    if (dto.pepEnabled) throw new BadRequestException('SMS-ПЭП нельзя включить, пока не реализован и не проверен полный процесс подписания');
    const knownTypes = ['SERVICE_AGREEMENT', 'REWARD_SCHEDULE', 'SERVICE_ACT', 'PAYOUT_REQUEST'];
    if (dto.eligibleDocumentTypes?.some((type) => !knownTypes.includes(type))) throw new BadRequestException('В список можно добавить только договор, приложение, акт и заявление на выплату');
    return this.prisma.partnerDocumentSettings.upsert({ where: { id: 'default' }, create: { id: 'default', ...dto, pepEnabled: false }, update: { ...dto, pepEnabled: false } });
  }

  async adminGenerate(dto: PartnerGenerateDocumentsDto & { participantId: string }) {
    const participant = await this.prisma.partnerParticipant.findUnique({ where: { id: dto.participantId }, select: { userId: true, kind: true } });
    if (!participant) throw new NotFoundException('Партнёр не найден');
    return this.generate(participant.userId, participant.kind, dto);
  }

  async saveEntity(dto: PartnerLegalEntityDto, id?: string) {
    if (dto.entityType === 'LLC' && (!dto.kpp || !dto.ogrn)) throw new BadRequestException('Для ООО необходимы КПП и ОГРН');
    if (dto.entityType === 'IP' && (!dto.ogrnip || dto.kpp || dto.ogrn)) throw new BadRequestException('Для ИП укажите ОГРНИП; КПП и ОГРН не используются');
    if (id) {
      const existing = await this.prisma.partnerLegalEntity.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Профиль юридического лица не найден');
      return this.prisma.partnerLegalEntity.update({ where: { id }, data: dto });
    }
    return this.prisma.partnerLegalEntity.create({ data: dto });
  }

  async generate(userId: string, kind: string, dto: PartnerGenerateDocumentsDto) {
    const participant = await this.participant(userId, kind);
    const [profile, entity, settings] = await Promise.all([
      this.prisma.partnerLegalProfile.findUnique({ where: { userId } }),
      this.prisma.partnerLegalEntity.findUnique({ where: { id: dto.entityId } }),
      this.prisma.partnerProgramSetting.findUnique({ where: { kind } }),
    ]);
    if (!profile) throw new BadRequestException('Сначала заполните данные исполнителя: НПД или ИП');
    if (!entity?.isActive) throw new BadRequestException('Выберите активные реквизиты SARKISIAN');
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodStart = monthStart.toLocaleDateString('ru-RU');
    const periodEnd = date(now);
    const agreementNumber = `P-${participant.code}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const [periodRewards, latestPayout, availableRewards] = await Promise.all([
      this.prisma.partnerReward.aggregate({ where: { participantId: participant.id, status: 'APPROVED', unit: 'RUB', createdAt: { gte: monthStart, lte: now } }, _sum: { amount: true }, _count: { _all: true } }),
      this.prisma.partnerPayout.findFirst({ where: { participantId: participant.id, status: 'REQUESTED' }, orderBy: { createdAt: 'desc' } }),
      this.prisma.partnerReward.aggregate({ where: { participantId: participant.id, status: 'APPROVED', unit: 'RUB' }, _sum: { amount: true } }),
    ]);
    const provider = `${entity.legalName}, ИНН ${entity.inn}${entity.kpp ? `, КПП ${entity.kpp}` : ''}, ${entity.entityType === 'IP' ? `ОГРНИП ${entity.ogrnip}` : `ОГРН ${entity.ogrn}`}, адрес: ${entity.address}; в лице ${entity.signerName}${entity.signerTitle ? `, ${entity.signerTitle}` : ''}, действующего на основании ${entity.signerBasis}`;
    const performer = `${profile.fullName}, ${profile.taxStatus === 'SELF_EMPLOYED' ? 'физическое лицо — плательщик НПД' : `индивидуальный предприниматель, ОГРНИП ${profile.ogrnip}`}, ИНН ${profile.inn}, адрес: ${profile.address}`;
    const payTerms = kind === 'REFERRAL'
      ? `${settings?.customerRewardMode === 'PERCENT' ? `${settings.rewardPercent}% от базы каждой подтверждённой B2C-покупки по правилам программы` : `${money(settings?.fixedCustomerRewardAmount)} за первого привлечённого B2C-клиента после выполнения правил программы`}; за подключённый и активированный салон — фиксированно ${money(settings?.signupRewardAmount)}.`
      : `${settings?.rewardPercent ?? 0}% от базы подтверждённых B2C-покупок по правилам программы; за подключённую организацию — ${money(settings?.signupRewardAmount)} ${settings?.signupRewardUnit === 'BONUS' ? 'бонусами' : 'денежными средствами'} после проверки и активации.`;
    const draft = '<div class="draft">ПРОЕКТ ШАБЛОНА — НЕ УТВЕРЖДЁН ДЛЯ ПОДПИСАНИЯ. Перед запуском требуется правовая и налоговая проверка.</div>';
    const page = (title: string, body: string) => `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font:12pt "Times New Roman",serif;line-height:1.45;color:#111;margin:22mm}h1{text-align:center;font-size:16pt}h2{font-size:13pt;margin-top:20pt}.draft{border:2px solid #b3261e;color:#b3261e;font:bold 10pt Arial;padding:10px;text-align:center;margin-bottom:20px}p{text-align:justify}.sign{display:flex;justify-content:space-between;gap:30px;margin-top:38px}.sign>div{width:48%}@media print{.draft{color:#b3261e}}</style></head><body>${draft}<h1>${esc(title)}</h1>${body}<div class="sign"><div>Заказчик:<br>${esc(provider)}<br><br>________________ / ${esc(entity.signerName)} /</div><div>Исполнитель:<br>${esc(performer)}<br><br>________________ / ${esc(profile.fullName)} /</div></div></body></html>`;
    const common = `<p>г. ____________ &nbsp;&nbsp; «___» __________ 20___ г.</p><p><b>Заказчик:</b> ${esc(provider)}, с одной стороны, и <b>Исполнитель:</b> ${esc(performer)}, с другой стороны, совместно именуемые Стороны, подготовили настоящий проект документа.</p>`;
    const pep = page('Соглашение об использовании простой электронной подписи', `${common}<p>Стороны согласуют применение простой электронной подписи в личном кабинете для подписания перечисленных в соглашении электронных документов. Правила должны определять способ идентификации подписанта и обязанность сохранять конфиденциальность ключа простой электронной подписи.</p><p>В проекте предполагается одноразовый код, направляемый на подтверждённый номер телефона. До включения SMS-подписания необходимо настроить проверку номера, срок действия кода, защиту от повторного использования, журнал событий, выдачу подписанного экземпляра и порядок отзыва доступа.</p><p>Подписание настоящего документа и любых последующих документов через SMS в системе пока не подключено. Этот файл — форма для согласования условий.</p><p>Номер телефона Исполнителя: ____________________</p>`);
    const agreement = page('Договор возмездного оказания информационных услуг', `${common}<h2>1. Предмет</h2><p>Исполнитель оказывает информационные и рекламно-информационные услуги, а Заказчик принимает и оплачивает оказанные услуги. Конкретные действия, каналы, период, критерии результата и вознаграждение указываются в задании/приложении.</p><p>Исполнитель самостоятельно определяет способы оказания услуг, не действует от имени Заказчика, не принимает оплату от покупателей и не заключает сделки за Заказчика.</p><h2>2. Вознаграждение и расчёты</h2><p>Размер и порядок расчёта вознаграждения устанавливаются подписанным приложением. Выплата производится после проверки отчёта/результатов и получения необходимых документов. Суммы и фактические начисления отражаются в кабинете.</p><h2>3. Статус Исполнителя и документы</h2><p>Исполнитель сообщает об изменении налогового статуса. Для НПД порядок формирования и передачи чека определяется применимыми требованиями закона и согласованным процессом. Для ИП Исполнитель указывает предпринимательский статус и самостоятельно исполняет налоговые обязанности.</p><p>Применение НПД допустимо только при соблюдении предусмотренных законом ограничений. До утверждения модели услуг необходимо отдельно проверить, что фактические действия Исполнителя не являются запрещённой для НПД посреднической деятельностью.</p><h2>4. Отчёт и акт</h2><p>Отчётный период: ____________. Состав услуг и подтверждающие данные указываются в акте. Порядок приёмки, срок возражений и последствия молчания требуют заполнения и юридической проверки до публикации.</p><h2>5. Электронный документооборот</h2><p>Электронная подпись применяется только после отдельного согласования правил идентификации и конфиденциальности ПЭП, настройки системы и утверждения текста соглашения.</p><h2>6. Срок и реквизиты</h2><p>Срок договора: с ____________ по ____________. Реквизиты Сторон и порядок разрешения споров должны быть окончательно заполнены до подписания.</p>`);
    const schedule = page('Приложение. Задание и условия вознаграждения', `${common}<p>Вид партнёрской программы: ${kind === 'REFERRAL' ? 'реферальная программа' : 'программа блогеров'}.</p><p>Содержание услуг: информирование аудитории о товарах/сервисах SARKISIAN и размещение согласованных материалов в указанных каналах.</p><p>Вознаграждение: ${esc(payTerms)}</p><p>Атрибуция: окно ${esc(settings?.attributionDays ?? 'не задано')} дней; проверка начисления ${esc(settings?.holdDays ?? 'не задано')} дней; минимальная сумма заказа ${money(settings?.minimumOrderAmount)}.</p><p>Каналы/ссылки, период, форматы и отчёт: ______________________________________________</p><p>Определение базы начисления, исключения для возвратов/отмен, порядок подтверждения результата и применимость налогового режима НПД должны быть согласованы до подписания.</p>`);
    const act = page('Акт оказанных информационных услуг', `${common}<p>Акт № ${esc(agreementNumber)} за период с ${esc(periodStart)} по ${esc(periodEnd)} по договору № ${esc(agreementNumber)}.</p><p>Перечень услуг: информационные услуги в рамках программы «${kind === 'REFERRAL' ? 'Рефералы' : 'Блогеры'}», описание условий и каналов — в приложении к договору.</p><p>Результат по данным кабинета: ${esc(periodRewards._count._all)} подтверждённых начислений за период.</p><p>Расчёт вознаграждения по подтверждённым начислениям: ${esc(money(periodRewards._sum.amount))}.</p><p>Номер и дата чека НПД (если применимо): ______________________________________________</p><p>Замечания Заказчика: _________________________________________________________________</p>`);
    const payoutAmount = latestPayout ? money(latestPayout.amount) : '__________________ руб. (укажите сумму одобренной заявки)';
    const payout = page('Заявление на выплату вознаграждения', `${common}<p>Заявление сформировано ${esc(periodEnd)} по договору № ${esc(agreementNumber)}.</p><p>Основание: заявка в кабинете ${latestPayout ? `№ ${esc(latestPayout.id)}` : '№ __________________'}.</p><p>Прошу выплатить вознаграждение в размере: ${esc(payoutAmount)}. Общий подтверждённый остаток на дату формирования — ${esc(money(availableRewards._sum.amount))}.</p><p>Получатель: ${esc(profile.fullName)}; ИНН: ${esc(profile.inn)}. Банковские реквизиты указываются Исполнителем при подписании/в защищённом платёжном канале и в этом файле не хранятся.</p><p>Подтверждающие документы: акт/отчёт; чек НПД — если применимо; иные документы по согласованному порядку.</p>`);
    const docs = [
      ['PEP_CONSENT', 'Соглашение о простой электронной подписи', 'pep-consent.doc', pep],
      ['SERVICE_AGREEMENT', 'Договор информационных услуг', 'service-agreement.doc', agreement],
      ['REWARD_SCHEDULE', 'Приложение с заданием и вознаграждением', 'reward-schedule.doc', schedule],
      ['SERVICE_ACT', 'Акт оказанных услуг', 'service-act.doc', act],
      ['PAYOUT_REQUEST', 'Заявление на выплату', 'payout-request.doc', payout],
    ] as const;
    await this.ensureDefaultTemplates();
    const templates = await this.prisma.partnerDocumentTemplateVersion.findMany({ where: { isActive: true, documentType: { in: docs.map(([type]) => type) }, audience: { in: ['ALL', kind] }, taxStatus: { in: ['ALL', profile.taxStatus] }, entityType: { in: ['ALL', entity.entityType] } }, orderBy: { version: 'desc' } });
    const replacements: Record<string, string> = {
      partner_name: profile.fullName, partner_inn: profile.inn, partner_address: profile.address,
      program_kind: kind === 'REFERRAL' ? 'Реферальная программа' : 'Программа блогеров', company_name: entity.legalName,
      company_inn: entity.inn, company_address: entity.address, reward_terms: payTerms, period_start: periodStart,
      period_end: periodEnd, document_number: agreementNumber, reward_amount: money(periodRewards._sum.amount),
      payout_amount: latestPayout ? money(latestPayout.amount) : '',
    };
    const render = (source: string) => source.replace(/{{\s*([a-z_]+)\s*}}/gi, (_match, key: string) => esc(replacements[key] ?? ''));
    const created: any[] = [];
    for (const [documentType, title, filename, contentHtml] of docs) {
      const template = templates.filter((item) => item.documentType === documentType).sort((a, b) => {
        const specificity = (item: typeof a) => Number(item.audience !== 'ALL') + Number(item.taxStatus !== 'ALL') + Number(item.entityType !== 'ALL');
        return specificity(b) - specificity(a) || b.version - a.version;
      })[0];
      const generatedTitle = template ? render(template.title) : title;
      const generatedContent = template ? `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${esc(generatedTitle)}</title></head><body><h1>${esc(generatedTitle)}</h1>${render(template.bodyHtml)}</body></html>` : contentHtml;
      created.push(await this.prisma.partnerGeneratedDocument.create({ data: { participantId: participant.id, entityId: entity.id, documentType, title: generatedTitle, fileName: `${kind.toLowerCase()}-${date().replace(/\./g, '-')}-${filename}`, status: 'DRAFT_LEGAL_REVIEW', templateVersion: template ? `${template.templateKey}-v${template.version}` : TEMPLATE_VERSION, contentHtml: generatedContent } }));
    }
    return created.map(({ id, documentType, title, fileName, status, templateVersion, createdAt }) => ({ id, documentType, title, fileName, status, templateVersion, createdAt }));
  }

  async download(userId: string, id: string) {
    const doc = await this.prisma.partnerGeneratedDocument.findFirst({ where: { id, participant: { userId } } });
    if (!doc) throw new NotFoundException('Документ не найден');
    return doc;
  }

  async adminDownload(id: string) {
    const doc = await this.prisma.partnerGeneratedDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Документ не найден');
    return doc;
  }
}
