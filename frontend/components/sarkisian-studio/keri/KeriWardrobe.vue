<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { ArrowLeft, ArrowDownToLine, Check, RotateCcw, Shuffle, Sparkles, Shirt, Scissors, UserRound } from '@lucide/vue'
import KeriAvatar from './KeriAvatar.vue'
import KeriChoice from './KeriChoice.vue'
import { DEFAULT_KERI_LOOK, KERI_PRESETS, KERI_STORAGE_KEY, HAIR_COLORS, SKIN_COLORS, EYE_COLORS, HAIR_NAMES, TOP_NAMES, BOTTOM_NAMES, parseKeriLook, type KeriLook } from './look.ts'
import { renderKeriLook } from './render'
import './wardrobe.css'

const props = withDefaults(defineProps<{ assetBase?: string; embedded?:boolean; initialLook?:KeriLook; saveLook?:(look:KeriLook)=>Promise<void> }>(), { assetBase: '/studio-assets/',embedded:false })
const root = computed(() => props.assetBase.replace(/\/?$/, '/'))
const assets = computed(() => `${root.value}keri/`)
const look = ref<KeriLook>({ ...DEFAULT_KERI_LOOK })
const savedLook = ref<KeriLook>({ ...DEFAULT_KERI_LOOK })
const tab = ref('clothes')
const closeUp=ref(false)
const optionsPanel = ref<HTMLElement>()
watch(tab, async () => {
  closeUp.value=tab.value==='hair'||tab.value==='face'
  await nextTick()
  if (optionsPanel.value) optionsPanel.value.scrollTop = 0
})
const tabs = [
  { id: 'presets', label: 'Образы', icon: Sparkles }, { id: 'clothes', label: 'Одежда', icon: Shirt },
  { id: 'hair', label: 'Волосы', icon: Scissors }, { id: 'face', label: 'Лицо', icon: UserRound },
]
const loading = ref(true)
const ready = ref(false)
const error = ref('')
const message = ref('')
const exporting = ref(false)
const saving=ref(false)
const avatarKey = ref(0)
const dirty = computed(() => JSON.stringify(look.value) !== JSON.stringify(savedLook.value))
const preview = (patch: Partial<KeriLook>) => ({ ...look.value, ...patch })
function update(patch: Partial<KeriLook>) {
  look.value = preview(patch)
  error.value = ''; message.value = ''
}
onMounted(() => {
  if(![...document.fonts].some(font=>font.family==='KeriMontserrat'))for(const [file,range] of [['montserrat-cyrillic.woff2','U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116'],['montserrat-latin.woff2','U+0000-00FF,U+2000-206F']]){
    const font=new FontFace('KeriMontserrat',`url("${root.value}${file}")`,{weight:'100 900',unicodeRange:range});document.fonts.add(font);void font.load().catch(()=>document.fonts.delete(font))
  }
  try {
    const raw = props.initialLook ? null : localStorage.getItem(KERI_STORAGE_KEY)
    if(props.initialLook)look.value=parseKeriLook(props.initialLook)
    else if (raw) look.value = parseKeriLook(JSON.parse(raw))
    savedLook.value = { ...look.value }
  } catch { message.value = 'Начнём с нового образа.' }
})
async function save() {
  if(saving.value)return
  saving.value=true
  try {
    if(props.saveLook)await props.saveLook({...look.value})
    else localStorage.setItem(KERI_STORAGE_KEY, JSON.stringify(look.value))
    savedLook.value = { ...look.value }
    message.value = 'Образ сохранён в этом браузере.'
  } catch { message.value = 'Не получилось сохранить образ. Попробуй ещё раз или скачай PNG.' }
  finally{saving.value=false}
}
function reset() {
  update({ ...savedLook.value })
  message.value = 'Вернулись к сохранённому образу.'
}
function randomize() {
  const pick = (n: number) => 1 + Math.floor(Math.random() * n)
  update({ hair: pick(5), hairColor: pick(7), top: pick(5), topColor: pick(6), bottom: pick(3), bottomColor: pick(6) })
}
async function download() {
  exporting.value = true
  try {
    const canvas=await renderKeriLook({...look.value},assets.value,948)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Не удалось создать PNG.')), 'image/png'))
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = 'SARKISIAN-my-look.png'; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 30000)
    message.value = 'PNG подготовлен. Персонаж: Konett, адаптация: LunaLucid (CC BY).'
  } catch { message.value = 'Не удалось скачать образ. Попробуй ещё раз.' }
  finally { exporting.value = false }
}
</script>

<template>
  <div class="keri-wardrobe" :class="{'kw-embedded':embedded}">
    <header v-if="!embedded" class="kw-header">
      <a class="kw-brand" href="./" aria-label="SARKISIAN Studio — в студию"><img :src="`${root}logo.png`" alt="SARKISIAN" /><span>STUDIO</span></a>
      <span class="kw-header-caption">Место для твоего творчества</span>
      <a class="kw-back" href="./"><ArrowLeft :size="15" /><span>В студию</span></a>
    </header>

    <main class="kw-main">
      <div v-if="!embedded" class="kw-heading">
        <div><span class="kw-eyebrow">SARKISIAN · ПРИМЕРОЧНАЯ</span><h1>Образ, в котором ты — это ты.</h1><p>Собери свой стиль. Меняй детали под настроение.</p></div>
        <span class="kw-step"><span>01</span> Твой персонаж</span>
      </div>

      <div class="kw-workspace">
        <section class="kw-preview" aria-label="Примерка образа">
          <div class="kw-stage">
            <div class="kw-stage-note"><span class="kw-eyebrow">ТВОЁ НАСТРОЕНИЕ</span><span>Начинается<br />с деталей.</span></div>
            <div class="kw-arch" aria-hidden="true"></div>
            <div class="kw-avatar-frame" :class="{'is-close':closeUp}">
              <KeriAvatar :key="avatarKey" :look="look" :asset-base="assets" @loading="loading = $event" @ready="ready = true; error = ''" @error="error = $event" />
            </div>
            <span class="kw-stage-mark" aria-hidden="true">S.</span>
            <button class="kw-camera" :aria-pressed="closeUp" @click="closeUp=!closeUp">{{ closeUp?'Весь образ':'Ближе' }}</button>
          </div>
          <div class="kw-preview-footer">
            <span class="kw-preview-state" role="status">{{ error ? 'Образ не загрузился' : loading ? 'Примеряем…' : 'Твой образ' }}</span>
            <button v-if="error" class="kw-text-button" @click="avatarKey++">Попробовать снова</button>
            <button v-else class="kw-text-button" :disabled="!ready || exporting || loading" @click="download"><ArrowDownToLine :size="16" />{{ exporting ? 'Готовим PNG…' : 'Скачать PNG' }}</button>
          </div>
        </section>

        <section class="kw-controls" aria-label="Настройки внешности">
          <nav class="kw-tabs" aria-label="Разделы примерочной">
            <button v-for="item in tabs" :key="item.id" :class="{ active: tab === item.id }" :aria-pressed="tab === item.id" @click="tab = item.id"><component :is="item.icon" :size="18" /><span>{{ item.label }}</span></button>
          </nav>

          <div ref="optionsPanel" class="kw-options">
            <template v-if="tab === 'presets'">
              <div class="kw-section-title"><h2>С чего начнём?</h2><span>04 образа</span></div>
              <p class="kw-section-description">Выбери основу и добавь свои детали.</p>
              <div class="kw-preset-grid">
                <KeriChoice v-for="preset in KERI_PRESETS" :key="preset.name" :look="preset.look" :asset-base="assets" :label="preset.name" :selected="JSON.stringify(look) === JSON.stringify(preset.look)" crop="look" @select="update(preset.look)" />
              </div>
            </template>

            <template v-else-if="tab === 'clothes'">
              <div class="kw-section-title"><h2>Верх</h2><span>05 вариантов</span></div>
              <div class="kw-item-grid">
                <KeriChoice v-for="(name, index) in TOP_NAMES" :key="name" :look="preview({ top: index + 1 })" :asset-base="assets" :label="name" :selected="look.top === index + 1" crop="top" @select="update({ top: index + 1 })" />
              </div>
              <fieldset class="kw-variants"><legend>Расцветка верха</legend><div>
                <button v-for="n in 6" :key="n" :aria-label="`Расцветка верха ${n}`" :aria-pressed="look.topColor === n" :class="{ selected: look.topColor === n }" @click="update({ topColor: n })"><img :src="`${assets}Tops/top${look.top}_${n}.png`" alt="" /></button>
              </div></fieldset>
              <div class="kw-divider"></div>
              <div class="kw-section-title"><h2>Низ</h2><span>03 варианта</span></div>
              <div class="kw-item-grid kw-bottom-grid">
                <KeriChoice v-for="(name, index) in BOTTOM_NAMES" :key="name" :look="preview({ bottom: index + 1 })" :asset-base="assets" :label="name" :selected="look.bottom === index + 1" crop="bottom" @select="update({ bottom: index + 1 })" />
              </div>
              <fieldset class="kw-variants"><legend>Расцветка низа</legend><div>
                <button v-for="n in 6" :key="n" :aria-label="`Расцветка низа ${n}`" :aria-pressed="look.bottomColor === n" :class="{ selected: look.bottomColor === n }" @click="update({ bottomColor: n })"><img class="kw-bottom-swatch" :src="`${assets}Bottoms/bottom${look.bottom}_${n}.png`" alt="" /></button>
              </div></fieldset>
            </template>

            <template v-else-if="tab === 'hair'">
              <div class="kw-section-title"><h2>Причёска</h2><span>05 вариантов</span></div>
              <div class="kw-hair-grid">
                <KeriChoice v-for="(name, index) in HAIR_NAMES" :key="name" :look="preview({ hair: index + 1 })" :asset-base="assets" :label="name" :selected="look.hair === index + 1" crop="hair" @select="update({ hair: index + 1 })" />
              </div>
              <fieldset class="kw-swatches"><legend>Цвет волос <span>{{ HAIR_COLORS[look.hairColor - 1]?.[0] }}</span></legend><div>
                <button v-for="(color, index) in HAIR_COLORS" :key="color[0]" :style="{ '--swatch': color[1] }" :aria-label="`Волосы: ${color[0]}`" :aria-pressed="look.hairColor === index + 1" :class="{ selected: look.hairColor === index + 1 }" @click="update({ hairColor: index + 1 })"><Check v-if="look.hairColor === index + 1" :size="15" /></button>
              </div></fieldset>
            </template>

            <template v-else>
              <div class="kw-section-title"><h2>Твои черты</h2><span>В деталях</span></div>
              <fieldset class="kw-swatches"><legend>Тон кожи <span>{{ SKIN_COLORS[look.skin - 1]?.[0] }}</span></legend><div>
                <button v-for="(color, index) in SKIN_COLORS" :key="color[0]" :style="{ '--swatch': color[1] }" :aria-label="`Кожа: ${color[0]}`" :aria-pressed="look.skin === index + 1" :class="{ selected: look.skin === index + 1 }" @click="update({ skin: index + 1 })"><Check v-if="look.skin === index + 1" :size="15" /></button>
              </div></fieldset>
              <div class="kw-divider"></div>
              <fieldset class="kw-eye-shape"><legend>Форма глаз</legend><div>
                <KeriChoice v-for="n in 3" :key="n" :look="preview({ eyes: n })" :asset-base="assets" :label="`Форма ${n}`" :selected="look.eyes === n" crop="hair" @select="update({ eyes: n })" />
              </div></fieldset>
              <fieldset class="kw-swatches"><legend>Цвет глаз <span>{{ EYE_COLORS[look.eyeColor - 1]?.[0] }}</span></legend><div>
                <button v-for="(color, index) in EYE_COLORS" :key="color[0]" :style="{ '--swatch': color[1] }" :aria-label="`Глаза: ${color[0]}`" :aria-pressed="look.eyeColor === index + 1" :class="{ selected: look.eyeColor === index + 1 }" @click="update({ eyeColor: index + 1 })"><Check v-if="look.eyeColor === index + 1" :size="15" /></button>
              </div></fieldset>
            </template>
          </div>

          <div class="kw-actions">
            <div class="kw-utility"><button class="kw-text-button" @click="randomize"><Shuffle :size="16" />Случайный образ</button><button class="kw-text-button" :disabled="!dirty" @click="reset"><RotateCcw :size="15" />Вернуть</button></div>
            <button class="kw-save" :disabled="!ready || loading || !!error || saving" @click="save"><span>{{ saving?'Сохраняем…':'Сохранить образ' }}</span><Check :size="18" /></button>
            <p class="kw-save-message" aria-live="polite">{{ message || error || (dirty ? 'Есть изменения. Сохрани свой новый образ.' : 'Образ сохранится на этом устройстве.') }}</p>
          </div>
        </section>
      </div>
    </main>
    <footer class="kw-credits"><span>SARKISIAN STUDIO · ТВОЯ ИСТОРИЯ КРАСОТЫ</span><span>Персонаж <a href="https://konett.itch.io/" target="_blank" rel="noreferrer">Konett</a> · адаптация <a href="https://lunalucid.itch.io/free-character-creation-template-for-renpy" target="_blank" rel="noreferrer">LunaLucid</a> · CC BY</span></footer>
  </div>
</template>
