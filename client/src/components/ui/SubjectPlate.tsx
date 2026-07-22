import type { SubjectId } from '../../lib/subjects';

/** Decorative, deterministic subject mark; never used as a factual diagram. */
export default function SubjectPlate({ id, compact = false }: { id: SubjectId; compact?: boolean }) {
  const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const artwork = (() => {
    switch (id) {
      case 'geography': return <><path {...line} d="M-8 20c22-18 42 14 66-2s39-5 58-17"/><path {...line} d="M-5 33c18-15 35 9 57-4s42-8 66-20"/><path {...line} d="M4 47c19-12 35 7 55-3s38-10 55-22"/><path {...line} d="M19 10v48M64 5v54M101 12v42" opacity=".34"/></>;
      case 'math': return <><path {...line} d="M10 52h100M17 59V8"/><path {...line} d="M18 45c18-2 20-25 36-25 18 0 22 24 49 25" strokeWidth="2.2"/><circle {...line} cx="54" cy="20" r="4"/><path {...line} d="M31 8v50M45 8v50M59 8v50M73 8v50M87 8v50M101 8v50M8 17h105M8 31h105M8 45h105" opacity=".24"/></>;
      case 'history': return <><path {...line} d="M8 15h104M8 28h104M8 42h104M8 55h104" opacity=".34"/><path {...line} d="M19 12v46M46 12v46M78 12v46M101 12v46"/><circle cx="19" cy="28" r="4" fill="currentColor"/><circle cx="46" cy="42" r="4" fill="currentColor"/><circle cx="78" cy="15" r="4" fill="currentColor"/></>;
      case 'biology': return <><circle {...line} cx="35" cy="31" r="20"/><circle {...line} cx="35" cy="31" r="7"/><circle {...line} cx="79" cy="24" r="13"/><circle {...line} cx="79" cy="24" r="4"/><circle {...line} cx="83" cy="49" r="9"/><path {...line} d="M12 54c17-13 32 10 48-2s31-4 48-14" opacity=".55"/></>;
      case 'chess': return <><path {...line} d="M13 9h96v48H13zM37 9v48M61 9v48M85 9v48M13 25h96M13 41h96" opacity=".36"/><path {...line} d="M25 49 48 32 72 48 96 18" strokeWidth="2.4"/><circle cx="25" cy="49" r="3.5" fill="currentColor"/><circle cx="48" cy="32" r="3.5" fill="currentColor"/><circle cx="72" cy="48" r="3.5" fill="currentColor"/><circle cx="96" cy="18" r="3.5" fill="currentColor"/></>;
      case 'poker': return <><ellipse {...line} cx="61" cy="33" rx="49" ry="23"/><ellipse {...line} cx="61" cy="33" rx="35" ry="15" opacity=".42"/><path {...line} d="M61 10v46M12 33h98" opacity=".35"/><path {...line} d="M61 33 92 19M61 33 31 48" strokeWidth="2.3"/><circle cx="61" cy="33" r="4" fill="currentColor"/></>;
      case 'webdev': return <><path {...line} d="M15 18h30v18H15zM76 10h31v18H76zM76 41h31v17H76z"/><path {...line} d="M45 27h16c8 0 8-8 15-8M45 27h16c8 0 8 22 15 22" strokeWidth="2.2"/><circle cx="15" cy="27" r="3" fill="currentColor"/><circle cx="107" cy="19" r="3" fill="currentColor"/><circle cx="107" cy="49" r="3" fill="currentColor"/></>;
    }
  })();
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 120 66" width={compact ? 92 : 180} height={compact ? 52 : 99} style={{ display: 'block', maxWidth: '100%', color: 'var(--brand-accent)', opacity: 0.78 }}>{artwork}</svg>;
}
