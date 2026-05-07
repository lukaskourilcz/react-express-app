import React, { lazy, Suspense } from 'react';

const Highlighter = lazy(async () => {
  // Import the prism-only build to avoid pulling highlight.js into the bundle.
  const [PrismMod, styleMod] = await Promise.all([
    import('react-syntax-highlighter/dist/esm/prism'),
    import('react-syntax-highlighter/dist/esm/styles/prism/one-dark'),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Prism = (PrismMod as any).default as React.ComponentType<any>;
  const oneDark = (styleMod as { default: unknown }).default;
  return {
    default: ({ language, code }: { language: string; code: string }) => (
      <Prism
        language={language}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style={oneDark as any}
        customStyle={{
          margin: '1rem 0',
          borderRadius: 6,
          fontSize: '0.75rem',
          padding: '1rem',
        }}
        codeTagProps={{ style: { fontFamily: '"SF Mono", Consolas, Monaco, monospace' } }}
      >
        {code}
      </Prism>
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

export function renderQuestion(text: string) {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, index) => {
    if (part.startsWith('```')) {
      const langMatch = part.match(/```(\w*)\n?/);
      const raw = langMatch?.[1] || 'javascript';
      const language = raw === 'js' ? 'javascript' : raw === 'ts' ? 'typescript' : raw || 'javascript';
      const code = part.replace(/```\w*\n?/, '').replace(/```$/, '').trim();
      return <CodeBlock key={index} code={code} language={language} />;
    }
    return <span key={index}>{part}</span>;
  });
}
