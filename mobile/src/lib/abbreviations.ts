// Static reference data for the Abbreviations glossary.
//
// A hand-curated list of abbreviations, acronyms, and short commands that come
// up constantly in web development — CLI tools, protocols, and jargon. Grouped
// by topic so the glossary page can render readable sections.

export interface Abbreviation {
  /** The short form as you'd type or read it. */
  term: string;
  /** What it stands for / expands to. */
  full: string;
  /** One-line plain-language description. */
  description: string;
}

export interface AbbreviationGroup {
  /** Stable id used for keys and anchors. */
  id: string;
  /** Human-readable section heading. */
  label: string;
  items: Abbreviation[];
}

export const ABBREVIATION_GROUPS: AbbreviationGroup[] = [
  {
    id: 'cli',
    label: 'CLI commands & tools',
    items: [
      { term: 'npx', full: 'Node Package eXecute', description: 'Runs a Node package binary without installing it globally.' },
      { term: 'npm', full: 'Node Package Manager', description: "The default package manager bundled with Node.js." },
      { term: 'pnpm', full: 'Performant npm', description: 'Fast, disk-efficient package manager that hard-links a shared store.' },
      { term: 'cat', full: 'concatenate', description: 'Prints file contents to stdout (and can join multiple files).' },
      { term: 'grep', full: 'Global Regular Expression Print', description: 'Searches text for lines matching a pattern or regex.' },
      { term: 'sed', full: 'Stream EDitor', description: 'Transforms text from a stream line by line (find/replace, delete, etc.).' },
      { term: 'awk', full: 'Aho, Weinberger & Kernighan', description: 'Pattern-scanning language for processing columns of text.' },
      { term: 'ls', full: 'list', description: 'Lists the files and directories in a folder.' },
      { term: 'cd', full: 'change directory', description: 'Moves the shell into a different working directory.' },
      { term: 'pwd', full: 'print working directory', description: 'Shows the absolute path of the current directory.' },
      { term: 'rm', full: 'remove', description: 'Deletes files or directories.' },
      { term: 'mv', full: 'move', description: 'Moves or renames files and directories.' },
      { term: 'cp', full: 'copy', description: 'Copies files or directories.' },
      { term: 'mkdir', full: 'make directory', description: 'Creates one or more new directories.' },
      { term: 'chmod', full: 'change mode', description: 'Changes the permission bits of a file or directory.' },
      { term: 'chown', full: 'change owner', description: 'Changes the user/group that owns a file.' },
      { term: 'ssh', full: 'Secure Shell', description: 'Encrypted protocol for logging into and running commands on remote machines.' },
      { term: 'scp', full: 'Secure Copy', description: 'Copies files between machines over an SSH connection.' },
      { term: 'curl', full: 'Client URL', description: 'Transfers data to or from a URL straight from the terminal.' },
      { term: 'wget', full: 'Web Get', description: 'Non-interactive downloader for files over HTTP/FTP.' },
      { term: 'ps', full: 'process status', description: 'Lists the processes currently running.' },
      { term: 'df', full: 'disk free', description: 'Reports free and used space on mounted filesystems.' },
      { term: 'du', full: 'disk usage', description: 'Estimates the disk space used by files and folders.' },
      { term: 'tar', full: 'tape archive', description: 'Bundles many files into a single archive (often with gzip).' },
      { term: 'diff', full: 'difference', description: 'Shows the line-by-line differences between two files.' },
      { term: 'psql', full: 'PostgreSQL terminal', description: "PostgreSQL's interactive command-line client." },
    ],
  },
  {
    id: 'git',
    label: 'Git & common aliases',
    items: [
      { term: 'gcl', full: 'git clone', description: 'Popular shell alias (e.g. oh-my-zsh) for cloning a repository.' },
      { term: 'gst', full: 'git status', description: 'Common alias for showing the working-tree status.' },
      { term: 'gco', full: 'git checkout', description: 'Common alias for switching branches or restoring files.' },
      { term: 'gcm', full: 'git commit -m', description: 'Common alias for committing with an inline message.' },
      { term: 'gp', full: 'git push', description: 'Common alias for pushing commits to a remote.' },
      { term: 'gpl', full: 'git pull', description: 'Common alias for fetching and merging from a remote.' },
      { term: 'VCS', full: 'Version Control System', description: 'Software (like Git) that tracks changes to source over time.' },
      { term: 'PR', full: 'Pull Request', description: 'A proposal to merge one branch into another, with review.' },
      { term: 'MR', full: 'Merge Request', description: "GitLab's name for a pull request." },
      { term: 'WIP', full: 'Work In Progress', description: 'Marks a branch/PR that is not yet ready to merge.' },
      { term: 'LGTM', full: 'Looks Good To Me', description: 'Reviewer shorthand approving a change.' },
      { term: 'SHA', full: 'Secure Hash Algorithm', description: 'The hash that uniquely identifies a Git commit.' },
    ],
  },
  {
    id: 'web',
    label: 'Web & networking',
    items: [
      { term: 'HTTP', full: 'HyperText Transfer Protocol', description: 'The request/response protocol of the web.' },
      { term: 'HTTPS', full: 'HTTP Secure', description: 'HTTP encrypted with TLS.' },
      { term: 'URL', full: 'Uniform Resource Locator', description: 'The address of a resource on the web.' },
      { term: 'URI', full: 'Uniform Resource Identifier', description: 'A name or address identifying a resource (URLs are a subset).' },
      { term: 'DNS', full: 'Domain Name System', description: 'Translates domain names into IP addresses.' },
      { term: 'CDN', full: 'Content Delivery Network', description: 'Geographically distributed servers that cache and serve assets.' },
      { term: 'TCP', full: 'Transmission Control Protocol', description: 'Reliable, ordered transport protocol underlying most traffic.' },
      { term: 'IP', full: 'Internet Protocol', description: 'Addressing and routing protocol for packets across networks.' },
      { term: 'TLS', full: 'Transport Layer Security', description: 'Encryption that secures data in transit (successor to SSL).' },
      { term: 'SSL', full: 'Secure Sockets Layer', description: 'Legacy name for transport encryption, now superseded by TLS.' },
      { term: 'CORS', full: 'Cross-Origin Resource Sharing', description: 'Browser rules that let a page call APIs on other origins.' },
      { term: 'CSP', full: 'Content Security Policy', description: 'Header that restricts which resources a page may load.' },
      { term: 'XSS', full: 'Cross-Site Scripting', description: 'Attack that injects malicious scripts into a page.' },
      { term: 'CSRF', full: 'Cross-Site Request Forgery', description: "Attack that tricks a browser into sending unwanted authenticated requests." },
    ],
  },
  {
    id: 'data',
    label: 'Data & APIs',
    items: [
      { term: 'API', full: 'Application Programming Interface', description: 'A contract that lets programs talk to each other.' },
      { term: 'REST', full: 'REpresentational State Transfer', description: 'An architectural style for HTTP APIs around resources.' },
      { term: 'CRUD', full: 'Create, Read, Update, Delete', description: 'The four basic operations on stored data.' },
      { term: 'JSON', full: 'JavaScript Object Notation', description: 'Lightweight, human-readable data interchange format.' },
      { term: 'XML', full: 'eXtensible Markup Language', description: 'Verbose, tag-based data format.' },
      { term: 'YAML', full: "YAML Ain't Markup Language", description: 'Indentation-based config/data format.' },
      { term: 'SQL', full: 'Structured Query Language', description: 'Language for querying and mutating relational databases.' },
      { term: 'ORM', full: 'Object-Relational Mapping', description: 'Maps database rows to objects in code.' },
      { term: 'RLS', full: 'Row-Level Security', description: 'Database policies that restrict which rows a user can access.' },
      { term: 'JWT', full: 'JSON Web Token', description: 'Compact, signed token used to carry claims like identity.' },
      { term: 'JWKS', full: 'JSON Web Key Set', description: 'The set of public keys used to verify JWT signatures.' },
      { term: 'HMAC', full: 'Hash-based Message Authentication Code', description: 'A keyed hash that proves a message has not been tampered with.' },
      { term: 'OAuth', full: 'Open Authorization', description: 'Standard for delegated access without sharing passwords.' },
      { term: 'UUID', full: 'Universally Unique Identifier', description: '128-bit identifier that is practically guaranteed unique.' },
      { term: 'TTL', full: 'Time To Live', description: 'How long a cached value or record stays valid.' },
    ],
  },
  {
    id: 'frontend',
    label: 'Frontend & rendering',
    items: [
      { term: 'HTML', full: 'HyperText Markup Language', description: 'The markup language that structures web pages.' },
      { term: 'CSS', full: 'Cascading Style Sheets', description: 'Language for styling and laying out web pages.' },
      { term: 'DOM', full: 'Document Object Model', description: 'The in-memory tree representing a page that JS manipulates.' },
      { term: 'SPA', full: 'Single Page Application', description: 'App that rewrites the page in place instead of full reloads.' },
      { term: 'SSR', full: 'Server-Side Rendering', description: 'Rendering HTML on the server before sending it to the browser.' },
      { term: 'CSR', full: 'Client-Side Rendering', description: 'Rendering the UI in the browser with JavaScript.' },
      { term: 'SSG', full: 'Static Site Generation', description: 'Pre-rendering pages to static HTML at build time.' },
      { term: 'PWA', full: 'Progressive Web App', description: 'A web app that can be installed and work offline.' },
      { term: 'HMR', full: 'Hot Module Replacement', description: 'Swaps changed modules in a running app without a full reload.' },
      { term: 'LCP', full: 'Largest Contentful Paint', description: 'A Core Web Vital measuring when the main content renders.' },
    ],
  },
  {
    id: 'jargon',
    label: 'General dev jargon',
    items: [
      { term: 'CLI', full: 'Command-Line Interface', description: 'A text-based way to interact with a program.' },
      { term: 'GUI', full: 'Graphical User Interface', description: 'A visual, point-and-click interface.' },
      { term: 'IDE', full: 'Integrated Development Environment', description: 'An editor bundled with build, debug, and tooling features.' },
      { term: 'SDK', full: 'Software Development Kit', description: 'A toolkit of libraries and tools for building on a platform.' },
      { term: 'CI', full: 'Continuous Integration', description: 'Automatically building and testing every code change.' },
      { term: 'CD', full: 'Continuous Delivery / Deployment', description: 'Automatically releasing validated changes to users.' },
      { term: 'AOT', full: 'Ahead-Of-Time', description: 'Compiling code to its target form before runtime.' },
      { term: 'JIT', full: 'Just-In-Time', description: 'Compiling code at runtime, as it executes.' },
      { term: 'GC', full: 'Garbage Collection', description: 'Automatic reclaiming of memory no longer in use.' },
      { term: 'a11y', full: 'accessibility', description: '"a" + 11 letters + "y" — building usable-by-everyone software.' },
      { term: 'i18n', full: 'internationalization', description: '"i" + 18 letters + "n" — designing software for many languages/regions.' },
      { term: 'l10n', full: 'localization', description: '"l" + 10 letters + "n" — adapting software to a specific locale.' },
      { term: 'regex', full: 'regular expression', description: 'A pattern language for matching text.' },
      { term: 'env', full: 'environment', description: 'Runtime configuration, usually via environment variables.' },
      { term: 'repo', full: 'repository', description: 'A project tracked by a version control system.' },
      { term: 'auth', full: 'authentication / authorization', description: 'Verifying who you are, and what you may do.' },
      { term: 'async', full: 'asynchronous', description: 'Work that runs without blocking, resolving later.' },
      { term: 'TS', full: 'TypeScript', description: 'JavaScript with a static type system.' },
      { term: 'JS', full: 'JavaScript', description: 'The programming language of the web.' },
    ],
  },
];

/** Flattened count, useful for headings/tests. */
export const ABBREVIATION_COUNT = ABBREVIATION_GROUPS.reduce(
  (sum, g) => sum + g.items.length,
  0,
);
