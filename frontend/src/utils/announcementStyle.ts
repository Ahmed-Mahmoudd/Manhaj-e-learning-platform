/** Shared row / badge styling for announcement lists (student + instructor). */
export function announcementRowClass(type: string, isUnread = false): string {
  if (type === 'urgent') {
    return isUnread
      ? 'bg-brick/10 border-s-4 border-s-brick'
      : 'bg-brick/5 border-s-4 border-s-brick/40';
  }
  if (isUnread) return 'bg-brass/5';
  return '';
}

export function announcementTypeBadgeClass(type: string): string {
  if (type === 'urgent') return 'font-semibold text-brick';
  return 'text-ink/45';
}

export function announcementUnreadDotClass(type: string): string {
  if (type === 'urgent') return 'bg-brick';
  return 'bg-brass';
}
