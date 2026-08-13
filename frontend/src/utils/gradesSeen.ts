const KEY_PREFIX = 'manhaj.grades_seen';

export function getGradesLastSeenAt(userId: number): string | null {
  try {
    return localStorage.getItem(`${KEY_PREFIX}.${userId}`);
  } catch {
    return null;
  }
}

export function setGradesLastSeenAt(userId: number, iso: string): void {
  try {
    localStorage.setItem(`${KEY_PREFIX}.${userId}`, iso);
  } catch {
    // ignore quota / private mode
  }
}

/** Count grade items published after the student's last visit to the grades page. */
export function countUnseenGrades(
  sections: { items: { graded_at: string | null }[] }[],
  lastSeenAt: string | null,
): number {
  const items = sections.flatMap((s) => s.items);
  if (items.length === 0) return 0;

  if (!lastSeenAt) {
    return items.filter((i) => i.graded_at).length;
  }

  const seenMs = new Date(lastSeenAt).getTime();
  return items.filter((i) => i.graded_at && new Date(i.graded_at).getTime() > seenMs).length;
}

export function latestGradedAt(
  sections: { items: { graded_at: string | null }[] }[],
): string | null {
  let latest: string | null = null;
  for (const section of sections) {
    for (const item of section.items) {
      if (item.graded_at && (!latest || item.graded_at > latest)) {
        latest = item.graded_at;
      }
    }
  }
  return latest;
}
