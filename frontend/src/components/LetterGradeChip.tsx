import { letterGradeChipClass } from '@/utils/gradeLetterStyle';

interface LetterGradeChipProps {
  letter: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASS = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-0.5 text-sm',
  lg: 'px-2.5 py-1 text-2xl',
};

export function LetterGradeChip({ letter, size = 'md' }: LetterGradeChipProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded border font-mono font-medium ${letterGradeChipClass(letter)} ${SIZE_CLASS[size]}`}
    >
      {letter}
    </span>
  );
}
