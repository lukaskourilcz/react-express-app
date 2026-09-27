// A control that is locked for a reason but stays focusable and pressable, so
// the press can explain the lock (the upgrade sheet). Astryx Button writes its
// own aria-disabled after the caller's props and leaves it off unless a
// tooltip disables the button, which would also swallow the press. This sets
// it on the element instead: the lock is announced and the press still lands.
import { useCallback } from 'react';
import { Button, type ButtonProps } from '@astryxdesign/core/Button';

export function LockedButton({ className, ...props }: Omit<ButtonProps, 'ref' | 'isDisabled'>) {
  const lock = useCallback((node: HTMLButtonElement | null) => { node?.setAttribute('aria-disabled', 'true'); }, []);
  return <Button {...props} className={className ? `ss-locked ${className}` : 'ss-locked'} ref={lock} />;
}
