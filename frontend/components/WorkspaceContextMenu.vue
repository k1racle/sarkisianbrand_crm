<script setup lang="ts">
import {
  Archive,
  ArrowUpRight,
  Clipboard,
  ExternalLink,
  FilePenLine,
  FolderOpen,
  House,
  RefreshCw,
  ShieldX,
  Tags,
  Trash2,
  X,
} from "@lucide/vue";
import type {
  ContextMenuIcon,
  ContextMenuItem,
} from "~/composables/useContextMenu";
const router = useRouter();
const { contextMenuState, openContextMenu, closeContextMenu, copyText } =
  useContextMenu();
const menu = ref<HTMLElement | null>(null);
const position = reactive({ left: 0, top: 0 });
const notice = ref("");
let noticeTimer: ReturnType<typeof setTimeout>;
const icons: Record<ContextMenuIcon, any> = {
  open: FolderOpen,
  edit: FilePenLine,
  copy: Clipboard,
  refresh: RefreshCw,
  archive: Archive,
  trash: Trash2,
  block: ShieldX,
  status: Tags,
  external: ExternalLink,
  home: House,
};
watch(
  () => [
    contextMenuState.value.visible,
    contextMenuState.value.x,
    contextMenuState.value.y,
  ],
  async () => {
    if (!contextMenuState.value.visible) return;
    position.left = contextMenuState.value.x;
    position.top = contextMenuState.value.y;
    await nextTick();
    const element = menu.value;
    if (!element || !contextMenuState.value.visible) return;
    // The enter transition scales the menu. Measure its layout size, not the
    // animated bounding rectangle, so the final menu stays inside the viewport.
    position.left = Math.max(
      8,
      Math.min(contextMenuState.value.x, window.innerWidth - element.offsetWidth - 8),
    );
    position.top = Math.max(
      8,
      Math.min(contextMenuState.value.y, window.innerHeight - element.offsetHeight - 8),
    );
  },
);
async function run(item: ContextMenuItem) {
  if (item.disabled) return;
  if (item.confirm && !window.confirm(item.confirm)) return;
  closeContextMenu();
  await item.action();
}
function generic(event: MouseEvent) {
  if (event.defaultPrevented) return;
  const target = event.target as HTMLElement;
  if (target.closest('input,textarea,[contenteditable="true"]')) return;
  const link = target.closest("a") as HTMLAnchorElement | null;
  const selected = window.getSelection()?.toString().trim();
  if (link?.href) {
    openContextMenu(event, link.textContent?.trim() || "Ссылка", [
      {
        label: "Открыть",
        icon: "open",
        action: () => router.push(link.pathname + link.search),
      },
      {
        label: "Открыть в новой вкладке",
        icon: "external",
        action: () => window.open(link.href, "_blank"),
      },
      {
        label: "Копировать адрес",
        icon: "copy",
        separator: true,
        action: () => copyText(link.href, "Адрес скопирован"),
      },
    ]);
    return;
  }
  if (selected) {
    openContextMenu(event, "Выделенный текст", [
      {
        label: "Копировать",
        icon: "copy",
        action: () => copyText(selected, "Текст скопирован"),
      },
    ]);
    return;
  }
  openContextMenu(event, "Рабочее пространство", [
    {
      label: "Обновить данные страницы",
      icon: "refresh",
      action: () => window.location.reload(),
    },
    { label: "Вернуться назад", icon: "open", action: () => router.back() },
    {
      label: "Все рабочие пространства",
      icon: "home",
      separator: true,
      action: () => router.push("/workspace"),
    },
    {
      label: "Открыть магазин",
      icon: "external",
      action: () => window.open("/", "_blank"),
    },
  ]);
}
function closeOnEscape(event: KeyboardEvent) {
  if (event.key === "Escape") closeContextMenu();
}
function showNotice(event: Event) {
  clearTimeout(noticeTimer);
  notice.value = (event as CustomEvent).detail || "Готово";
  noticeTimer = setTimeout(() => (notice.value = ""), 1800);
}
onMounted(() => {
  document.addEventListener("contextmenu", generic);
  document.addEventListener("click", closeContextMenu);
  document.addEventListener("keydown", closeOnEscape);
  window.addEventListener("blur", closeContextMenu);
  window.addEventListener("workspace-notice", showNotice);
});
onBeforeUnmount(() => {
  document.removeEventListener("contextmenu", generic);
  document.removeEventListener("click", closeContextMenu);
  document.removeEventListener("keydown", closeOnEscape);
  window.removeEventListener("blur", closeContextMenu);
  window.removeEventListener("workspace-notice", showNotice);
});
</script>
<template>
  <Teleport to="body"
    ><Transition name="context"
      ><section data-v-ui-5fed95735d45
        v-if="contextMenuState.visible"
        ref="menu"
        class="workspace-context"
        :style="{ left: `${position.left}px`, top: `${position.top}px` }"
        role="menu"
        @click.stop
      >
        <header data-v-ui-5fed95735d45>
          <span data-v-ui-5fed95735d45
            ><strong data-v-ui-5fed95735d45>{{ contextMenuState.title }}</strong
            ><small data-v-ui-5fed95735d45 v-if="contextMenuState.subtitle">{{
              contextMenuState.subtitle
            }}</small></span
          ><button data-v-ui-5fed95735d45 aria-label="Закрыть" @click="closeContextMenu">
            <X data-v-ui-5fed95735d45 :size="14" />
          </button>
        </header>
        <button data-v-ui-5fed95735d45
          v-for="(item, index) in contextMenuState.items"
          :key="`${item.label}-${index}`"
          :class="{ danger: item.danger, separator: item.separator }"
          :disabled="item.disabled"
          role="menuitem"
          @click="run(item)"
        >
          <component data-v-ui-5fed95735d45 :is="icons[item.icon || 'open']" :size="15" /><span data-v-ui-5fed95735d45>{{
            item.label
          }}</span>
        </button>
      </section></Transition
    ><Transition name="context"
      ><div data-v-ui-5fed95735d45 v-if="notice" class="context-notice">{{ notice }}</div></Transition
    ></Teleport
  >
</template>
