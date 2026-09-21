import type { CodingTrack } from '../../../../shared/coding-catalog';

// Prettier, loaded on demand. The babel parser reads a TypeScript annotation
// as a syntax error, so TypeScript answers go through babel-ts. Every other
// track — JavaScript, system design, algorithms — is plain JavaScript, so the
// choice is made here once rather than at each call site.
export async function formatCode(code: string, track: CodingTrack): Promise<string> {
  const [prettier, babel, estree] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/babel'),
    import('prettier/plugins/estree'),
  ]);
  return prettier.format(code, {
    parser: track === 'typescript' || track === 'react' ? 'babel-ts' : 'babel',
    plugins: [babel, estree],
    singleQuote: true,
    semi: true,
  });
}
