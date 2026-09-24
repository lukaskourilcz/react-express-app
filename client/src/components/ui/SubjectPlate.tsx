/** Decorative, deterministic devShark mark: three modules wired together.
 * Never used as a factual diagram. */
export default function SubjectPlate() {
  const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 120 66" width={180} height={99} style={{ display: 'block', maxWidth: '100%', color: 'var(--brand-accent)', opacity: 0.78 }}>
      <path {...line} d="M15 18h30v18H15zM76 10h31v18H76zM76 41h31v17H76z"/><path {...line} d="M45 27h16c8 0 8-8 15-8M45 27h16c8 0 8 22 15 22" strokeWidth="2.2"/><circle cx="15" cy="27" r="3" fill="currentColor"/><circle cx="107" cy="19" r="3" fill="currentColor"/><circle cx="107" cy="49" r="3" fill="currentColor"/>
    </svg>
  );
}
