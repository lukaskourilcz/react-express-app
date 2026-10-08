// Audit C3-3: Ctrl/Cmd+Enter runs the code, and CodeMirror's basic setup also
// bound it to "insert blank line", so every Run added a line to the code. The
// real editor gets the keys here; the workbench above it still hears them.
import { expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Editor } from '../src/coding/Editor';

for (const shift of [false, true]) {
  it(`Ctrl${shift ? '+Shift' : ''}+Enter leaves the code alone and reaches the page`, () => {
    const onChange = vi.fn();
    const heard = vi.fn();
    const { container } = render(
      <div onKeyDown={(event) => { if (event.ctrlKey && event.key === 'Enter') heard(event.shiftKey); }}>
        <Editor value={'const one = () => 1;\n'} onChange={onChange} track="javascript" ariaLabel="Code" />
      </div>,
    );
    const content = container.querySelector<HTMLElement>('.cm-content')!;
    content.focus();
    content.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, ctrlKey: true, shiftKey: shift, bubbles: true, cancelable: true }));
    expect(onChange).not.toHaveBeenCalled();
    expect(container.querySelectorAll('.cm-line')).toHaveLength(2);
    expect(heard).toHaveBeenCalledWith(shift);
  });
}
