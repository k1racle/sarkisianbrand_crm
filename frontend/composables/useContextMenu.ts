export type ContextMenuIcon =
  | "open"
  | "edit"
  | "copy"
  | "refresh"
  | "archive"
  | "block"
  | "status"
  | "external"
  | "home";
export type ContextMenuItem = {
  label: string;
  icon?: ContextMenuIcon;
  action: () => void | Promise<void>;
  danger?: boolean;
  separator?: boolean;
  disabled?: boolean;
  confirm?: string;
};
type ContextMenuState = {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  subtitle?: string;
  items: ContextMenuItem[];
};

export function useContextMenu() {
  const state = useState<ContextMenuState>("workspace-context-menu", () => ({
    visible: false,
    x: 0,
    y: 0,
    title: "",
    items: [],
  }));
  function openContextMenu(
    event: MouseEvent,
    title: string,
    items: ContextMenuItem[],
    subtitle?: string,
  ) {
    event.preventDefault();
    state.value = {
      visible: true,
      x: event.clientX,
      y: event.clientY,
      title,
      subtitle,
      items: items.filter(Boolean),
    };
  }
  function closeContextMenu() {
    state.value = { ...state.value, visible: false };
  }
  async function copyText(value: string, message = "Скопировано") {
    await navigator.clipboard.writeText(value);
    window.dispatchEvent(
      new CustomEvent("workspace-notice", { detail: message }),
    );
  }
  return {
    contextMenuState: readonly(state),
    openContextMenu,
    closeContextMenu,
    copyText,
  };
}
