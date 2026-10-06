export const COLORS = {
  primary: '#4F46E5', // Indigo
  primaryLight: '#EEF2FF',
  primaryDark: '#3730A3',
  secondary: '#06B6D4', // Cyan
  background: '#F8FAFC', // Slate 50
  cardBg: '#FFFFFF',
  textDark: '#0F172A', // Slate 900
  textMuted: '#64748B', // Slate 500
  border: '#E2E8F0', // Slate 200
  borderLight: '#F1F5F9',

  // Status Colors
  statusTodo: '#F59E0B', // Amber
  statusTodoBg: '#FEF3C7',
  statusInProgress: '#3B82F6', // Blue
  statusInProgressBg: '#DBEAFE',
  statusDone: '#10B981', // Emerald
  statusDoneBg: '#D1FAE5',

  // Priority Colors
  priorityLow: '#10B981', // Emerald
  priorityLowBg: '#ECFDF5',
  priorityMedium: '#F59E0B', // Amber
  priorityMediumBg: '#FFFBEB',
  priorityHigh: '#EF4444', // Red
  priorityHighBg: '#FEF2F2',

  // Actions
  danger: '#EF4444',
  dangerBg: '#FEE2E2',
  warning: '#F59E0B',
  success: '#10B981',
};

export const TASK_STATUSES: { label: string; value: 'To Do' | 'In Progress' | 'Done' }[] = [
  { label: 'To Do', value: 'To Do' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Done', value: 'Done' },
];

export const TASK_PRIORITIES: { label: string; value: 'Low' | 'Medium' | 'High' }[] = [
  { label: 'Low', value: 'Low' },
  { label: 'Medium', value: 'Medium' },
  { label: 'High', value: 'High' },
];
