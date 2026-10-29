<script setup lang="ts">
import { ArrowLeft, Check, FileSignature, Plus, Save, RefreshCw, Download, ShieldCheck, FileText, Building2, Search, ChevronRight } from '@lucide/vue';
import PartnerLegalEntitiesPage from './PartnerLegalEntitiesPage.vue';

type Template = { id: string; templateKey: string; version: number; documentType: string; title: string; bodyHtml: string; audience: string; taxStatus: string; entityType: string; isActive: boolean };
const config = useRuntimeConfig();
const { token } = useWorkspaceSession();
const sectionValue = ref('templates');
const section = computed({ get: () => sectionValue.value, set: (value: string) => { if (value === sectionValue.value || !canLeaveEditor()) return; if (editingDirty.value) editing.value = null; if (settingsDirty.value && workspace.value) Object.assign(settings, workspace.value.settings); sectionValue.value = value; } });
const documentTabs = [['templates', 'Шаблоны'], ['generator', 'Генератор'], ['signature', 'SMS-подпись'], ['entities', 'Реквизиты']] as const;
const busy = ref(false), loading = ref(false), error = ref(''), notice = ref('');
const workspace = ref<any>(null);
const participants = ref<any[]>([]), search = ref('');
const selectedParticipant = ref(''), entityId = ref('');
const generated = ref<any[]>([]);
const legalDirty = ref(false);
const editing = ref<any>(null);
const editingBaseline = ref(''), settingsBaseline = ref('');
const editingDirty = computed(() => Boolean(editing.value) && JSON.stringify(editing.value) !== editingBaseline.value);
const editorPanel = ref<HTMLElement | null>(null);
const participantLoading = ref(false);
const selectedPerson = computed(() => participants.value.find(person => person.id === selectedParticipant.value));
const activeEntities = computed<any[]>(() => (workspace.value?.entities || []).filter((entity: any) => entity.isActive));
const selectedEntity = computed(() => activeEntities.value.find(entity => entity.id === entityId.value));
let participantVersion = 0;
const settings = reactive({ pepEnabled: false, providerKey: 'SMS_AERO', codeTtlSeconds: 300, maxAttempts: 5, resendCooldownSeconds: 60, consentRequired: true, eligibleDocumentTypes: ['SERVICE_AGREEMENT', 'REWARD_SCHEDULE', 'SERVICE_ACT', 'PAYOUT_REQUEST'] as string[] });
const settingsDirty = computed(() => Boolean(settingsBaseline.value) && JSON.stringify(settings) !== settingsBaseline.value);
function canLeaveEditor() { return !busy.value && (!(editingDirty.value || settingsDirty.value || legalDirty.value) || window.confirm('Есть несохранённые изменения документа, реквизитов или SMS-настроек. Продолжить без сохранения?')); }
function closeEditor() { if (canLeaveEditor()) editing.value = null; }
onBeforeRouteLeave(canLeaveEditor);
const labels: Record<string,string> = { PEP_CONSENT: 'Согласие на ПЭП', SERVICE_AGREEMENT: 'Договор услуг', REWARD_SCHEDULE: 'Задание и вознаграждение', SERVICE_ACT: 'Акт услуг', PAYOUT_REQUEST: 'Заявление на выплату' };
const tokens = [
  { key: 'partner_name', label: 'ФИО партнёра' }, { key: 'partner_inn', label: 'ИНН партнёра' },
  { key: 'partner_address', label: 'Адрес партнёра' }, { key: 'program_kind', label: 'Название программы' },
  { key: 'company_name', label: 'Название нашей компании' }, { key: 'company_inn', label: 'ИНН нашей компании' },
  { key: 'company_address', label: 'Адрес нашей компании' }, { key: 'reward_terms', label: 'Условия вознаграждения' },
  { key: 'period_start', label: 'Начало периода' }, { key: 'period_end', label: 'Конец периода' },
  { key: 'document_number', label: 'Номер документа' }, { key: 'reward_amount', label: 'Начислено за период' },
  { key: 'payout_amount', label: 'Сумма к выплате' },
];
const tokenLabel = (name: string) => `{{${name}}}`;
const bodyEditor = ref<HTMLTextAreaElement | null>(null);
function htmlToText(html = '') { return html.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/(p|h[1-6]|li)>/gi, '\n').replace(/<li[^>]*>/gi, '• ').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim(); }
function templateSnippet(html = '') { return htmlToText(html).replace(/{{\s*([a-z_]+)\s*}}/gi, (_: string, key: string) => `[${tokens.find(item => item.key === key)?.label || 'Данные документа'}]`); }
function textToHtml(text = '') { return text.split(/\n\s*\n/).map(paragraph => `<p>${paragraph.trim().split('\n').map(line => line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('<br>')}</p>`).join(''); }
function insertToken(key: string) { const el = bodyEditor.value; const text = editing.value?.bodyText || ''; const start = el?.selectionStart ?? text.length; const end = el?.selectionEnd ?? text.length; const value = `{{${key}}}`; editing.value.bodyText = `${text.slice(0, start)}${value}${text.slice(end)}`; nextTick(() => { el?.focus(); el?.setSelectionRange(start + value.length, start + value.length); }); }
const previewText = computed(() => (editing.value?.bodyText || '').replace(/{{\s*([a-z_]+)\s*}}/gi, (_: string, key: string) => ({ partner_name: 'Анна Иванова', partner_inn: 'ИНН партнёра', partner_address: 'Адрес партнёра', program_kind: 'Реферальная программа', company_name: 'ООО «Саркисян»', company_inn: 'ИНН компании', company_address: 'Адрес компании', reward_terms: '7% от подтверждённых покупок', period_start: '01.10.2026', period_end: '31.10.2026', document_number: 'P-0001', reward_amount: '5 000 ₽', payout_amount: '5 000 ₽' } as Record<string,string>)[key] || `[${key}]`));
const documentTypes = Object.keys(labels);
function api(path: string, options: any = {}) { return $fetch<any>(`/partners/admin/documents${path}`, { baseURL: config.public.apiBase, headers: { Authorization: `Bearer ${token.value}` }, timeout: 30000, ...options }); }
async function load() { if (editingDirty.value || settingsDirty.value) return; loading.value = true; error.value = ''; try { workspace.value = await api('/workspace'); Object.assign(settings, workspace.value.settings); settingsBaseline.value = JSON.stringify(settings); await loadParticipants(); } catch (e: any) { error.value = e?.data?.message || 'Не удалось загрузить настройки документов'; } finally { loading.value = false; } }
async function loadParticipants() { const version = ++participantVersion; participantLoading.value = true; try { const rows = await api(`/participants${search.value ? `?search=${encodeURIComponent(search.value)}` : ''}`); if (version === participantVersion) participants.value = rows; } finally { if (version === participantVersion) participantLoading.value = false; } }
async function searchParticipants() { try { await loadParticipants(); } catch { error.value = 'Не удалось найти партнёров. Повторите поиск.'; } }
function blankTemplate() { return { templateKey: '', documentType: 'SERVICE_AGREEMENT', title: 'Договор оказания информационных услуг', bodyText: 'ДОГОВОР ОКАЗАНИЯ ИНФОРМАЦИОННЫХ УСЛУГ\n\nЗаказчик: {{company_name}}, ИНН {{company_inn}}, адрес: {{company_address}}.\nИсполнитель: {{partner_name}}, ИНН {{partner_inn}}, адрес: {{partner_address}}.\n\nПрограмма: {{program_kind}}.\nУсловия вознаграждения: {{reward_terms}}.\nПериод: {{period_start}} — {{period_end}}.\nНомер документа: {{document_number}}.', audience: 'ALL', taxStatus: 'ALL', entityType: 'ALL', isActive: false } as Partial<Template> & { templateKey: string; bodyText: string } }
function editTemplate(row?: Template) { if (busy.value) return; editing.value = row ? { ...row, bodyText: htmlToText(row.bodyHtml), isActive: false } : blankTemplate(); editingBaseline.value = JSON.stringify(editing.value); nextTick(() => { editorPanel.value?.scrollIntoView({ block: 'start', behavior: 'smooth' }); editorPanel.value?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true }); }); }
async function saveTemplate() { if (busy.value || !editing.value) return; busy.value = true; error.value = ''; try { const body = { ...editing.value, bodyHtml: textToHtml(editing.value.bodyText) }; delete body.id; delete body.version; delete body.bodyText; await api('/templates', { method: 'POST', body }); editing.value = null; notice.value = 'Сохранена новая версия шаблона'; await load(); } catch (e: any) { error.value = Array.isArray(e?.data?.message) ? e.data.message.join('; ') : e?.data?.message || 'Не удалось сохранить шаблон'; } finally { busy.value = false; } }
async function activateTemplate(row: Template) { busy.value = true; error.value = ''; try { await api(`/templates/${row.id}/activate`, { method: 'POST' }); notice.value = `Активирована версия ${row.version}`; await load(); } catch (e: any) { error.value = e?.data?.message || 'Не удалось активировать шаблон'; } finally { busy.value = false; } }
async function saveSettings() { if (busy.value) return; busy.value = true; error.value = ''; try { const result = await api('/settings', { method: 'PATCH', body: { ...settings, pepEnabled: false } }); Object.assign(settings, result); settingsBaseline.value = JSON.stringify(settings); notice.value = 'Настройки SMS-ПЭП сохранены. Подписание останется выключенным до запуска полного процесса.'; await load(); } catch (e: any) { error.value = e?.data?.message || 'Не удалось сохранить настройки'; } finally { busy.value = false; } }
async function generate() { if (!selectedParticipant.value || !entityId.value || busy.value) return; busy.value = true; error.value = ''; generated.value = []; try { generated.value = await api('/generate', { method: 'POST', body: { participantId: selectedParticipant.value, entityId: entityId.value } }); notice.value = `Сформировано документов: ${generated.value.length}`; } catch (e: any) { error.value = e?.data?.message || 'Не удалось сформировать документы'; } finally { busy.value = false; } }
async function download(row: any) { const response = await fetch(`${config.public.apiBase}/partners/admin/documents/download/${row.id}`, { headers: { Authorization: `Bearer ${token.value}` } }); if (!response.ok) { error.value = 'Не удалось скачать документ'; return; } const blob = await response.blob(); const href = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = href; a.download = row.fileName; a.click(); URL.revokeObjectURL(href); }
onMounted(load);
</script>

<template>
  <section class="partner-workspace crm-standard partner-doc-settings crm-management-workspace">
    <header class="crm-page-header">
      <div><h1>Документы партнёров</h1><p>Договоры, акты и заявления для авторов, блогеров и реферальных партнёров.</p></div>
      <button type="button" class="crm-button" :disabled="loading || busy || editingDirty || settingsDirty" @click="load"><RefreshCw :size="17" :class="{ spin: loading }"/> Обновить</button>
    </header>
    <p v-if="error && workspace" class="partner-feedback" role="alert">{{ error }}</p>
    <p v-if="notice" class="partner-feedback" role="status">{{ notice }}</p><p v-if="editingDirty || settingsDirty" class="crm-management-dirty" role="status">Есть несохранённые изменения. Сохраните их перед обновлением страницы.</p>
    <CrmCardTabs v-model="section" prefix="partner-doc" :tabs="documentTabs" label="Разделы документов" />
    <p v-if="loading && !workspace" class="pds-state" role="status"><RefreshCw :size="22" class="spin"/> Загружаем документы и настройки…</p>
    <div v-else-if="!workspace && error" class="pds-empty crm-surface crm-management-error" role="alert"><FileText :size="28"/><h3>Документы недоступны</h3><p>{{error}}</p><button type="button" class="crm-button" @click="load"><RefreshCw :size="16"/> Повторить загрузку</button></div>
    <div v-else-if="section==='entities'" id="partner-doc-entities-panel" role="tabpanel" aria-labelledby="partner-doc-entities-tab"><PartnerLegalEntitiesPage embedded @dirty="legalDirty = $event"/></div>

    <section v-else-if="section==='templates'" id="partner-doc-templates-panel" role="tabpanel" aria-labelledby="partner-doc-templates-tab" class="pds-section">
      <template v-if="!editing">
        <header class="pds-heading"><div><h2>Шаблоны документов</h2><p>Готовые тексты, которые система заполнит данными партнёра и вашей компании.</p></div><button type="button" class="crm-button crm-button--primary" @click="editTemplate()"><Plus :size="17"/> Добавить шаблон</button></header>
        <details class="pds-start-help"><summary>Как работать с шаблонами</summary><p>Откройте шаблон, чтобы посмотреть текст или подготовить новую версию. Уже сформированные документы сохранят прежний текст и реквизиты.</p></details>
        <div class="pds-table">
          <article v-for="item in workspace?.templates" :key="item.id" class="pds-template crm-surface">
            <span class="pds-file-icon"><FileText :size="23"/></span>
            <div class="pds-template-body"><div class="pds-template-top"><span class="pds-kind">{{labels[item.documentType] || item.documentType}}</span><span class="pds-version" :data-active="item.isActive"><Check v-if="item.isActive" :size="12"/>{{item.isActive?'Действует':'Архив'}} · версия {{item.version}}</span></div><h3>{{item.title}}</h3><p>{{item.audience==='ALL'?'Все партнёры':item.audience==='BLOGGER'?'Программа авторов и блогеров':'Реферальная программа'}} · {{item.taxStatus==='ALL'?'Любой налоговый статус':item.taxStatus==='SELF_EMPLOYED'?'Самозанятые':'ИП'}} · {{item.entityType==='ALL'?'От ИП или ООО':item.entityType==='IP'?'От ИП':'От ООО'}}</p><p class="pds-excerpt" title="Фрагмент шаблона. Поля в скобках заполнятся автоматически.">{{templateSnippet(item.bodyHtml)}}</p></div>
            <div class="pds-actions"><button type="button" class="crm-button" @click="editTemplate(item)">Открыть шаблон <ChevronRight :size="15"/></button><button v-if="!item.isActive" type="button" class="crm-button" :disabled="busy" @click="activateTemplate(item)">Активировать</button></div>
          </article>
          <div v-if="!workspace?.templates?.length && !loading" class="crm-surface pds-empty"><FileText :size="28"/><h3>Добавьте первый шаблон</h3><p>Начните с договора услуг. Затем добавьте согласие на подпись, акт и заявление на выплату.</p><button type="button" class="crm-button" @click="editTemplate()"><Plus :size="16"/> Добавить шаблон</button></div>
        </div>
      </template>

      <div v-else ref="editorPanel" class="pds-editor crm-surface">
        <header class="pds-editor-intro"><button type="button" class="crm-button" :disabled="busy" @click="closeEditor"><ArrowLeft :size="16"/> К шаблонам</button><div><h2>{{editing.id ? 'Новая версия шаблона' : 'Новый шаблон'}}</h2><p>Пишите обычным текстом. При сохранении система создаст отдельную версию.</p></div></header>
        <form class="pds-form" @submit.prevent="saveTemplate">
          <label>Название документа<input v-model="editing.title" class="crm-input" required maxlength="240" placeholder="Например, договор оказания информационных услуг"/><small>Название в списке и скачанном файле.</small></label>
          <label>Тип документа<select aria-label="Тип документа" v-model="editing.documentType" class="crm-input"><option v-for="type in documentTypes" :key="type" :value="type">{{labels[type]}}</option></select></label>
          <fieldset class="pds-wide pds-scope"><legend>Когда использовать эту версию</legend>
            <label>Программа<select aria-label="Программа" v-model="editing.audience" class="crm-input"><option value="ALL">Обе программы</option><option value="BLOGGER">Программа авторов и блогеров</option><option value="REFERRAL">Реферальная программа</option></select></label>
            <label>Налоговый статус<select aria-label="Налоговый статус" v-model="editing.taxStatus" class="crm-input"><option value="ALL">Любой статус</option><option value="SELF_EMPLOYED">Самозанятый</option><option value="INDIVIDUAL_ENTREPRENEUR">ИП</option></select></label>
            <label>Наша сторона<select aria-label="Наша сторона" v-model="editing.entityType" class="crm-input"><option value="ALL">ИП или ООО</option><option value="IP">Только ИП</option><option value="LLC">Только ООО</option></select></label>
          </fieldset>
          <div class="pds-wide pds-writing-guide"><strong>Данные, которые заполнятся автоматически</strong><p>Поставьте курсор в текст и нажмите на нужное поле. Система подставит его значение при генерации.</p><details><summary>Выбрать поле для вставки</summary><div class="pds-token-list"><button v-for="item in tokens" :key="item.key" type="button" class="pds-token crm-button crm-card-action" @click="insertToken(item.key)"><span>{{item.label}}</span><code>{{tokenLabel(item.key)}}</code><Plus :size="14"/></button></div></details></div>
          <div class="pds-wide pds-field"><label for="partner-template-text">Текст документа</label><textarea id="partner-template-text" ref="bodyEditor" v-model="editing.bodyText" class="crm-input pds-editor-text" rows="15" required maxlength="50000" aria-describedby="partner-template-text-help" placeholder="Вставьте готовый текст и добавьте поля для автоматического заполнения."/><small id="partner-template-text-help">Можно скопировать текст из Word. Разделяйте абзацы пустой строкой.</small></div>
          <details class="pds-preview pds-wide"><summary><FileText :size="17"/> Пример заполненного документа</summary><p>Демонстрационные данные помогают проверить расположение полей.</p><pre>{{previewText}}</pre></details>
          <label class="pds-check pds-wide"><input class="crm-check" v-model="editing.isActive" type="checkbox"/> Использовать эту версию при генерации новых документов</label>
          <footer class="pds-wide pds-editor-footer"><span>Прежние версии останутся в истории.</span><div class="pds-actions"><button type="button" class="crm-button" :disabled="busy" @click="closeEditor">Отмена</button><button class="crm-button crm-button--primary" :disabled="busy" type="submit"><Save :size="16"/> {{busy?'Сохраняем…':'Сохранить новую версию'}}</button></div></footer>
        </form>
      </div>
    </section>

    <section v-else-if="section==='generator'" id="partner-doc-generator-panel" role="tabpanel" aria-labelledby="partner-doc-generator-tab" class="pds-section">
      <header class="pds-heading"><div><h2>Сформировать документы</h2><p>Выберите партнёра и компанию. Система подберёт действующие шаблоны и заполнит реквизиты.</p></div></header>
      <div class="pds-generator">
        <section class="pds-participant crm-surface"><h3>Для кого готовим документы</h3><label class="pds-search"><span>Поиск партнёра</span><span class="pds-search-input crm-input-group"><Search :size="17"/><input v-model="search" class="crm-input" type="search" placeholder="Имя, код или email" @input="searchParticipants"/></span></label><p v-if="participantLoading" class="pds-list-hint" role="status">Ищем партнёров…</p>
          <div class="pds-people" aria-label="Выбор партнёра"><button class="crm-button crm-card-action" v-for="person in participants" :key="person.id" type="button" :aria-pressed="selectedParticipant===person.id" @click="selectedParticipant=person.id"><span class="pds-avatar">{{person.displayName?.slice(0,1) || 'П'}}</span><span><strong>{{person.displayName}}</strong><small>{{person.kind==='BLOGGER'?'Автор или блогер':'Реферальный клиент'}} · {{person.user?.email}}</small></span><Check v-if="selectedParticipant===person.id" :size="18"/></button><p v-if="!participants.length && !participantLoading" class="pds-list-hint">{{search?'Никого не нашли. Попробуйте имя или email.':'Участников пока нет. Сначала добавьте партнёра в программу.'}}</p></div>
        </section>
        <section class="pds-generation-summary crm-surface"><h3>От чьего имени</h3><p>Укажите вашу сторону договора. Её реквизиты появятся в каждом документе комплекта.</p><label>Реквизиты компании<select aria-label="Реквизиты компании" v-model="entityId" class="crm-input"><option value="" disabled>Выберите ИП или ООО</option><option v-for="entity in activeEntities" :key="entity.id" :value="entity.id">{{entity.entityType==='IP'?'ИП':'ООО'}} · {{entity.legalName}}</option></select></label><p v-if="!activeEntities.length" class="pds-list-hint">Нет действующих реквизитов. <button type="button" class="pds-inline-button crm-button" @click="section='entities'">Добавить реквизиты</button></p><dl class="pds-generation-details"><div><dt>Партнёр</dt><dd>{{selectedPerson?.displayName || 'Не выбран'}}</dd></div><div><dt>Наша сторона</dt><dd>{{selectedEntity?.legalName || 'Не выбрана'}}</dd></div><div><dt>Результат</dt><dd>Комплект документов DOC</dd></div></dl><button type="button" class="crm-button crm-button--primary" :disabled="busy||!selectedParticipant||!entityId" @click="generate"><FileSignature :size="17"/> {{busy?'Формируем…':'Сформировать комплект'}}</button><small>Перед подписанием проверьте сведения в скачанных файлах.</small></section>
      </div>
      <section v-if="generated.length" class="pds-generated" aria-live="polite"><header class="pds-heading"><div><h2>Документы готовы</h2><p>Скачайте файлы и проверьте реквизиты и условия.</p></div><span class="pds-version">{{generated.length}} шт.</span></header><article v-for="doc in generated" :key="doc.id" class="pds-template crm-surface"><span class="pds-file-icon"><FileText :size="23"/></span><div class="pds-template-body"><span class="pds-kind">{{labels[doc.documentType]}}</span><h3>{{doc.title}}</h3><p>Версия шаблона {{doc.templateVersion}} · черновик</p></div><button type="button" class="crm-button" @click="download(doc)"><Download :size="16"/> Скачать DOC</button></article></section>
    </section>

    <section v-else id="partner-doc-signature-panel" role="tabpanel" aria-labelledby="partner-doc-signature-tab" class="pds-section">
      <header class="pds-heading"><div><h2>Подписание по SMS</h2><p>Параметры одноразового кода и перечень документов для простой электронной подписи.</p></div></header>
      <div class="pds-sms-status crm-surface"><span class="pds-file-icon"><ShieldCheck :size="23"/></span><div><strong>Подписание пока недоступно</strong><p>SMS Aero: {{workspace?.smsIntegration?.configured ? 'реквизиты заполнены' : 'интеграция не настроена'}} · {{workspace?.smsIntegration?.isEnabled ? 'интеграция включена' : 'интеграция выключена'}}</p></div><NuxtLink class="crm-button" to="/crm/settings/integrations">Настроить интеграцию <ChevronRight :size="15"/></NuxtLink></div>
      <form class="pds-settings crm-surface" @submit.prevent="saveSettings"><div class="pds-wide pds-form-title"><h3>Одноразовый код</h3><p>Настройки сохранятся для будущего запуска SMS-подписи.</p></div>
        <label>Провайдер<select aria-label="Провайдер" v-model="settings.providerKey" class="crm-input"><option value="SMS_AERO">SMS Aero</option></select></label><label>Срок действия кода, секунд<input v-model.number="settings.codeTtlSeconds" class="crm-input" type="number" min="60" max="900"/><small>От 60 до 900 секунд.</small></label><label>Максимум попыток ввода<input v-model.number="settings.maxAttempts" class="crm-input" type="number" min="3" max="10"/></label><label>Пауза перед повторным кодом, секунд<input v-model.number="settings.resendCooldownSeconds" class="crm-input" type="number" min="30" max="600"/></label>
        <div class="pds-wide pds-signing-options"><label class="pds-check"><input class="crm-check" v-model="settings.consentRequired" type="checkbox"/> Требовать предварительное согласие на использование ПЭП</label><fieldset class="pds-doc-checks"><legend>Какие документы можно подписывать кодом</legend><label v-for="type in documentTypes.filter(x=>x!=='PEP_CONSENT')" :key="type"><input class="crm-check" v-model="settings.eligibleDocumentTypes" type="checkbox" :value="type"/> {{labels[type]}}</label></fieldset></div>
        <p class="pds-warning">Сохранение настроек не включает подписание. Для запуска нужны выдача и проверка кода, журнал подписания и подписанный экземпляр документа. Ключи SMS хранятся в защищённых настройках интеграции.</p><footer class="pds-wide"><button class="crm-button crm-button--primary" :disabled="busy"><Save :size="16"/> Сохранить настройки</button></footer>
      </form>
    </section>
  </section>
</template>
