// The code editor: CodeMirror 6 through @uiw/react-codemirror, themed from
// the Deep End tokens so it sits on the same ink as the rest of the page in
// both colour schemes. Keyboard users leave the editor with Escape then Tab.
import { useMemo } from 'react';
import CodeMirror, { EditorView, keymap, type Extension } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { indentWithTab } from '@codemirror/commands';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import type { CodingTrack } from '../../../shared/coding-catalog';

// One highlight style for both schemes: the colours are custom properties, so
// Coding.css decides the actual values per scheme.
const highlight = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--cd-syntax-keyword)' },
  { tag: [tags.name, tags.deleted, tags.character, tags.propertyName, tags.macroName], color: 'var(--cd-syntax-name)' },
  { tag: [tags.function(tags.variableName), tags.labelName], color: 'var(--cd-syntax-function)' },
  { tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)], color: 'var(--cd-syntax-constant)' },
  { tag: [tags.definition(tags.name), tags.separator], color: 'var(--cd-syntax-name)' },
  { tag: [tags.typeName, tags.className, tags.number, tags.changed, tags.annotation, tags.modifier, tags.self, tags.namespace], color: 'var(--cd-syntax-type)' },
  { tag: [tags.operator, tags.operatorKeyword, tags.url, tags.escape, tags.regexp, tags.link, tags.special(tags.string)], color: 'var(--cd-syntax-operator)' },
  { tag: [tags.meta, tags.comment], color: 'var(--cd-syntax-comment)', fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.heading, fontWeight: 'bold' },
  { tag: [tags.atom, tags.bool, tags.special(tags.variableName)], color: 'var(--cd-syntax-constant)' },
  { tag: [tags.processingInstruction, tags.string, tags.inserted], color: 'var(--cd-syntax-string)' },
  { tag: tags.invalid, color: 'var(--ss-error)' },
]);

const theme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--cd-editor-bg)',
    color: 'var(--cd-editor-fg)',
    fontSize: '14px',
    borderRadius: 'var(--radius-element)',
  },
  '.cm-content': {
    caretColor: 'var(--cd-editor-fg)',
    fontFamily: 'var(--cd-mono)',
    padding: '12px 0',
  },
  '.cm-scroller': { fontFamily: 'var(--cd-mono)', lineHeight: '1.55' },
  '&.cm-focused': { outline: 'none' },
  '.cm-gutters': {
    backgroundColor: 'var(--cd-editor-gutter)',
    color: 'var(--cd-editor-gutter-fg)',
    border: 'none',
    fontFamily: 'var(--cd-mono)',
  },
  '.cm-activeLineGutter': { backgroundColor: 'var(--cd-editor-line)' },
  '.cm-activeLine': { backgroundColor: 'var(--cd-editor-line)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: 'var(--cd-editor-selection) !important' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--cd-editor-fg)' },
  '.cm-matchingBracket, .cm-nonmatchingBracket': { backgroundColor: 'var(--cd-editor-bracket)', outline: 'none' },
  '.cm-tooltip': { backgroundColor: 'var(--color-background-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' },
});

export interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  track: CodingTrack;
  ariaLabel: string;
  readOnly?: boolean;
  minHeight?: number;
}

export function Editor({ value, onChange, track, ariaLabel, readOnly, minHeight = 240 }: EditorProps) {
  const extensions = useMemo<Extension[]>(() => [
    javascript({ jsx: track === 'react', typescript: track === 'typescript' }),
    syntaxHighlighting(highlight),
    theme,
    keymap.of([indentWithTab]),
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({ 'aria-label': ariaLabel, 'aria-multiline': 'true', role: 'textbox' }),
  ], [track, ariaLabel]);

  return (
    <div className="cd-editor" style={{ minHeight }}>
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        readOnly={readOnly}
        editable={!readOnly}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: false,
          indentOnInput: true,
          tabSize: 2,
          searchKeymap: false,
        }}
        theme="none"
        indentWithTab={false}
        height="auto"
        minHeight={`${minHeight}px`}
      />
    </div>
  );
}
