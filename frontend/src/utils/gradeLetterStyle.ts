export type LetterGradeTier = 'excellent' | 'good' | 'fair' | 'poor' | 'neutral';

export function letterGradeTier(letter: string): LetterGradeTier {
  const L = letter.toUpperCase().replace(/\s/g, '');
  if (L.startsWith('A')) return 'excellent';
  if (L.startsWith('B')) return 'good';
  if (L.startsWith('C')) return 'fair';
  if (L.startsWith('D') || L.startsWith('F')) return 'poor';
  return 'neutral';
}

export function letterGradeChipClass(letter: string): string {
  switch (letterGradeTier(letter)) {
    case 'excellent':
      return 'bg-sage/15 text-sage border-sage/35';
    case 'good':
      return 'bg-brass/12 text-brass border-brass/35';
    case 'fair':
      return 'bg-brick/10 text-brick/90 border-brick/25';
    case 'poor':
      return 'bg-brick/15 text-brick border-brick/40 font-semibold';
    case 'neutral':
      return 'bg-ink/5 text-ink/70 border-ink/15';
  }
}
