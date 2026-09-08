// Single source of truth for status colors, shared by the Badge component,
// dashboard pie charts, and category progress bars so a status always reads
// the same color everywhere in the app.
export const STATUS_HEX: Record<string, string> = {
  DRAFT: '#94a3b8',
  SENT: '#3b82f6',
  PARTIAL: '#f59e0b',
  PAID: '#22c55e',
  OVERDUE: '#ef4444',
  APPROVED: '#22c55e',
  REJECTED: '#ef4444',
  FULFILLED: '#22c55e',
  CONVERTED: '#a855f7',
  VOID: '#cbd5e1',
  ACTIVE: '#3b82f6',
  COMPLETED: '#22c55e',
  PENDING: '#f59e0b',
  RECEIVED: '#3b82f6',
  QUOTED: '#a855f7',
  CLOSED: '#22c55e',
  NEW: '#f59e0b',
};

export function statusColor(status: string): string {
  return STATUS_HEX[status] ?? '#94a3b8';
}

function titleCase(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export { titleCase };
