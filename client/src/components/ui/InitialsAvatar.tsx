// A person's avatar: their photo when there is one to show, otherwise their
// initials on one of eight ocean inks (--ss-avatar-1 … 8 in astryx-theme.css).
//
// The ink is picked from the name, so a friend keeps one colour on every
// visit and on every device, and two friends side by side usually differ.
// Initials come from the first two words of the name: "Ada Lovelace" is AL,
// the sharkname "thirsty-sharkie" is TS.
//
// With a photo it is Astryx's Avatar, which falls back to its own initials
// if the image fails to load. Pass `label` when the avatar is the only thing
// naming the person; leave it out when the name is written beside it, and
// the avatar is hidden from screen readers so the name is not read twice.

import { Avatar } from '@astryxdesign/core/Avatar';
import './InitialsAvatar.css';

type AvatarPixels = 24 | 32 | 36 | 40 | 48 | 64;

const TONES = 8;

/** Up to two initials, upper-case, from the first two words of `name`. */
export function initialsFor(name: string): string {
  const words = name.trim().split(/[\s\-_.]+/).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => Array.from(word)[0]?.toLocaleUpperCase() ?? '');
  return letters.join('') || '?';
}

/** 1–8, the same for the same name (FNV-1a over the lower-cased name). */
export function avatarTone(name: string): number {
  let hash = 0x811c9dc5;
  for (const char of name.trim().toLowerCase()) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash % TONES) + 1;
}

export function InitialsAvatar({
  name,
  src,
  size = 36,
  label,
}: {
  name: string;
  src?: string | null;
  size?: AvatarPixels;
  label?: string;
}) {
  if (src) {
    return label
      ? <Avatar src={src} name={name} alt={label} size={size} />
      : <span aria-hidden="true" className="ss-initials-avatar__photo"><Avatar src={src} name={name} alt="" size={size} /></span>;
  }
  return (
    <span
      className="ss-initials-avatar"
      data-tone={avatarTone(name)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <span aria-hidden="true">{initialsFor(name)}</span>
    </span>
  );
}

export default InitialsAvatar;
