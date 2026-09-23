import { UserRole } from '@prisma/client';

// These describe existing profiles; labels do not silently change their grants.
export const workspaceRoleCatalog = [
  { id: UserRole.ADMIN, label: 'Администратор CRM', shortLabel: 'Администратор', description: 'Настройки системы, сотрудники и доступ. Также управляет сайтом.' },
  { id: UserRole.EXECUTIVE, label: 'Высшее руководство', shortLabel: 'Руководство', description: 'Обзор компании и управленческие отчёты. Изменения и финансовые операции требуют отдельных разрешений.' },
  { id: UserRole.SUPERVISOR, label: 'Руководитель направления', shortLabel: 'Рук. направления', description: 'Действующий широкий операционный профиль. Видимость пока НЕ ограничена своим отделом.' },
  { id: UserRole.MANAGER_SALES, label: 'Специалист интернет-магазина', shortLabel: 'Интернет-магазин', description: 'Покупатели, заказы сайта и розничные продажи.' },
  { id: UserRole.MANAGER_B2B, label: 'Специалист оптовых продаж', shortLabel: 'Оптовые продажи', description: 'Компании, партнёры B2B, оптовые заказы и сделки.' },
  { id: UserRole.MARKETPLACE_MANAGER, label: 'Специалист маркетплейсов', shortLabel: 'Маркетплейсы', description: 'Заказы площадок и настройки подключений в пределах выданных разрешений.' },
  { id: UserRole.CONTENT_MANAGER, label: 'Редактор сайта', shortLabel: 'Редактор сайта', description: 'Каталог и страницы сайта. Действующий профиль также содержит права контент-плана; отдельный профиль SMM ещё не выделен.' },
  { id: UserRole.IT_SUPPORT, label: 'Специалист поддержки', shortLabel: 'Поддержка', description: 'Обращения и диагностика подключений. Отдельные очереди пока не задают область видимости.' },
  { id: UserRole.WAREHOUSE, label: 'Оператор склада и отгрузок', shortLabel: 'Склад', description: 'Сборка, отгрузки и операционная обработка заказов.' },
  { id: UserRole.CURATOR, label: 'Куратор — действующий профиль', shortLabel: 'Куратор', description: 'Сохранён для действующих назначений. Не использовать как универсального менеджера; проверяйте фактические разрешения.' },
] as const;

export const internalWorkspaceRoles: UserRole[] = workspaceRoleCatalog.map(role => role.id);

export function workspaceRoleDetails(role: UserRole) {
  return workspaceRoleCatalog.find(item => item.id === role);
}
