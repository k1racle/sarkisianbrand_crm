<script setup lang="ts">
import KeriPortrait from './KeriPortrait.vue'
import StudioClock from './StudioClock.vue'
import type { KeriLook } from '../keri/look'
defineProps<{ assetBase: string; look: KeriLook; name: string; upgraded: boolean; empty?: boolean }>()
defineEmits<{ shelf: [] }>()
</script>
<template>
  <div class="at-scene" role="group" aria-label="Рабочее место с точки зрения мастера">
    <img class="at-room" :src="`${assetBase}atelier/studio-v3.png`" alt="Твой стол. Клиентское кресло напротив, лампа справа. На правых полках — фирменные банки и флаконы SARKISIAN." fetchpriority="high" />
    <StudioClock/>
    <div class="at-room-sign" aria-hidden="true">SARKISIAN<span>NAIL ATELIER</span></div>
    <Transition name="at-arrive" mode="out-in"><div v-if="!empty" :key="name" class="at-seated-client"><KeriPortrait :look="look" :asset-base="assetBase" crop="seated" animated :label="`Клиент — ${name}`"/></div></Transition>
    <img class="at-foreground" :src="`${assetBase}atelier/studio-v3.png`" alt="" aria-hidden="true" />
    <div v-if="upgraded" class="at-desk-collection" aria-label="Коллекция Pastel на твоём столе"><i/><i/><i/><span>PASTEL</span></div>
    <div class="at-sunbeam" aria-hidden="true"/>
    <button class="at-shelf-hit" aria-label="Открыть полку материалов SARKISIAN" @click="$emit('shelf')"/>
  </div>
</template>
<style scoped>
.at-scene{position:relative;aspect-ratio:3/2;overflow:hidden;background:#eee5d5;isolation:isolate}.at-room,.at-foreground{position:absolute;width:100%;height:100%;inset:0;object-fit:cover}.at-foreground{clip-path:polygon(0 69%,83.5% 69%,84.2% 65%,86% 62%,90% 60.5%,100% 60.5%,100% 100%,0 100%);pointer-events:none;z-index:3}.at-seated-client{position:absolute;left:34%;width:32%;top:16.5%;z-index:2;filter:drop-shadow(6px 8px 5px #38201414)}.at-room-sign{position:absolute;left:50%;top:8%;transform:translateX(-50%);font:500 clamp(9px,1.45vw,22px)/1.5 Georgia,serif;letter-spacing:.2em;color:#685440aa;white-space:nowrap;text-align:center}.at-room-sign span{display:block;font:500 6px/2.3 Arial,sans-serif;letter-spacing:.35em}.at-sunbeam{position:absolute;inset:0;z-index:4;pointer-events:none;background:linear-gradient(115deg,#fff6db17,transparent 55%);animation:at-daylight 18s ease-in-out infinite alternate}.at-desk-collection{position:absolute;z-index:4;bottom:13%;left:22%;display:flex;gap:3px;align-items:end}.at-desk-collection i{width:19px;height:24px;border-radius:4px 4px 7px 7px;background:#a995ba;border-top:7px solid #353330;box-shadow:3px 4px 2px #29251b18}.at-desk-collection i:nth-child(2){background:#adc7d1}.at-desk-collection i:nth-child(3){background:#ddb4a7}.at-desk-collection span{position:absolute;font:5px Arial;letter-spacing:1px;bottom:-10px;left:10px;color:#736455}.at-arrive-enter-active,.at-arrive-leave-active{transition:opacity .4s ease}.at-arrive-enter-from,.at-arrive-leave-to{opacity:0}@keyframes at-daylight{to{opacity:.25}}@media(prefers-reduced-motion:reduce){.at-sunbeam{animation:none}.at-arrive-enter-active,.at-arrive-leave-active{transition:none}}
</style>
<style scoped>
.at-shelf-hit{position:absolute;right:0;top:10%;width:11%;min-width:44px;height:37%;z-index:5;border:1px solid transparent;border-radius:8px;background:transparent;cursor:pointer}.at-shelf-hit:hover{background:#fff4d81a;border-color:#e6d7b588}.at-shelf-hit:focus-visible{outline:2px solid #f3e9c4;outline-offset:-3px;background:#fff4d829}
</style>
