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
    const box = menu.value?.getBoundingClientRect();
    if (!box) return;
    position.left = Math.max(
      8,
      Math.min(contextMenuState.value.x, window.innerWidth - box.width - 8),
    );
    position.top = Math.max(
      8,
      Math.min(contextMenuState.value.y, window.innerHeight - box.height - 8),
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
      ><section
        v-if="contextMenuState.visible"
        ref="menu"
        class="workspace-context"
        :style="{ left: `${position.left}px`, top: `${position.top}px` }"
        role="menu"
        @click.stop
      >
        <header>
          <span
            ><strong>{{ contextMenuState.title }}</strong
            ><small v-if="contextMenuState.subtitle">{{
              contextMenuState.subtitle
            }}</small></span
          ><button aria-label="Закрыть" @click="closeContextMenu">
            <X :size="14" />
          </button>
        </header>
        <button
          v-for="(item, index) in contextMenuState.items"
          :key="`${item.label}-${index}`"
          :class="{ danger: item.danger, separator: item.separator }"
          :disabled="item.disabled"
          role="menuitem"
          @click="run(item)"
        >
          <component :is="icons[item.icon || 'open']" :size="15" /><span>{{
            item.label
          }}</span>
        </button>
      </section></Transition
    ><Transition name="context"
      ><div v-if="notice" class="context-notice">{{ notice }}</div></Transition
    ></Teleport
  >
</template>
<style scoped>
.workspace-context {
  position: fixed;
  z-index: 2000;
  width: 238px;
  padding: 7px;
  background: #fff;
  border: 1px solid #dfe1e5;
  box-shadow: 0 18px 48px #1113;
  color: #232428;
  font-family: var(--sb-font);
  box-sizing: border-box;
}
.workspace-context header {
  min-height: 43px;
  padding: 5px 7px 9px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.workspace-context header span {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.workspace-context header strong {
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.workspace-context header small {
  font-size: 8px;
  color: var(--sb-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.workspace-context header button {
  border: 0;
  background: none;
  color: #999;
  padding: 0;
}
.workspace-context > button {
  width: 100%;
  height: 36px;
  padding: 0 9px;
  border: 0;
  background: #fff;
  display: flex;
  gap: 10px;
  align-items: center;
  color: #42444a;
  font-size: 10px;
  text-align: left;
}
.workspace-context > button:hover {
  background: #f3f4f6;
  color: #17181b;
}
.workspace-context > button svg {
  color: #8b8e95;
}
.workspace-context > button.danger {
  color: #b84f41;
}
.workspace-context > button.danger svg {
  color: #c35d4e;
}
.workspace-context > button.separator {
  border-top: 1px solid #eceef0;
  margin-top: 5px;
  padding-top: 5px;
  height: 41px;
}
.workspace-context > button:disabled {
  opacity: 0.4;
}
.context-enter-active,
.context-leave-active {
  transition:
    opacity 0.1s,
    transform 0.1s;
}
.context-enter-from,
.context-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
.context-notice {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 2001;
  background: #1d1e22;
  color: #fff;
  padding: 12px 16px;
  font: 10px var(--sb-font);
  box-shadow: 0 10px 30px #0002;
}
</style>
