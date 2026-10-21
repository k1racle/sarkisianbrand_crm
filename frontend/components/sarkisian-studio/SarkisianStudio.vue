<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue'
import { House, Paintbrush, Images, Shirt, ShoppingBag, ArrowUpRight, ArrowLeft, ChevronRight, Coins, Star, Check, X, Sparkles, Volume2, VolumeX, Settings2, Undo2, Download, Clock3, CircleHelp, CheckCheck, Footprints, Leaf, Sun, BookOpen, Plus, LockKeyhole } from '@lucide/vue'
import NailArt from './NailArt.vue'
import KeriWardrobe from './keri/KeriWardrobe.vue'
import KeriPortrait from './atelier/KeriPortrait.vue'
import StudioScene from './atelier/StudioScene.vue'
import FinishGame from './atelier/FinishGame.vue'
import NailFit from './atelier/NailFit.vue'
import ShiftGoals from './atelier/ShiftGoals.vue'
import MaterialShelf from './atelier/MaterialShelf.vue'
import SupplyMark from './atelier/SupplyMark.vue'
import { supplyById, supplyFits, type SupplyId } from './atelier/supplies'
import { buySupply, chooseSupply } from './model'
import { advanceShift, shiftReward, shiftGoals, reputationTitle, loyaltyTip } from './atelier/progression'
import { NAIL_SHAPES, NAIL_LENGTHS, activeBrief } from './model'
import { DEFAULT_KERI_LOOK, KERI_STORAGE_KEY, parseKeriLook, type KeriLook } from './keri/look'
import { COLORS, PATTERNS, QUESTS, ORDERS, UPGRADES, freshState, parseState, localStorageAdapter, blankDesign, newWork, isComplete, commitDesign, coinBalance, nextQuest, colorHex, studioLevel, availableOrders, availableColors, acceptOrder, completeOrder, buyUpgrade, type StudioState, type StorageAdapter, type SavedDesign, type Quest, type Design, type ColorId, type PatternId, type UpgradeId, type OrderResult, type OrderBrief } from './model'
import { exportDesign } from './nail-art-geometry'
import './atelier/atelier.css'
import './atelier/gameplay.css'
import './atelier/supplies.css'
import './atelier/studio-theme.css'

const props = withDefaults(defineProps<{ assetBase?: string; siteBase?: string; storage?: StorageAdapter; showHeader?: boolean }>(), { assetBase: '/studio-assets/', siteBase: 'https://it-sarkisian.ru', showHeader: true })
const emit = defineEmits<{ 'design-saved': [design: SavedDesign]; 'quest-completed': [quest: Quest]; 'order-completed': [result: OrderResult] }>()
const root = computed(() => props.assetBase.replace(/\/?$/, '/'))
const asset = (file: string) => root.value + file
const state = ref<StudioState>(freshState()), loaded = ref(false), saveCount = ref(0), saveError = ref(''), notice = ref('')
const view = ref<'studio' | 'desk' | 'style' | 'portfolio' | 'shop'>('studio')
const modal = ref<'mentor' | 'settings' | 'help' | 'result' | 'design' | 'shift' | 'clients' | 'materials' | null>(null), dialog = ref<HTMLDialogElement>()
const shelfMessage = ref('')
const selectedOffer = ref(0), chosenColor = ref<ColorId>('rose'), chosenPattern = ref<PatternId>('plain'), selectedNail = ref(-1)
const stroke = ref({ id: 0, indices: [] as number[] }), history = ref<Design[]>([])
const result = ref<OrderResult | null>(null), savedPractice = ref<SavedDesign | null>(null), questReward = ref<Quest | null>(null), viewedDesign = ref<SavedDesign | null>(null)
const settingsName = ref(''), playing = ref(false), audioBusy = ref(false), busy = ref(false), galleryFilter = ref('all')
let adapter: StorageAdapter, queue = Promise.resolve(), disposed = false, audio: HTMLAudioElement | undefined, musicWanted = false
let noticeTimer: ReturnType<typeof setTimeout> | undefined
const work = computed(() => state.value.work)
const selectedSupply = computed(() => supplyById(work.value?.supply))
const supplyMatches = computed(() => !!work.value && !!selectedSupply.value && supplyFits(selectedSupply.value.id, work.value.design))
const canChooseSupply = computed(() => !!work.value && work.value.serial !== null && work.value.stage !== 'finish')
const stockTotal = computed(() => Object.values(state.value.supplies.stock).reduce((sum, quantity) => sum + quantity, 0))
const brief = computed(() => activeBrief(state.value))
const offers = computed(() => availableOrders(state.value))
const guest = computed(() => brief.value ?? offers.value[Math.min(selectedOffer.value, offers.value.length - 1)]!)
const quest = computed(() => QUESTS.find(q => q.id === state.value.activeQuest) ?? nextQuest(state.value))
const coins = computed(() => coinBalance(state.value)), level = computed(() => studioLevel(state.value))
const day = computed(() => state.value.career.shift.number)
const shiftFull = computed(() => state.value.career.shift.visits.length === 3)
const clientBook = computed(() => ORDERS.filter(o => state.value.career.clients[o.id]).map(order => ({ order, ...state.value.career.clients[order.id]! })).sort((a, b) => b.lastVisit - a.lastVisit))
const fitDescription = (order: OrderBrief) => [NAIL_SHAPES.find(s => s.id === order.shape)?.name, order.length ? `${NAIL_LENGTHS.find(l => l.id === order.length)?.name.toLowerCase()} длина` : null].filter(Boolean).join(' · ')
const rating = computed(() => state.value.career.served ? (state.value.career.stars / state.value.career.served).toFixed(1) : '—')
const colors = computed(() => work.value?.serial === null ? COLORS : availableColors(state.value))
const ready = computed(() => !!work.value && isComplete(work.value.design))
const count = computed(() => work.value?.stage === 'prepare' ? work.value.prepared.length : work.value?.design.nails.filter(n => n.color).length ?? 0)
const hasUpgrade = (id: UpgradeId) => state.value.career.upgrades.includes(id)
const filteredDesigns = computed(() => state.value.designs.filter(d => galleryFilter.value === 'all' || d.kind === galleryFilter.value))
const steps = [{ id: 'prepare', label: 'Подготовка' }, { id: 'design', label: 'Дизайн' }, { id: 'finish', label: 'Финиш' }] as const
const tabs = [{ id: 'studio', label: 'Студия', icon: House }, { id: 'desk', label: 'Практика', icon: Paintbrush }, { id: 'style', label: 'Мой образ', icon: Shirt }, { id: 'portfolio', label: 'Портфолио', icon: Images }, { id: 'shop', label: 'Развитие', icon: ShoppingBag }] as const
const pageTitle = computed(() => ({ studio: state.value.playerName, desk: work.value?.serial ? `Приём · ${brief.value?.customer ?? ''}` : 'Творческая практика', style: 'Ваша новая глава', portfolio: 'Работы, которыми гордишься', shop: 'Студия становится твоей' })[view.value])
const plain = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
function notify(text: string) { notice.value = text; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => notice.value = '', 4500) }
function persist() {
  if (!loaded.value) return queue
  const snapshot = plain(state.value); saveCount.value++
  queue = queue.then(async () => {
    try { await adapter.save(snapshot); if (!disposed) saveError.value = '' }
    catch { if (!disposed) saveError.value = 'Не удалось сохранить прогресс. Игра продолжается, но до перезагрузки повторите сохранение.' }
    finally { saveCount.value-- }
  })
  return queue
}
watch(state, () => { void persist() }, { deep: true, flush: 'sync' })
function navigate(next: typeof view.value) {
  if (!loaded.value) return
  if (next === 'desk' && !work.value) {
    if (brief.value && state.value.career.active) state.value.work = newWork(brief.value.kind, state.value.career.active.serial)
    else state.value.work = newWork('manicure')
  }
  view.value = next; selectedNail.value = -1; notice.value = ''
}
function practice(kind: Design['kind']) {
  if (state.value.career.active) { navigate('desk'); return }
  if (work.value && (work.value.prepared.length || work.value.design.nails.some(n => n.color))) { navigate('desk'); notify('Продолжаем вашу незавершённую работу.'); return }
  state.value.work = newWork(kind); history.value = []; view.value = 'desk'
}
async function startOrder(order: OrderBrief) {
  if (busy.value) return
  if (shiftFull.value) { modal.value = 'shift'; return }
  if (brief.value) { navigate('desk'); return }
  if (work.value && (work.value.prepared.length || work.value.design.nails.some(n => n.color))) { navigate('desk'); notify('Сначала завершите работу в практике — она уже сохранена.'); return }
  busy.value = true
  try {
    const next = acceptOrder(plain(state.value), order.id)
    next.work = newWork(order.kind, next.career.active!.serial); state.value = next
    chosenColor.value = 'rose'; chosenPattern.value = 'plain'; history.value = []; view.value = 'desk'
    await queue
  } catch (error) { notify((error as Error).message) }
  finally { busy.value = false }
}
function paint(index: number) {
  if (!work.value || work.value.stage === 'finish') return
  selectedNail.value = index
  if (work.value.stage === 'prepare') {
    if (!work.value.prepared.includes(index)) work.value.prepared.push(index)
  } else {
    history.value.push(plain(work.value.design)); history.value = history.value.slice(-30)
    work.value.design.nails[index] = { color: chosenColor.value, pattern: chosenPattern.value }
  }
  stroke.value = { id: stroke.value.id + 1, indices: [index] }
}
function paintAll() {
  if (!work.value) return
  if (work.value.stage === 'prepare' && hasUpgrade('organizer')) work.value.prepared = [0, 1, 2, 3, 4]
  else if (work.value.stage === 'design') {
    history.value.push(plain(work.value.design)); history.value = history.value.slice(-30)
    work.value.design.nails = Array.from({ length: 5 }, () => ({ color: chosenColor.value, pattern: chosenPattern.value }))
  }
  stroke.value = { id: stroke.value.id + 1, indices: [0, 1, 2, 3, 4] }
}
function undo() { if (history.value.length && work.value?.stage === 'design') { work.value.design = history.value.pop()!; stroke.value = { id: stroke.value.id + 1, indices: [] } } }
function setFit(patch: Pick<Design, 'shape' | 'length'>) {
  if (!work.value || work.value.stage === 'finish') return
  if (work.value.stage === 'design') history.value.push(plain(work.value.design))
  work.value.design = { ...work.value.design, ...patch }
  stroke.value = { id: stroke.value.id + 1, indices: [] }
}
function afterResult() { view.value = 'studio'; modal.value = shiftFull.value ? 'shift' : null }
async function closeShift() {
  if (busy.value) return
  busy.value = true
  try {
    const reward = shiftReward(state.value.career.shift)
    state.value = advanceShift(plain(state.value), state.value.career.shift.number)
    selectedOffer.value = 0; modal.value = null; view.value = 'studio'
    notify(`Смена ${day.value - 1} завершена. +${reward} монет. Новая запись уже открыта.`); await queue
  } catch (error) { notify((error as Error).message) }
  finally { busy.value = false }
}
function advance() {
  if (!work.value) return
  if (work.value.stage === 'prepare' && count.value === 5) work.value.stage = 'design'
  else if (work.value.stage === 'design' && ready.value) work.value.stage = 'finish'
  selectedNail.value = -1
}
async function finish() {
  if (!work.value || work.value.accuracy === null || busy.value) return
  busy.value = true; questReward.value = null; result.value = null; savedPractice.value = null
  try {
    const w = plain(work.value), id = crypto.randomUUID(), now = new Date().toISOString()
    if (w.serial !== null) {
      const completed = completeOrder(plain(state.value), w.serial, w.design, w.prepared, w.accuracy!, id, now)
      state.value = completed.state; result.value = completed.result; emit('design-saved', completed.result.saved); emit('order-completed', completed.result)
    } else {
      const completed = commitDesign(plain(state.value), w.design, state.value.activeQuest ? quest.value?.title ?? 'Моя практика' : `Практика · ${COLORS.find(c => c.id === w.design.nails[0]?.color)?.name}`, id, now)
      state.value = { ...completed.state, work: null }; savedPractice.value = completed.saved; questReward.value = completed.earned
      emit('design-saved', completed.saved); if (completed.earned) emit('quest-completed', completed.earned)
    }
    selectedOffer.value = 0; view.value = 'studio'; modal.value = 'result'; await queue
  } catch (error) { notify((error as Error).message) }
  finally { busy.value = false }
}
async function purchase(id: UpgradeId) { try { state.value = buyUpgrade(plain(state.value), id); notify('Улучшение уже работает в вашей студии.'); await queue } catch (error) { notify((error as Error).message) } }
async function saveLook(look: KeriLook) {
  state.value.keriLook = { ...look }; await queue
  if (saveError.value) throw new Error(saveError.value)
  if (!props.storage) { try { localStorage.setItem(KERI_STORAGE_KEY, JSON.stringify(look)) } catch { /* Full save contains this look. */ } }
  view.value = 'studio'; notify('Ваш новый образ сохранён.')
}
function customerLook(order: OrderBrief): KeriLook {
  const i = ORDERS.findIndex(o => o.id === order.id)
  const variants: Partial<KeriLook>[] = [
    { hair: 1, hairColor: 4, top: 1, topColor: 2, skin: 1 },
    { hair: 3, hairColor: 7, top: 2, topColor: 3, skin: 3 },
    { hair: 5, hairColor: 2, top: 4, topColor: 6, skin: 1 },
    { hair: 4, hairColor: 6, top: 3, topColor: 2, skin: 3 },
    { hair: 2, hairColor: 7, top: 1, topColor: 3, skin: 2 },
    { hair: 3, hairColor: 9, top: 4, topColor: 2, skin: 1 },
    { hair: 4, hairColor: 11, top: 5, topColor: 4, skin: 2 },
    { hair: 3, hairColor: 4, top: 2, topColor: 2, skin: 1 },
    { hair: 5, hairColor: 7, top: 5, topColor: 3, skin: 1 },
    { hair: 1, hairColor: 2, top: 1, topColor: 6, skin: 2 },
  ]
  return { ...DEFAULT_KERI_LOOK, ...variants[Math.max(0, i) % variants.length] }
}
function closeModal() { modal.value = null }
function openShelf() { shelfMessage.value = ''; modal.value = 'materials' }
async function restock(id: SupplyId) {
  if (busy.value) return
  busy.value = true
  try {
    state.value = buySupply(plain(state.value), id)
    shelfMessage.value = `${supplyById(id)!.name}: запас пополнен на 5 приёмов.`
    await queue
  } catch (error) { shelfMessage.value = (error as Error).message }
  finally { busy.value = false }
}
function selectSupply(id: SupplyId | null) {
  try { state.value = chooseSupply(plain(state.value), id); closeModal() }
  catch (error) { shelfMessage.value = (error as Error).message }
}
watch(modal, async value => { await nextTick(); if (value && !dialog.value?.open) dialog.value?.showModal(); else if (!value) dialog.value?.close() })
function openSettings() { settingsName.value = state.value.playerName; modal.value = 'settings' }
function saveSettings() { state.value.playerName = settingsName.value.trim().slice(0, 24) || 'Моя студия'; closeModal() }
function acceptLesson() {
  if (!quest.value) return
  if (state.value.career.active || work.value && work.value.prepared.length > 0) { closeModal(); navigate('desk'); notify('Сначала завершим текущую работу. Урок Светланы останется доступен.'); return }
  state.value.activeQuest = quest.value.id; state.value.work = newWork(quest.value.kind); history.value = []; closeModal(); view.value = 'desk'
}
async function download(d: SavedDesign) { try { await exportDesign(d, asset(d.kind === 'manicure' ? 'hand.png' : 'foot.png'), d.name) } catch { notify('Не получилось скачать работу. Повторите ещё раз.') } }
async function toggleMusic() {
  if (!audio || audioBusy.value) return
  if (playing.value) { musicWanted = false; audio.pause(); playing.value = false; return }
  audioBusy.value = true; musicWanted = true
  try { if (!audio.src) audio.src = asset(state.value.track ? 'chic-cheerful-2.mp3' : 'chic-cheerful.mp3'); await audio.play(); if (!disposed) playing.value = true }
  catch { musicWanted = false; notify('Нажмите на звук ещё раз, чтобы запустить музыку.') }
  finally { audioBusy.value = false }
}
function visibility() { if (!audio) return; if (document.hidden) { audio.pause(); playing.value = false } else if (musicWanted) audio.play().then(() => playing.value = true).catch(() => { musicWanted = false }) }
watch(() => state.value.volume, v => { if (audio) audio.volume = v })
watch(() => state.value.track, () => { if (audio) { audio.pause(); playing.value = false; audio.src = asset(state.value.track ? 'chic-cheerful-2.mp3' : 'chic-cheerful.mp3'); if (musicWanted) void toggleMusic() } })
onMounted(async () => {
  adapter = props.storage ?? localStorageAdapter()
  try { state.value = parseState(await adapter.load()) } catch { saveError.value = 'Не удалось прочитать сохранение. Новые изменения могут не сохраниться.' }
  if (!props.storage) { try { const raw = localStorage.getItem(KERI_STORAGE_KEY); if (raw) state.value.keriLook = parseKeriLook(JSON.parse(raw)) } catch { /* Use game save. */ } }
  loaded.value = true
  audio = new Audio(); audio.preload = 'none'; audio.volume = state.value.volume
  audio.addEventListener('ended', () => { if (musicWanted) state.value.track = state.value.track ? 0 : 1 })
  audio.addEventListener('error', () => { musicWanted = false; playing.value = false; notify('Музыка недоступна. Попробуйте другой трек в настройках.') })
  document.addEventListener('visibilitychange', visibility)
  for (const [file, range] of [['montserrat-cyrillic.woff2', 'U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116'], ['montserrat-latin.woff2', 'U+0000-00FF,U+2000-206F']]) {
    const font = new FontFace('Atelier', `url("${asset(file!)}")`, { weight: '100 900', unicodeRange: range! }); document.fonts.add(font); void font.load().catch(() => {})
  }
})
onBeforeUnmount(() => { disposed = true; musicWanted = false; audio?.pause(); if (audio) audio.src = ''; clearTimeout(noticeTimer); document.removeEventListener('visibilitychange', visibility) })
</script>

<template>
 <div class="sb-game atelier">
  <header v-if="showHeader" class="at-header">
   <button class="at-brand" aria-label="В мою студию" @click="navigate('studio')"><img :src="asset('logo.png')" alt="SARKISIAN — от мастера мастерам"/><span>STUDIO</span></button>
   <span class="at-header-caption">Маленькая студия. Большая мечта.</span>
   <div class="at-header-tools"><span class="at-autosave" :class="{ error: saveError }"><i/>{{ saveError ? 'Не сохранено' : saveCount ? 'Сохраняем…' : 'Всё сохранено' }}</span><button class="at-icon" :aria-label="playing ? 'Выключить музыку' : 'Включить музыку'" :aria-pressed="playing" @click="toggleMusic"><Volume2 v-if="playing" :size="19"/><VolumeX v-else :size="19"/></button><button class="at-icon" aria-label="Настройки студии" @click="openSettings"><Settings2 :size="19"/></button></div>
  </header>
  <div class="at-layout">
   <nav class="at-nav" aria-label="Разделы игры"><button v-for="tab in tabs" :key="tab.id" :class="{ active: view === tab.id }" :aria-current="view === tab.id ? 'page' : undefined" @click="navigate(tab.id)"><component :is="tab.icon" :size="21" :stroke-width="1.6"/><span>{{ tab.id === 'desk' && state.career.active ? 'Приём' : tab.label }}</span><i v-if="tab.id === 'desk' && work"/></button><button class="at-nav-help" @click="modal = 'help'"><CircleHelp :size="21"/><span>Как играть</span></button></nav>
   <main class="at-main" :class="{ 'is-service': view === 'desk' }" :aria-busy="!loaded">
    <div class="at-page-heading"><div><span class="at-eyebrow">{{ view === 'studio' ? `ДЕНЬ ${String(day).padStart(2,'0')} · ВЫ — МАСТЕР И ВЛАДЕЛИЦА` : view === 'desk' ? 'ТВОИ РУКИ СОЗДАЮТ КРАСОТУ' : 'SARKISIAN · ТВОРЧЕСТВО КАЖДЫЙ ДЕНЬ' }}</span><h1>{{ pageTitle }}</h1></div><div class="at-stats"><span class="at-level"><Sparkles :size="15"/> Уровень {{ level }}</span><span class="at-coins" data-testid="balance"><Coins :size="18"/>{{ coins.toLocaleString('ru-RU') }}</span></div></div>
    <div v-if="saveError" class="at-alert" role="alert">{{ saveError }}<button @click="persist">Повторить сохранение</button></div>
    <div v-if="notice" class="at-notice" role="status"><Check :size="16"/>{{ notice }}</div>

    <section v-if="view === 'studio'" class="at-dashboard">
     <div class="at-studio-column">
      <div class="at-scene-card"><div class="at-scene-topline"><span><i class="at-live"/> {{ shiftFull ? 'Смена завершена' : 'Студия открыта' }}</span><span><Sun :size="14"/> Тёплый день для новых идей</span></div><StudioScene :asset-base="root" :look="customerLook(guest)" :name="guest.customer" :upgraded="hasUpgrade('pastel')" :empty="shiftFull" @shelf="openShelf"/><div class="at-scene-caption"><div><span class="at-eyebrow">ВАШЕ РАБОЧЕЕ МЕСТО</span><strong>{{ shiftFull ? 'Хорошая работа. Время подвести итоги.' : brief ? `${brief.customer} ждёт продолжения` : `${guest.customer} · знакомимся перед приёмом` }}</strong></div><button class="at-text-button" @click="brief ? navigate('desk') : startOrder(guest)">{{ shiftFull ? 'Итоги смены' : brief ? 'Продолжить' : 'Начать приём' }} <ArrowUpRight :size="18"/></button></div><button class="at-shelf-strip" @click="openShelf"><span><ShoppingBag :size="15"/> Полка SARKISIAN</span><span><small>Запас: {{ stockTotal }} приёмов</small><ArrowUpRight :size="14"/></span></button></div>
      <div class="at-under-scene"><button class="at-master-card" @click="navigate('style')"><span class="at-master-avatar"><KeriPortrait :look="state.keriLook" :asset-base="root" label="Вы — мастер"/></span><div><span class="at-eyebrow">ЭТО ВЫ</span><strong>Мастер своей студии</strong><span>Собрать новый образ <ArrowUpRight :size="12"/></span></div></button><div class="at-career-card"><span><Star :size="17"/> <b>{{ rating }}</b><small>оценка работ</small></span><span><CheckCheck :size="18"/><b>{{ state.career.served }}</b><small>приёмов завершено</small></span></div></div>
      <button class="at-reputation-card" @click="modal = 'clients'"><div><span class="at-eyebrow">ВАША РЕПУТАЦИЯ</span><b>{{ reputationTitle(state.career.reputation) }}</b><span>{{ clientBook.length }} знакомых гостей · открыть книгу клиентов <ArrowUpRight :size="13"/></span></div><div class="at-reputation-meter"><strong>{{ state.career.reputation }}<small>/100</small></strong><i><b :style="{ width: state.career.reputation + '%' }"/></i></div></button>
      <button class="at-mentor" @click="modal = 'mentor'"><img :src="asset('svetlana.png')" alt="Светлана Саркисян"/><div><span class="at-eyebrow">СВЕТЛАНА САРКИСЯН · ВАШ НАСТАВНИК</span><h2>{{ quest?.title ?? 'Всё начинается с любви к делу' }}</h2><p>{{ quest ? 'Практикуйтесь, находите свой стиль и растите вместе со мной.' : 'Все уроки пройдены. Продолжайте собирать своё портфолио.' }}</p></div><ArrowUpRight :size="22"/></button>
     </div>
     <aside class="at-agenda"><div class="at-agenda-title"><div><span class="at-eyebrow">ПЛАН НА СЕГОДНЯ</span><h2>Ваша запись</h2></div><span class="at-day-badge"><Clock3 :size="15"/>{{ shiftFull ? 'Завершена' : brief ? 'В работе' : `${3 - state.career.shift.visits.length} приёма` }}</span></div>
      <div v-if="shiftFull" class="at-shift-ready"><Sparkles :size="30"/><h3>Смена завершена</h3><p>Три приёма позади. Заберите награду за цели и откройте новую запись.</p><button class="at-btn at-primary" @click="modal = 'shift'">Подвести итоги <ArrowUpRight :size="17"/></button></div>
      <template v-else-if="brief"><div class="at-active-booking"><KeriPortrait :look="customerLook(brief)" :asset-base="root"/><h3>{{ brief.customer }}</h3><p>«{{ brief.wish }}»</p><p class="at-fit-request">{{ fitDescription(brief) }}</p><button class="at-btn at-primary" @click="navigate('desk')">Вернуться к работе <ArrowUpRight :size="17"/></button><small>Каждый этап сохраняется автоматически.</small></div></template>
      <template v-else><div class="at-bookings" role="group" aria-label="Выбрать запись"><button v-for="(order, i) in offers" :key="order.id" class="at-booking" :class="{ selected: selectedOffer === i }" :aria-pressed="selectedOffer === i" @click="selectedOffer = i"><span class="at-guest-avatar"><KeriPortrait :look="customerLook(order)" :asset-base="root" :label="order.customer"/></span><span class="at-booking-info"><b>{{ order.customer }}</b><small>{{ order.kind === 'manicure' ? 'Маникюр' : 'Педикюр' }} · {{ state.career.clients[order.id] ? 'Снова к вам' : order.reputation ? 'Особый заказ' : 'Первый визит' }}</small></span><ChevronRight :size="15"/></button></div>
      <div class="at-brief" :key="guest.id"><span class="at-eyebrow">{{ guest.title }}</span><h3>«{{ guest.wish }}»</h3><div class="at-order-tags"><span><i :style="{ background: colorHex(guest.color) }"/>{{ COLORS.find(c => c.id === guest.color)?.name }}</span><span>{{ PATTERNS.find(p => p.id === guest.pattern)?.name }}</span></div><p v-if="guest.shape" class="at-fit-request">{{ fitDescription(guest) }}</p><p v-if="state.career.clients[guest.id]" class="at-regular-note"><Star :size="12"/> Доверие {{ state.career.clients[guest.id]!.trust }}/5 · визит № {{ state.career.clients[guest.id]!.visits + 1 }}</p><div class="at-order-pay"><span>За выполненный заказ</span><b><Coins :size="16"/> до {{ guest.reward + 30 + loyaltyTip(state.career, guest.id, 5) }}</b></div><button class="at-btn at-primary" :disabled="busy || !loaded" data-testid="start-order" @click="startOrder(guest)">Принять {{ guest.customer === 'Анна' ? 'Анну' : 'гостя' }} <ArrowUpRight :size="18"/></button></div></template>
      <ShiftGoals :shift="state.career.shift" compact @open="modal = 'shift'"/>
      <div class="at-practice-invite"><Leaf :size="23"/><h3>Немного свободы</h3><p>Экспериментируйте с оттенками в практике — без заказа и оценки клиента.</p><div><button @click="practice('manicure')">Маникюр <Plus :size="13"/></button><button @click="practice('pedicure')">Педикюр <Plus :size="13"/></button></div></div>
     </aside>
    </section>

    <section v-else-if="view === 'desk' && work" class="at-workspace">
     <div class="at-service-heading"><button class="at-text-button" @click="navigate('studio')"><ArrowLeft :size="16"/> Студия</button><ol class="at-steps"><li v-for="(step,i) in steps" :key="step.id" :class="{ current: work.stage === step.id, done: steps.findIndex(s => s.id === work!.stage) > i }"><span>{{ steps.findIndex(s => s.id === work!.stage) > i ? '✓' : `0${i+1}` }}</span>{{ step.label }}</li></ol><span class="at-service-kind">{{ work.design.kind === 'manicure' ? 'Маникюр' : 'Педикюр' }}</span></div>
     <div class="at-workbench"><div class="at-hand-column"><div class="at-work-hint"><Paintbrush :size="17"/><span>{{ work.stage === 'prepare' ? 'Коснитесь каждого ногтя, чтобы подготовить его к покрытию.' : work.stage === 'design' ? 'Выберите оттенок и дизайн. Нажимайте на ногти или ведите по ним кистью.' : 'Дизайн готов. Добавьте аккуратный финальный штрих.' }}</span><button v-if="work.stage === 'design'" class="at-icon" :disabled="!history.length" aria-label="Отменить нанесение" @click="undo"><Undo2 :size="18"/></button></div>
      <div class="at-hand-art"><NailArt :key="work.design.kind" :design="work.design" :image-url="asset(work.design.kind === 'manicure' ? 'hand.png' : 'foot.png')" :interactive="work.stage !== 'finish'" :preparing="work.stage === 'prepare'" :prepared="work.prepared" :selected="selectedNail" :stroke="stroke" :brush-color="chosenColor" @paint="paint"/></div>
      <div v-if="work.stage !== 'finish'" class="at-finger-controls" aria-label="Ногти"><span>{{ work.stage === 'prepare' ? 'Подготовка' : 'Нанести' }}</span><button v-for="(nail,i) in work.design.nails" :key="i" :aria-label="`Ноготь ${i+1}`" :class="{ done: work.stage === 'prepare' ? work.prepared.includes(i) : !!nail.color, selected: selectedNail === i }" @click="paint(i)"><i v-if="work.stage === 'design'" :style="{ background: colorHex(nail.color) }"/><Check v-else-if="work.prepared.includes(i)" :size="14"/>{{ i+1 }}</button></div>
      <div class="at-work-footer"><span><i class="at-live"/>{{ saveCount ? 'Сохраняем работу…' : 'Работа сохранена' }}</span><button v-if="work.stage === 'finish' && work.accuracy === null" class="at-text-button" @click="work.stage = 'design'">Вернуться к дизайну</button><span v-else>{{ work.stage === 'prepare' ? 'Сначала основа, потом творчество' : 'Каждая деталь имеет значение' }}</span></div>
     </div>
     <aside class="at-tools-panel"><div v-if="brief" class="at-client-brief"><span class="at-guest-avatar"><KeriPortrait :look="customerLook(brief)" :asset-base="root"/></span><div><span class="at-eyebrow">ПОЖЕЛАНИЕ · {{ brief.customer }}</span><p>{{ brief.wish }}</p><small v-if="brief.shape" class="at-fit-request">{{ fitDescription(brief) }}</small></div></div><div v-else-if="state.activeQuest && quest" class="at-lesson-brief"><Sparkles :size="19"/><div><b>{{ quest.title }}</b><p>{{ quest.steps.slice(0,2).join('. ') }}</p></div></div><div v-else class="at-lesson-brief"><Leaf :size="19"/><div><b>Свободная практика</b><p>Ваши цвета. Ваши правила. Работа останется в портфолио.</p></div></div>
      <template v-if="work.stage === 'prepare'"><div class="at-tool-content at-prep-content"><button v-if="work.serial !== null" class="at-supply-choice" :class="{ 'is-mismatch': selectedSupply && !supplyMatches }" data-testid="choose-material" @click="openShelf"><SupplyMark v-if="selectedSupply" :id="selectedSupply.id"/><ShoppingBag v-else :size="22"/><span><b>{{ selectedSupply?.name ?? 'Базовый набор' }}</b><small>{{ selectedSupply ? supplyMatches ? 'До +' + selectedSupply.bonus + ' монет · изменить' : 'Для другого типа работы · изменить' : 'Выбрать материал с полки' }}</small></span><ChevronRight :size="14"/></button><NailFit v-if="work.design.kind === 'manicure'" :shape="work.design.shape" :length="work.design.length" @shape="setFit({ shape: $event })" @length="setFit({ length: $event })"/><span class="at-eyebrow">01 / ПОДГОТОВКА</span><h2>Красота начинается<br>с заботы</h2><p>Пройдитесь салфеткой по всем пяти ногтям. Нажимайте на них на столе или используйте кнопки под рукой.</p><div class="at-prep-visual"><span/><span/><Sparkles :size="25"/></div><div class="at-prepared-count"><b>{{ count }}<small>/ 5</small></b><span>ногтей готовы<br>к покрытию</span></div><button v-if="hasUpgrade('organizer')" class="at-btn at-secondary" @click="paintAll"><CheckCheck :size="17"/> Подготовить все</button><small v-else class="at-subtle">Органайзер из «Развития» ускорит подготовку.</small></div><div class="at-tool-bottom"><button class="at-btn at-primary" :disabled="count < 5" @click="advance">К выбору дизайна <ArrowUpRight :size="17"/></button></div></template>
      <template v-else-if="work.stage === 'design'"><div class="at-tool-content"><button v-if="work.serial !== null" class="at-supply-choice" :class="{ 'is-mismatch': selectedSupply && !supplyMatches }" data-testid="choose-material" @click="openShelf"><SupplyMark v-if="selectedSupply" :id="selectedSupply.id"/><ShoppingBag v-else :size="22"/><span><b>{{ selectedSupply?.name ?? 'Базовый набор' }}</b><small>{{ selectedSupply ? supplyMatches ? 'До +' + selectedSupply.bonus + ' монет · изменить' : 'Для другого типа работы · изменить' : 'Выбрать материал с полки' }}</small></span><ChevronRight :size="14"/></button><details v-if="work.design.kind === 'manicure'" class="at-fit-adjust"><summary>Форма: {{ NAIL_SHAPES.find(s => s.id === (work!.design.shape ?? 'almond'))?.name }} · изменить</summary><NailFit :shape="work.design.shape" :length="work.design.length" @shape="setFit({ shape: $event })" @length="setFit({ length: $event })"/></details><div class="at-section-line"><span class="at-eyebrow">02 / ЦВЕТ И ХАРАКТЕР</span><span>{{ count }} / 5</span></div><h2>Палитра настроения</h2><p class="at-color-name">{{ COLORS.find(c => c.id === chosenColor)?.name }}</p><div class="at-palette" role="group" aria-label="Оттенки"><button v-for="color in colors" :key="color.id" :style="{ '--swatch': color.hex }" :aria-label="color.name" :aria-pressed="chosenColor === color.id" @click="chosenColor = color.id"><Check v-if="chosenColor === color.id" :size="18" :style="{ color: ['milk','rose','peach','sage','lavender','blue'].includes(color.id) ? '#433f39' : '#fff' }"/></button></div><div class="at-section-line"><span class="at-eyebrow">ДОБАВИТЬ ДЕТАЛЬ</span><Sparkles :size="14"/></div><div class="at-patterns" role="group" aria-label="Дизайн"><button v-for="pattern in PATTERNS" :key="pattern.id" :aria-label="pattern.name" :aria-pressed="chosenPattern === pattern.id" @click="chosenPattern = pattern.id"><span class="at-nail-sample" :class="`pattern-${pattern.id}`" :style="{ background: colorHex(chosenColor) }"><i/></span><small>{{ pattern.name }}</small></button></div><button class="at-btn at-secondary" @click="paintAll"><CheckCheck :size="16"/> Нанести на все</button><div class="at-material-note"><img :src="asset('gel-mousse.jpg')" alt="Гель-мусс SARKISIAN"/><div><b>SARKISIAN</b><span>Материалы для ваших идей</span><a :href="siteBase" target="_blank" rel="noopener noreferrer">Открыть бренд <ArrowUpRight :size="12"/></a></div></div></div><div class="at-tool-bottom"><div class="at-nail-progress"><i v-for="(nail,i) in work.design.nails" :key="i" :class="{ filled: nail.color }"/></div><button class="at-btn at-primary" :disabled="!ready" @click="advance">К финальному штриху <ArrowUpRight :size="17"/></button></div></template>
      <template v-else><div class="at-tool-content"><span class="at-eyebrow">03 / ФИНАЛЬНЫЙ ШТРИХ</span><FinishGame :upgraded="hasUpgrade('lamp')" :value="work.accuracy" @done="work.accuracy = $event"/><p v-if="selectedSupply" class="at-finish-material"><b>{{ selectedSupply.name }} · 1 приём из запаса</b>{{ supplyMatches ? `Бонус +${selectedSupply.bonus}: аккуратность от 85% и оценка 4–5 звёзд.` : 'Этот материал не даёт бонуса для выбранной работы.' }}</p><p class="at-subtle">{{ hasUpgrade('lamp') ? 'Ваша рабочая лампа расширяет зону точности.' : 'За аккуратность — до 30 дополнительных монет.' }}</p></div><div class="at-tool-bottom"><button class="at-btn at-primary" :disabled="work.accuracy === null || busy" data-testid="complete-order" @click="finish">{{ work.serial ? 'Показать результат клиенту' : 'Сохранить в портфолио' }} <Check :size="17"/></button></div></template>
     </aside></div><p class="at-game-note">Игровая практика: этапы и оттенки упрощены. Профессиональное обучение — со Светланой.</p>
    </section>

    <section v-else-if="view === 'style'" class="at-style"><p class="at-page-intro">Вы — лицо своей студии. Выберите причёску, одежду и любимые оттенки.</p><KeriWardrobe embedded :asset-base="root" :initial-look="state.keriLook" :save-look="saveLook"/></section>

    <section v-else-if="view === 'portfolio'" class="at-portfolio"><div class="at-portfolio-bar"><p>От первой работы к собственному стилю. <span>{{ state.designs.length }} / 24</span></p><div class="at-segmented"><button v-for="item in [{id:'all',label:'Все'},{id:'manicure',label:'Маникюр'},{id:'pedicure',label:'Педикюр'}]" :key="item.id" :aria-pressed="galleryFilter === item.id" @click="galleryFilter = item.id">{{ item.label }}</button></div></div><div v-if="filteredDesigns.length" class="at-gallery-grid"><button v-for="d in filteredDesigns" :key="d.id" class="at-design-card" @click="viewedDesign = d; modal = 'design'"><NailArt :design="d" :image-url="asset(d.kind === 'manicure' ? 'hand.png' : 'foot.png')"/><div><span class="at-eyebrow">{{ d.kind === 'manicure' ? 'МАНИКЮР' : 'ПЕДИКЮР' }}</span><h3>{{ d.name }}</h3><span>{{ new Date(d.createdAt).toLocaleDateString('ru-RU',{day:'numeric',month:'long'}) }} <ArrowUpRight :size="16"/></span></div></button></div><div v-else class="at-empty"><Images :size="40" :stroke-width="1"/><span class="at-eyebrow">ЗДЕСЬ НАЧИНАЕТСЯ ВАША ИСТОРИЯ</span><h2>Первая работа — особенная</h2><p>Примите гостя или начните с собственной идеи.</p><button class="at-btn at-primary" @click="practice(galleryFilter === 'pedicure' ? 'pedicure' : 'manicure')">Создать первую работу <ArrowUpRight :size="17"/></button></div></section>

    <section v-else-if="view === 'shop'" class="at-development"><p class="at-page-intro">Зарабатывайте на любимом деле и делайте рабочее место удобнее.</p><div class="at-upgrade-grid"><article v-for="upgrade in UPGRADES" :key="upgrade.id" class="at-upgrade-card" :class="{ owned: hasUpgrade(upgrade.id) }"><div class="at-upgrade-art" :class="`upgrade-${upgrade.id}`"><template v-if="upgrade.id === 'organizer'"><i v-for="n in 5" :key="n"/><span/></template><template v-else-if="upgrade.id === 'lamp'"><i/><span/><b/></template><template v-else><i v-for="n in 3" :key="n"/><span>SARKISIAN<br>PASTEL</span></template><span v-if="hasUpgrade(upgrade.id)" class="at-owned"><Check :size="13"/> В студии</span></div><div class="at-upgrade-copy"><span class="at-eyebrow">{{ upgrade.id === 'pastel' ? 'БОЛЬШЕ ТВОРЧЕСТВА' : 'РАБОТАТЬ ПРИЯТНЕЕ' }}</span><h2>{{ upgrade.name }}</h2><p>{{ upgrade.benefit }}</p><button class="at-btn" :class="hasUpgrade(upgrade.id) ? 'at-secondary' : 'at-primary'" :disabled="hasUpgrade(upgrade.id) || coins < upgrade.price" @click="purchase(upgrade.id)"><Check v-if="hasUpgrade(upgrade.id)" :size="16"/><Coins v-else :size="17"/>{{ hasUpgrade(upgrade.id) ? 'Установлено' : upgrade.price.toLocaleString('ru-RU') + ' · Улучшить' }}</button></div></article></div><button class="at-shelf-strip at-shop-shelf" @click="openShelf"><span><ShoppingBag :size="18"/> Материалы SARKISIAN</span><span><small>Пополнить запас за игровые монеты</small><ArrowUpRight :size="16"/></span></button><div class="at-special-orders"><span class="at-eyebrow">РЕПУТАЦИЯ ОТКРЫВАЕТ ДВЕРИ</span><h2>Записи с особой историей</h2><div v-for="special in ORDERS.filter(o => o.reputation)" :key="special.id"><span class="at-guest-avatar"><KeriPortrait :look="customerLook(special)" :asset-base="root"/></span><span><b>{{ special.customer }} · {{ special.title }}</b><small>{{ state.career.reputation >= special.reputation! ? 'Доступно в записи' : `Нужно ${special.reputation} репутации · сейчас ${state.career.reputation}` }}</small></span><Check v-if="state.career.reputation >= special.reputation!" :size="17"/><LockKeyhole v-else :size="17"/></div></div><div class="at-brand-story"><img :src="asset('gel-mousse.jpg')" alt="Оригинальный гель-мусс SARKISIAN № 23"/><div><span class="at-eyebrow">ОТ МАСТЕРА МАСТЕРАМ</span><h2>Идеи остаются с вами.<br>Материалы — рядом.</h2><p>Познакомьтесь с настоящими материалами SARKISIAN. Описания, реальные оттенки и ассортимент — на сайте бренда.</p><a class="at-btn at-primary" :href="siteBase" target="_blank" rel="noopener noreferrer">Перейти к SARKISIAN <ArrowUpRight :size="17"/></a></div></div><p class="at-game-note">Улучшения покупаются за игровые монеты. Они не связаны с оплатой или скидками в магазине.</p></section>
   </main>
  </div>
  <dialog ref="dialog" class="at-dialog" :class="{ 'at-dialog-wide': modal === 'result' || modal === 'design', 'at-material-dialog': modal === 'materials' }" @cancel.prevent="closeModal" @close="modal = null" @click="e => { if (e.target === dialog) closeModal() }">
   <button class="at-close at-icon" aria-label="Закрыть окно" @click="closeModal"><X :size="20"/></button>
   <template v-if="modal === 'mentor'"><div class="at-mentor-header"><img :src="asset('svetlana.png')" alt="Светлана Саркисян"/><div><span class="at-eyebrow">УЧИМСЯ У МАСТЕРА</span><h2>Светлана<br>Саркисян</h2></div></div><div class="at-dialog-content"><span class="at-eyebrow">УРОК {{ Math.min(state.completed.length+1,3) }} / 3</span><h2>{{ quest?.title ?? 'Прекрасное начало!' }}</h2><p>{{ quest?.brief ?? 'Все уроки пройдены. Пробуйте новые сочетания и собирайте своё портфолио.' }}</p><ol v-if="quest" class="at-lesson-steps"><li v-for="(step,i) in quest.steps" :key="step"><span>{{ i+1 }}</span>{{ step }}</li></ol><div v-if="quest" class="at-lesson-reward"><Coins :size="18"/> +{{ quest.reward }} монет за выполненный урок</div><button v-if="quest" class="at-btn at-primary" @click="acceptLesson">{{ state.activeQuest ? 'Продолжить урок' : 'Начать урок' }} <ArrowUpRight :size="17"/></button><button v-else class="at-btn at-primary" @click="closeModal(); navigate('portfolio')">Моё портфолио <ArrowUpRight :size="17"/></button></div></template>
   <MaterialShelf v-else-if="modal === 'materials'" :supplies="state.supplies" :coins="coins" :design="work?.design" :selected="work?.supply" :can-choose="canChooseSupply" :busy="busy" :message="shelfMessage" :site-base="siteBase" @choose="selectSupply" @buy="restock"/>
   <template v-else-if="modal === 'result' && (result || savedPractice)"><div class="at-result-art"><NailArt :design="(result?.saved ?? savedPractice)!" :image-url="asset((result?.saved ?? savedPractice)?.kind === 'manicure' ? 'hand.png' : 'foot.png')"/></div><div class="at-result-copy"><span class="at-eyebrow">{{ result ? 'ПРИЁМ ЗАВЕРШЁН' : 'НОВАЯ РАБОТА В ПОРТФОЛИО' }}</span><div v-if="result" class="at-result-stars" aria-label="Оценка работы"><Star v-for="n in 5" :key="n" :size="25" :fill="n <= result.stars ? 'currentColor' : 'none'"/></div><h2>{{ result ? result.stars >= 4 ? 'Красота в ваших руках' : 'Ещё один шаг к мастерству' : 'Ваш почерк. Ваш дизайн.' }}</h2><p>{{ result ? `${result.brief.customer}: «${result.stars >= 4 ? 'Именно то настроение, которое я хотела. Спасибо!' : 'Спасибо! В следующий раз давайте ещё точнее подберём дизайн.'}»` : questReward ? `Урок «${questReward.title}» выполнен.` : 'Работа сохранена. К ней можно вернуться или скачать изображение.' }}</p><div v-if="result" class="at-result-breakdown"><span>Цвет <b>{{ result.colors }}/5</b></span><span>Дизайн <b>{{ result.patterns }}/5</b></span><span>Аккуратность <b>{{ result.accuracy }}%</b></span></div><div v-if="result" class="at-fit-result"><span v-if="result.shapeMatch !== null" :class="{ missed: !result.shapeMatch }">{{ result.shapeMatch ? '✓' : '×' }} Форма</span><span v-if="result.lengthMatch !== null" :class="{ missed: !result.lengthMatch }">{{ result.lengthMatch ? '✓' : '×' }} Длина</span><span :class="{ missed: result.reputationDelta < 0 }">{{ result.reputationDelta > 0 ? '+' : '' }}{{ result.reputationDelta }} репутации</span></div><p v-if="result?.material" class="at-material-result">{{ supplyById(result.material.id)?.name }} · использована 1 порция<b>{{ result.material.bonus ? `+${result.material.bonus} монет за подбор материала и аккуратность` : 'Без бонуса: нужны подходящий тип работы, 4–5 звёзд и точность от 85%.' }}</b><small>Осталось на полке: {{ result.material.remaining }} приёмов</small></p><p v-if="result && result.tip" class="at-tip-note">В оплату входят {{ result.tip }} монет чаевых постоянного клиента.</p><p v-if="result" class="at-trust-note">Доверие {{ result.brief.customer }}: {{ result.trust }}/5 · {{ result.visits > 1 ? `Визит № ${result.visits}` : 'Начало нового знакомства' }}</p><div v-if="result || questReward" class="at-earned"><Coins :size="23"/>+{{ result?.reward ?? questReward?.reward }}<small>игровых монет</small></div><button class="at-btn at-primary" @click="afterResult">{{ shiftFull ? 'Итоги смены' : result ? 'Следующий гость' : 'В мою студию' }} <ArrowUpRight :size="18"/></button><button class="at-text-button" @click="download((result?.saved ?? savedPractice)!)"><Download :size="15"/> Скачать работу</button></div></template>
   <template v-else-if="modal === 'design' && viewedDesign"><div class="at-result-art"><NailArt :design="viewedDesign" :image-url="asset(viewedDesign.kind === 'manicure' ? 'hand.png' : 'foot.png')"/></div><div class="at-result-copy"><span class="at-eyebrow">ВАШЕ ПОРТФОЛИО</span><h2>{{ viewedDesign.name }}</h2><p v-if="supplyById(viewedDesign.material)" class="at-portfolio-material">Материал: {{ supplyById(viewedDesign.material)?.name }} SARKISIAN</p><button class="at-btn at-primary" @click="download(viewedDesign!)"><Download :size="17"/> Скачать изображение</button></div></template>
   <form v-else-if="modal === 'settings'" class="at-dialog-content" @submit.prevent="saveSettings"><span class="at-eyebrow">УСТРАИВАЙТЕСЬ ПОУДОБНЕЕ</span><h2>Всё по-вашему</h2><label class="at-field">Название студии<input v-model="settingsName" maxlength="24"/></label><label class="at-field">Громкость · {{ Math.round(state.volume*100) }}%<input v-model.number="state.volume" type="range" min="0" max="1" step=".01"/></label><div class="at-segmented"><button type="button" :aria-pressed="state.track === 0" @click="state.track = 0">Chic & Cheerful I</button><button type="button" :aria-pressed="state.track === 1" @click="state.track = 1">Chic & Cheerful II</button></div><button type="button" class="at-btn at-secondary" @click="toggleMusic"><Volume2 :size="17"/>{{ playing ? 'Выключить музыку' : 'Слушать музыку' }}</button><p class="at-subtle">Прогресс хранится в этом браузере. Музыка затихает, когда вы переключаете вкладку.</p><button class="at-btn at-primary" type="submit">Сохранить <Check :size="17"/></button></form>
   <div v-else-if="modal === 'shift'" class="at-dialog-content at-shift-dialog"><span class="at-eyebrow">СМЕНА {{ day }} · {{ shiftFull ? 'ПОДВОДИМ ИТОГИ' : 'ВАШИ ЦЕЛИ' }}</span><h2>{{ shiftFull ? 'Маленькие победы дня' : 'Какой будет эта смена?' }}</h2><p>Выберите три приёма под цели смены. Хорошие работы повышают репутацию, а выполненные цели приносят дополнительные монеты.</p><ShiftGoals :shift="state.career.shift"/><div v-if="state.career.shift.visits.length" class="at-shift-visits"><div v-for="(visit,i) in state.career.shift.visits" :key="i"><span>{{ visit.customer }}<small>{{ visit.kind === 'manicure' ? 'Маникюр' : 'Педикюр' }}</small></span><b>{{ visit.stars }} <Star :size="12"/></b><span>+{{ visit.reward }}</span></div></div><div class="at-shift-bonus"><span>{{ shiftFull ? 'Награда за смену' : 'Заработано награды' }}<small>50 за смену + выполненные цели</small></span><b><Coins :size="20"/>+{{ shiftReward(state.career.shift) }}</b></div><button class="at-btn at-primary" :disabled="!shiftFull || busy" data-testid="close-shift" @click="closeShift">Забрать награду и открыть смену {{ day + 1 }} <ArrowUpRight :size="16"/></button><p v-if="!shiftFull" class="at-subtle">Осталось завершить приёмов: {{ 3 - state.career.shift.visits.length }}. Практика не расходует запись.</p></div>
   <div v-else-if="modal === 'clients'" class="at-dialog-content at-clients-dialog"><span class="at-eyebrow">ЛЮДИ, КОТОРЫЕ ВОЗВРАЩАЮТСЯ</span><h2>Книга ваших клиентов</h2><p>За работу на 4–5 звёзд растёт доверие. После двух удачных визитов гость начинает оставлять чаевые. За 1–2 звезды доверие снижается.</p><div v-if="!clientBook.length" class="at-clients-empty">Первое знакомство начинается с первого приёма.</div><article v-for="client in clientBook" :key="client.order.id" class="at-client-record"><span class="at-guest-avatar"><KeriPortrait :look="customerLook(client.order)" :asset-base="root"/></span><div><b>{{ client.order.customer }} <small>{{ client.trust >= 3 ? 'Постоянный гость' : 'Знакомимся' }}</small></b><span>Визитов: {{ client.visits }} · последняя оценка {{ client.lastStars }}/5</span><div class="at-trust-stars" :aria-label="`Доверие ${client.trust} из 5`"><Star v-for="n in 5" :key="n" :size="12" :fill="n <= client.trust ? 'currentColor' : 'none'"/></div></div><span class="at-client-tip">{{ client.trust >= 2 ? `до +${Math.min(45,client.trust*8)}` : '—' }}<small>чаевые</small></span></article><p class="at-subtle">Чаевые начисляются за удачный повторный приём. Новые особые записи открываются при репутации 20 и 50.</p><button class="at-btn at-primary" @click="closeModal">К своей студии <ArrowUpRight :size="17"/></button></div>
   <div v-else-if="modal === 'help'" class="at-dialog-content"><span class="at-eyebrow">ВАША СТУДИЯ. ВАША ИСТОРИЯ.</span><h2>Мастер здесь — вы</h2><ol class="at-lesson-steps"><li><span>1</span>Выберите гостя в записи и прочитайте пожелание.</li><li><span>2</span>Выберите форму и длину по пожеланию, подготовьте пять ногтей. Подберите цвет и рисунок.</li><li><span>3</span>Поймайте блик на финише и покажите результат. Точность заказа влияет на оценку и оплату.</li><li><span>4</span>Подведите итоги после трёх приёмов. Выполняйте цели смены, развивайте студию и возвращайте постоянных гостей.</li></ol><p class="at-subtle">В практике можно экспериментировать. Переходы между разделами и перезагрузка сохраняют текущую работу. Нажмите на правые полки в студии, чтобы пополнить материалы. Подходящий материал даёт бонус за работу на 4–5 звёзд с точностью от 85%. Базовый набор безлимитный.</p><button class="at-btn at-primary" @click="closeModal">Начнём <ArrowUpRight :size="17"/></button><p class="at-credits">Персонажи Keri: Konett · адаптация LunaLucid / Namastaii, CC BY. Интерьер создан для игры. Музыка предоставлена владельцем проекта.</p></div>
   <p v-if="saveError" class="at-dialog-error" role="alert">{{ saveError }}</p>
  </dialog>
  <div v-if="!loaded" class="at-loading" role="status"><span/> Открываем вашу студию…</div>
 </div>
</template>
