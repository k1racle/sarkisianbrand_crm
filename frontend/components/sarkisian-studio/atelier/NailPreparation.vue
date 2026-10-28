<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { Check, ChevronRight, MousePointer2, CheckCheck, ZoomIn, Scan } from '@lucide/vue'
import StudioTool from './StudioTool.vue'
import NailFinish from '../NailFinish.vue'
import NailPhotoLighting from '../NailPhotoLighting.vue'
import { anatomyNails, nailName, surfaceTransform } from '../anatomy'
import type { Design } from '../model'
import { TECHNIQUES, TOOLS, currentPrepStep, preparationSteps, prepProgress, freshPreparation, applyTool, type Preparation, type ToolId, type Technique } from './preparation'
const props=defineProps<{preparation:Preparation;nailIndex:number;mode:'board'|'tools';organizer?:boolean;design?:Design;imageUrl?:string}>()
const emit=defineEmits<{update:[value:Preparation];select:[nail:number]}>()
const step=computed(()=>currentPrepStep(props.preparation)),steps=computed(()=>preparationSteps(props.preparation.technique)),progress=computed(()=>prepProgress(props.preparation))
const nail=computed(()=>Math.max(0,Math.min(4,props.nailIndex)))
const value=computed(()=>step.value?props.preparation.progress[step.value.id]?.[nail.value]??0:100)
const toolReady=computed(()=>!!step.value?.tools.includes(props.preparation.tool)),selectedTool=computed(()=>TOOLS.find(t=>t.id===props.preparation.tool)!)
const active=ref(false),pointer=ref({x:0,y:0}),feedback=ref(''),zoom=ref(false),photoReady=ref(false)
const svg=ref<SVGSVGElement>(),uid=useId().replaceAll(':','')
const kind=computed(()=>props.design?.kind??'manicure'),nails=computed(()=>anatomyNails(kind.value)),current=computed(()=>nails.value[nail.value]!)
const camera=computed(()=>{if(!zoom.value)return {x:0,y:0,w:1448,h:1086};const n=current.value,w=Math.max(120,n.w*2.8);return {x:n.x+n.w/2-w/2,y:Math.max(0,n.y-n.h*.3),w,h:w*470/360}})
const viewBox=computed(()=>`${camera.value.x} ${camera.value.y} ${camera.value.w} ${camera.value.h}`),unit=computed(()=>camera.value.w/360)
const zonePath=computed(()=>step.value?.zone==='cuticle'?current.value.cuticle:step.value?.zone==='sides'?current.value.sidewalls:step.value?.zone==='tip'?current.value.freeEdge:current.value.path)
const progressAt=(stepId:string,index:number)=>props.preparation.progress[stepId]?.[index]??0
watch(()=>props.imageUrl,()=>{photoReady.value=false})
let lastStroke=0
function chooseTool(tool:ToolId){emit('update',{...props.preparation,tool});feedback.value=''}
function technique(id:Technique){if(progress.value===0)emit('update',freshPreparation(id))}
function stroke(){
  if(!toolReady.value){feedback.value='Выберите подсвеченный инструмент для этого этапа.';return}
  if(value.value===100){feedback.value='Этот ноготь готов. Выберите следующий.';return}
  const stepId=step.value!.id,next=applyTool(props.preparation,nail.value)
  emit('update',next);feedback.value=''
  if(next.progress[stepId]?.[nail.value]===100){const pending=next.progress[stepId]?.findIndex(p=>p<100)??-1;if(pending!==-1)emit('select',pending);else{emit('select',0);feedback.value='Этап завершён. Выберите инструмент для следующего.'}}
}
function touch(event:PointerEvent,start=false){
  const matrix=svg.value?.getScreenCTM();if(!matrix||!photoReady.value)return
  const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());pointer.value={x:point.x,y:point.y}
  if(start){active.value=true;(event.currentTarget as SVGElement).setPointerCapture(event.pointerId)}
  if(start&&!zoom.value){const paths=svg.value?.querySelectorAll<SVGPathElement>('.at-prep-nail-hit'),hit=paths?Array.from(paths).findIndex(path=>path.isPointInFill(point)||path.isPointInStroke(point)):-1;if(hit!==-1&&hit!==nail.value){emit('select',hit);return}}
  if(!active.value||!step.value||performance.now()-lastStroke<110)return
  const target=svg.value?.querySelector<SVGPathElement>('.at-prep-zone-hit')
  const valid=!!target&&(step.value.zone==='plate'?target.isPointInFill(point)||target.isPointInStroke(point):target.isPointInStroke(point))
  if(valid){lastStroke=performance.now();stroke()}
}
function end(){active.value=false}
function processAll(){if(!props.organizer||!step.value||!toolReady.value)return;emit('update',{...props.preparation,progress:{...props.preparation.progress,[step.value.id]:[100,100,100,100,100]}});emit('select',0)}
</script>
<template>
 <div v-if="mode==='board'" class="at-preparation-board at-photo-preparation" :class="{'is-overview':!zoom}">
  <div class="at-prep-board-title"><span>{{step?.name??'Подготовка завершена'}}</span><b>{{progress}}%</b></div>
  <div class="at-anatomy-toolbar"><span>{{nailName(kind,nail)}} · {{value}}%</span><button type="button" :aria-pressed="zoom" @click="zoom=!zoom"><Scan v-if="zoom" :size="15"/><ZoomIn v-else :size="15"/>{{zoom?(kind==='pedicure'?'Вся стопа':'Вся рука'):'Приблизить ноготь'}}</button></div>
  <svg ref="svg" class="at-prep-canvas at-photo-canvas" :viewBox="viewBox" :style="{aspectRatio:`${camera.w}/${camera.h}`}" role="group" :aria-label="`Обработка ногтя ${nail+1}: ${step?.name??'готово'}`" @pointerdown.prevent="touch($event,true)" @pointermove.prevent="touch($event)" @pointerup="end" @pointercancel="end" @lostpointercapture="end">
   <defs><linearGradient :id="`${uid}-gloss`"><stop stop-color="#0002"/><stop offset=".28" stop-color="#fff5"/><stop offset=".5" stop-color="#fff0"/><stop offset="1" stop-color="#0002"/></linearGradient><clipPath v-for="(n,i) in nails" :id="`${uid}-nail-${i}`" :key="i"><path :d="n.path"/></clipPath></defs>
   <image :href="imageUrl" width="1448" height="1086" @load="photoReady=true" @error="feedback='Изображение не загрузилось. Обновите страницу, чтобы продолжить.'"/>
   <g v-for="(n,i) in nails" :key="i">
    <g :clip-path="`url(#${uid}-nail-${i})`">
     <g v-if="progressAt('remove',i)<100" :opacity="1-progressAt('remove',i)/100" style="isolation:isolate"><NailFinish :nail="{color:'mauve',pattern:'plain',finish:'glossy'}" :geometry="n" :gloss-id="`${uid}-gloss`" photographic/><NailPhotoLighting :image-url="imageUrl!" :geometry="n"/></g>
     <g :transform="surfaceTransform(n)" fill="none" stroke-linecap="round">
      <path v-if="progressAt('buff',i)<100" d="M32 24L34 73M49 21L51 79M66 27L68 68" stroke="#fff" stroke-width=".7" :opacity=".18*(1-progressAt('buff',i)/100)"/>
      <path v-if="progressAt('base',i)>0" d="M25 26Q20 43 25 66" stroke="#fff" stroke-width="3" :opacity="progressAt('base',i)/250"/>
     </g>
    </g>
    <path class="at-prep-nail-hit" :d="n.path" fill="transparent" stroke="transparent" :stroke-width="n.w*.45"/>
    <path v-if="i===nail&&step?.zone!=='plate'" :d="n.path" fill="none" stroke="#fff" stroke-width=".8" vector-effect="non-scaling-stroke" opacity=".45" pointer-events="none"/>
   </g>
   <path v-if="step" class="at-prep-zone-hit" :d="zonePath" :fill="step.zone==='plate'?'transparent':'none'" stroke="transparent" :stroke-width="current.w*.48"/>
   <path v-if="step" class="at-prep-zone" :d="zonePath" fill="none" stroke="#fff" stroke-width="1.1" vector-effect="non-scaling-stroke" stroke-dasharray="3 4" opacity=".75" pointer-events="none"/>
   <g v-if="active&&toolReady" :transform="`translate(${pointer.x-unit*8} ${pointer.y-unit*2}) rotate(-25)`" pointer-events="none"><foreignObject :width="unit*35" :height="unit*96"><StudioTool :tool="preparation.tool" active/></foreignObject></g>
  </svg>
  <div class="at-prep-board-foot"><MousePointer2 :size="16"/><span>{{toolReady?step?.hint??'Все ногти готовы к дизайну.':'Выберите инструмент, затем ведите им по подсвеченной области.'}}</span></div>
  <div class="at-mobile-tray" role="group" aria-label="Инструменты рядом с ногтем"><button v-for="tool in TOOLS.filter(t=>step?.tools.includes(t.id))" :key="tool.id" :aria-label="tool.name" :aria-pressed="preparation.tool===tool.id" @click="chooseTool(tool.id)"><StudioTool :tool="tool.id"/><span>{{tool.name}}</span></button></div>
  <button class="at-btn at-secondary at-keyboard-prep" :disabled="!step||!toolReady||!photoReady" @click="stroke">{{value===100?'Ноготь обработан':'Обработать ноготь · касание'}} <Check :size="16"/></button>
  <p v-if="feedback" role="status" class="at-prep-feedback">{{feedback}}</p>
 </div>
 <div v-else class="at-preparation-controls">
  <fieldset class="at-techniques"><legend>Техника маникюра</legend><div><button v-for="item in TECHNIQUES" :key="item.id" :aria-pressed="preparation.technique===item.id" :disabled="progress>0&&preparation.technique!==item.id" @click="technique(item.id)">{{item.name}}</button></div></fieldset>
  <h2>{{step?.name??'Основа готова'}}</h2><p>{{step?.hint??'Можно выбирать оттенки и создавать дизайн.'}}</p>
  <div v-if="step" class="at-tool-tray" role="group" aria-label="Инструменты для маникюра"><button v-for="tool in TOOLS" :key="tool.id" :class="{recommended:step.tools.includes(tool.id)}" :aria-pressed="preparation.tool===tool.id" :aria-label="tool.name" @click="chooseTool(tool.id)"><StudioTool :tool="tool.id"/><span>{{tool.name}}</span></button></div>
  <p v-if="step" class="at-prep-selected">{{selectedTool.name}} · {{toolReady?'подходит для этапа':'выберите подсвеченный инструмент'}}</p>
  <ol class="at-treatment-steps"><li v-for="item in steps" :key="item.id" :class="{active:item.id===step?.id,complete:preparation.progress[item.id]?.every(p=>p===100)}"><Check v-if="preparation.progress[item.id]?.every(p=>p===100)" :size="15"/><ChevronRight v-else :size="15"/><span>{{item.name}}</span><small>{{(preparation.progress[item.id]??[]).filter(p=>p===100).length}} / 5</small></li></ol>
  <button v-if="organizer&&step" class="at-btn at-secondary" :disabled="!toolReady" @click="processAll"><CheckCheck :size="16"/> Органайзер · завершить текущий этап</button>
 </div>
</template>
<style scoped>
.at-photo-preparation{max-width:none!important;padding:0!important}.at-photo-preparation .at-prep-board-title{padding:18px 20px 8px}.at-anatomy-toolbar{display:flex;gap:12px;justify-content:space-between;align-items:center;padding:8px 20px 16px;font-size:11px;color:#fff}.at-anatomy-toolbar button{display:flex;align-items:center;gap:7px;color:#fff;background:#ffffff0d;border:1px solid #ffffff60;border-radius:20px;padding:8px 12px;font:inherit;white-space:nowrap}.at-anatomy-toolbar button:hover{background:#ffffff20}.at-photo-preparation .at-photo-canvas{width:100%;max-height:490px;background:#252424;display:block;touch-action:none}.at-photo-preparation.is-overview .at-photo-canvas{max-height:none}.at-photo-preparation .at-prep-board-foot{margin:0;padding:16px 20px;justify-content:start}.at-photo-preparation .at-keyboard-prep{width:calc(100% - 40px);margin:0 20px 16px}.at-photo-preparation .at-mobile-tray{padding:8px 20px 16px}.at-photo-preparation .at-prep-feedback{margin:0;padding:0 20px 16px}.at-prep-zone{animation-duration:2.8s}@media(max-width:720px){.at-anatomy-toolbar{padding:8px 12px 12px;font-size:10px;gap:8px}.at-anatomy-toolbar button{padding:7px 9px;font-size:10px}.at-photo-preparation .at-prep-board-title{padding:14px 12px 6px}.at-photo-preparation .at-photo-canvas{max-height:350px}.at-photo-preparation .at-prep-board-foot{padding:12px;font-size:11px}.at-photo-preparation .at-mobile-tray{padding:8px 12px 12px}.at-photo-preparation .at-keyboard-prep{margin:0 12px 14px;width:calc(100% - 24px)}}
</style>
