<script setup lang="ts">
import { PackageCheck, Store, ReceiptText, LifeBuoy, MonitorCog, Contact, Workflow, ShieldCheck, UserCog, PlugZap, Bot, CalendarRange, History, Terminal, Trash2, FolderOpen, Clapperboard } from '@lucide/vue';
import { Award, BadgeCheck, BadgeDollarSign, BarChart3, BookOpen, Boxes, Building2, Cable, CalendarDays, ChartNoAxesCombined, ChartPie, ClipboardList, Coins, ContactRound, Gift, Handshake, Headphones, Headset, Images, Inbox, Kanban, LayoutDashboard, ListOrdered, ListTodo, Mail, Megaphone, Network, NotebookPen, Palette, Settings, Settings2, ShoppingBag, SlidersHorizontal, Target, TrendingUp, UserRound, UserRoundPlus, Users, UsersRound, Video, Wallet } from '@lucide/vue';
withDefaults(defineProps<{ name?: string; size?: number }>(), { name: 'LayoutDashboard', size: 20 });
const icons = { PackageCheck, Store, ReceiptText, LifeBuoy, MonitorCog, Contact, Workflow, ShieldCheck, UserCog, PlugZap, Bot, CalendarRange, History, Terminal, Trash2, Clapperboard, FolderOpen, Award, BadgeCheck, BadgeDollarSign, BarChart3, BookOpen, Boxes, Building2, Cable, CalendarDays, ChartNoAxesCombined, ChartPie, ClipboardList, Coins, ContactRound, Gift, Handshake, Headphones, Headset, Images, Inbox, Kanban, LayoutDashboard, ListOrdered, ListTodo, Mail, Megaphone, Network, NotebookPen, Palette, Settings, Settings2, ShoppingBag, SlidersHorizontal, Target, TrendingUp, UserRound, UserRoundPlus, Users, UsersRound, Video, Wallet };
</script>

<template>
  <component :is="icons[name as keyof typeof icons] || LayoutDashboard" :data-icon="icons[name as keyof typeof icons] ? name : 'LayoutDashboard'" :size="size" aria-hidden="true" />
</template>
