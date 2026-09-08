// Which sense of an abbreviation a piece of content means.
//
// Plenty of these words mean different things in different places, and the
// content's own topic is the only honest way to choose between them without
// guessing. A topic with no mapping gets no hint, and an ambiguous term then
// shows every sense rather than the wrong one.

import { isGlossaryDomain, type GlossaryDomain } from '../../../shared/glossary';

const BY_TOPIC: Record<string, GlossaryDomain> = {
  javascript: 'javascript',
  typescript: 'typescript',
  react: 'react',
  nextjs: 'react',
  nodejs: 'nodejs',
  html: 'web',
  css: 'web',
  general: 'web',
  databases: 'databases',
  security: 'security',
  devops: 'devops',
  ai: 'ai',
  dsa: 'dsa',
  algorithms: 'dsa',
  'system-design': 'general',
  git: 'general',
};

export const glossaryDomainFor = (topic: string | undefined): GlossaryDomain | undefined => {
  if (!topic) return undefined;
  const mapped = BY_TOPIC[topic];
  return mapped && isGlossaryDomain(mapped) ? mapped : undefined;
};
