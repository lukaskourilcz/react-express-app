import React, { lazy, Suspense } from 'react';

// react-syntax-highlighter's `prism` build bundles every language grammar (and
// every theme), which is ~640 KB raw. The `prism-light` build ships an empty
// registry that we populate with only the languages this app actually renders.
// Saves ~180 KB gzip off the lazy code-block chunk.
const SUPPORTED_LANGUAGES = ['javascript', 'typescript', 'jsx', 'tsx', 'css', 'markup', 'bash', 'json'] as const;

const Highlighter = lazy(async () => {
  const [
    PrismLightMod,
    styleMod,
    js, ts, jsx, tsx, css, markup, bash, json,
  ] = await Promise.all([
    import('react-syntax-highlighter/dist/esm/prism-light'),
    import('react-syntax-highlighter/dist/esm/styles/prism/one-dark'),
    import('react-syntax-highlighter/dist/esm/languages/prism/javascript'),
    import('react-syntax-highlighter/dist/esm/languages/prism/typescript'),
    import('react-syntax-highlighter/dist/esm/languages/prism/jsx'),
    import('react-syntax-highlighter/dist/esm/languages/prism/tsx'),
    import('react-syntax-highlighter/dist/esm/languages/prism/css'),
    import('react-syntax-highlighter/dist/esm/languages/prism/markup'),
    import('react-syntax-highlighter/dist/esm/languages/prism/bash'),
    import('react-syntax-highlighter/dist/esm/languages/prism/json'),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PrismLight = (PrismLightMod as any).default as React.ComponentType<any> & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerLanguage: (name: string, syntax: any) => void;
  };
  const grammars: Record<string, unknown> = {
    javascript: (js as { default: unknown }).default,
    typescript: (ts as { default: unknown }).default,
    jsx: (jsx as { default: unknown }).default,
    tsx: (tsx as { default: unknown }).default,
    css: (css as { default: unknown }).default,
    markup: (markup as { default: unknown }).default,
    bash: (bash as { default: unknown }).default,
    json: (json as { default: unknown }).default,
  };
  for (const lang of SUPPORTED_LANGUAGES) {
    PrismLight.registerLanguage(lang, grammars[lang]);
  }
  const oneDark = (styleMod as { default: unknown }).default;
  return {
    default: ({ language, code }: { language: string; code: string }) => (
      <PrismLight
        aria-label={`${language} code block`}
        language={language}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style={oneDark as any}
        customStyle={{
          margin: '1rem 0',
          borderRadius: 6,
          fontSize: '0.75rem',
          padding: '1rem',
          maxWidth: '100%',
          overflowX: 'auto',
        }}
        codeTagProps={{ style: { fontFamily: '"SF Mono", Consolas, Monaco, monospace' } }}
      >
        {code}
      </PrismLight>
    ),
  };
});

const PlainCode = ({ code, language }: { code: string; language: string }) => (
  <pre
    aria-label={`${language} code block`}
    style={{
      margin: '1rem 0',
      padding: '1rem',
      borderRadius: 6,
      fontSize: '0.75rem',
      background: '#1a1a1a',
      color: '#e0e0e0',
      overflowX: 'auto',
      fontFamily: '"SF Mono", Consolas, Monaco, monospace',
    }}
  >
    <code>{code}</code>
  </pre>
);

export function CodeBlock({ code, language }: { code: string; language: string }) {
  return (
    <Suspense fallback={<PlainCode code={code} language={language} />}>
      <Highlighter code={code} language={language} />
    </Suspense>
  );
}

// Inline code style — a soft chip that reads as code without the visual noise
// of raw backticks. Kept subtle so a stem stays legible even when it names
// several APIs.
const INLINE_CODE_STYLE: React.CSSProperties = {
  fontFamily: '"SF Mono", Consolas, Monaco, monospace',
  fontSize: '0.92em',
  padding: '0.1em 0.35em',
  borderRadius: 4,
  backgroundColor: 'rgba(127, 127, 127, 0.14)',
  border: '1px solid rgba(127, 127, 127, 0.18)',
};

/** Render a plain-text run with `single backticks` swapped for inline chips. */
function renderInline(text: string, keyBase: string) {
  const bits = text.split(/(`[^`]+`)/g);
  return bits.map((bit, i) => {
    if (bit.startsWith('`') && bit.endsWith('`') && bit.length >= 2) {
      return (
        <code key={`${keyBase}-${i}`} style={INLINE_CODE_STYLE}>
          {bit.slice(1, -1)}
        </code>
      );
    }
    return <span key={`${keyBase}-${i}`}>{bit}</span>;
  });
}

export function renderQuestion(text: string) {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, index) => {
    if (part.startsWith('```')) {
      const langMatch = part.match(/```(\w*)\n?/);
      const raw = langMatch?.[1] || 'javascript';
      // Normalize the language names that aren't direct Prism grammars.
      const language =
        raw === 'js' ? 'javascript'
          : raw === 'ts' ? 'typescript'
          : raw === 'html' ? 'markup'
          : raw === 'shell' || raw === 'sh' ? 'bash'
          : raw || 'javascript';
      const code = part.replace(/```\w*\n?/, '').replace(/```$/, '').trim();
      return <CodeBlock key={index} code={code} language={language} />;
    }
    return <span key={index}>{renderInline(part, String(index))}</span>;
  });
}
