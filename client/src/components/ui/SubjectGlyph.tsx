import type { ReactNode } from 'react';
import type { SubjectId } from '../../lib/subjects';

const PATHS: Record<SubjectId, ReactNode> = {
  webdev: <><path d="m8 9-3 3 3 3" /><path d="m16 9 3 3-3 3" /><path d="m14 5-4 14" /></>,
  geography: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  math: <><path d="M5 7h14M5 17h14M8 4v6M16 14v6" /><circle cx="16" cy="7" r="1" fill="currentColor" stroke="none" /></>,
  history: <><path d="M4 20h16M6 17h12M7 8v9M12 8v9M17 8v9M5 8h14L12 3 5 8Z" /></>,
  biology: <><path d="M8 3c8 4 0 14 8 18M16 3C8 7 16 17 8 21M9 7h6M8 12h8M9 17h6" /></>,
  chess: <><path d="m8 20 1-4 7-1 2-5-6-6-1 4-4 3 3 3-2 6Z" /><path d="M6 20h12" /></>,
  poker: <><path d="M12 3c-2 3-6 5-6 9a4 4 0 0 0 6 3 4 4 0 0 0 6-3c0-4-4-6-6-9Z" /><path d="m10 15-1 6h6l-1-6" /></>,
};

export default function SubjectGlyph({ id, size = 22 }: { id: SubjectId; size?: number }) {
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {PATHS[id]}
    </svg>
  );
}
