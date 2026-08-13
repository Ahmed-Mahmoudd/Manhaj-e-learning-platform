/** Shared row / badge styling for announcement lists (student + instructor). */
export function announcementRowClass(isUrgent: boolean, isUnread = false): string {
  if (isUrgent) {
    return isUnread
      ? 'bg-brick/10 border-s-4 border-s-brick'
      : 'bg-brick/5 border-s-4 border-s-brick/40';
  }
  if (isUnread) return 'bg-brass/5';
  return '';
}

export function announcementTypeBadgeClass(): string {
  return 'text-ink/45';
}

export function announcementUrgentBadgeClass(): string {
  return 'font-semibold text-brick';
}

export function announcementUnreadDotClass(isUrgent: boolean): string {
  return isUrgent ? 'bg-brick' : 'bg-brass';
}
