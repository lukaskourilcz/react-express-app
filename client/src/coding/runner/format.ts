// Prettier, loaded on demand. The babel parser reads a TypeScript annotation
// as a syntax error, so TypeScript answers go through babel-ts.
export async function formatCode(code: string, track: 'javascript' | 'typescript' | 'react'): Promise<string> {
  const [prettier, babel, estree] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/babel'),
    import('prettier/plugins/estree'),
  ]);
  return prettier.format(code, {
    parser: track === 'typescript' ? 'babel-ts' : 'babel',
    plugins: [babel, estree],
    singleQuote: true,
    semi: true,
  });
}
