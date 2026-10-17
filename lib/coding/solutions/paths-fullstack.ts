/** Server-only solutions for the FullStack section's short path, the link
 * shortener. Level 1 is JavaScript, levels 2 and 3 TypeScript, levels 4 and 5
 * TSX: every level is the whole file, and each React level keeps the typed API
 * above the component, which is how the suite imports both from './App'.
 *
 * reference: explicit checks and a comment where the reason is not obvious.
 * junior: one check per `if`, arrays and index loops, one useState per value.
 * senior: a Map-backed store, a small router, a custom hook for the list. */

import type { CodingSolution } from '../types';
import { LINKS_SEED } from '../tasks/paths-fullstack';
import { wholeLevels, type Boards } from './path-boards';

const lines = (...parts: (string | false)[]): string => parts.filter((part): part is string => part !== false).join('\n');

const TYPES = `type Draft = { url: string; slug: string };
type Link = Draft & { visits: number };
type RequestData = { method: string; path: string; body?: unknown };
type Reply = { status: number; body: unknown };`;

const SEED = `const SEED: Link[] = ${JSON.stringify(LINKS_SEED, null, 2).replace(/"(\w+)":/g, '$1:')};`;

/* ── reference ─────────────────────────────────────────────────────────── */

const referenceNormalizeJs = `function normalizeLink(value) {
  // null and arrays are objects too, so rule them out by name.
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  if (typeof value.url !== "string" || typeof value.slug !== "string") return null;
  const url = value.url.trim();
  const slug = value.slug.trim().toLowerCase();
  const urlOk = url.startsWith("https://") && url.length > "https://".length && url.length <= 200;
  const slugOk = /^[a-z0-9-]{3,20}$/.test(slug);
  // A new object: the caller's input is never changed.
  return urlOk && slugOk ? { url, slug } : null;
}`;

const referenceNormalizeTs = `function normalizeLink(value: unknown): Draft | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  // Proved to be an object; the cast lets us read fields not proved yet.
  const input = value as Record<string, unknown>;
  if (typeof input.url !== "string" || typeof input.slug !== "string") return null;
  const url = input.url.trim();
  const slug = input.slug.trim().toLowerCase();
  const urlOk = url.startsWith("https://") && url.length > "https://".length && url.length <= 200;
  return urlOk && /^[a-z0-9-]{3,20}$/.test(slug) ? { url, slug } : null;
}`;

const referenceApi = (level: number) => lines(
  `function createApi(seed: readonly Link[]): (request: RequestData) => Reply {`,
  `  // The API owns a copy: later changes to seed do not reach it.`,
  `  const links = new Map<string, Link>(seed.map((link) => [link.slug, { ...link }]));`,
  `  const reply = (status: number, body: unknown): Reply => ({ status, body });`,
  `  const notFound = () => reply(404, { error: "not_found" });`,
  ``,
  `  return ({ method, path, body }) => {`,
  level >= 3 && `    // "/api/links/mdn/visit" splits into ["", "api", "links", "mdn", "visit"].`,
  level >= 3 && `    const parts = path.split("/");`,
  level >= 3 && `    if (parts[0] !== "" || parts[1] !== "api" || parts[2] !== "links" || parts.length > 5) return notFound();`,
  ``,
  `    if (${level >= 3 ? 'parts.length === 3' : 'path === "/api/links"'}) {`,
  `      // Copies go out, so a caller cannot change what is stored.`,
  `      if (method === "GET") return reply(200, [...links.values()].map((link) => ({ ...link })));`,
  `      if (method === "POST") {`,
  `        const draft = normalizeLink(body);`,
  `        if (!draft) return reply(400, { error: "invalid" });`,
  `        if (links.has(draft.slug)) return reply(409, { error: "taken" });`,
  `        const link: Link = { ...draft, visits: 0 };`,
  `        links.set(link.slug, link);`,
  `        return reply(201, { ...link });`,
  `      }`,
  `    }`,
  level >= 3 && ``,
  level >= 3 && `    const slug = parts[3];`,
  level >= 3 && `    const link = parts.length > 3 ? links.get(slug) : undefined;`,
  level >= 3 && `    if (link && parts.length === 5 && parts[4] === "visit" && method === "POST") {`,
  level >= 3 && `      link.visits += 1;`,
  level >= 3 && `      return reply(200, { ...link });`,
  level >= 3 && `    }`,
  level >= 3 && `    if (link && parts.length === 4 && method === "DELETE") {`,
  level >= 3 && `      links.delete(slug);`,
  level >= 3 && `      return reply(200, { deleted: slug });`,
  level >= 3 && `    }`,
  `    return notFound();`,
  `  };`,
  `}`,
);

const referenceApp = (level: number) => lines(
  `import React, { useEffect, useState } from "react";`,
  `import { createLocalFetch } from "./localFetch";`,
  `export { normalizeLink, createApi };`,
  ``,
  `type Fetcher = (url: string, options?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;`,
  ``,
  SEED,
  level >= 5 && ``,
  level >= 5 && `const MESSAGES: Record<number, string> = { 400: "Check the link and slug", 409: "Slug already taken" };`,
  ``,
  `export default function App({ fetcher }: { fetcher?: Fetcher }) {`,
  `  // One transport per mounted app: the prop, or a local API over SEED.`,
  `  const [transport] = useState<Fetcher>(() => fetcher ?? createLocalFetch(createApi(SEED)));`,
  `  const [links, setLinks] = useState<Link[]>([]);`,
  `  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");`,
  `  const [attempt, setAttempt] = useState(0);`,
  level >= 5 && `  const [url, setUrl] = useState("");`,
  level >= 5 && `  const [slug, setSlug] = useState("");`,
  level >= 5 && `  const [pending, setPending] = useState(false);`,
  level >= 5 && `  const [message, setMessage] = useState("");`,
  `  const reload = () => setAttempt((n) => n + 1);`,
  ``,
  `  useEffect(() => {`,
  `    let ignore = false;`,
  `    setStatus("loading");`,
  `    transport("/api/links")`,
  `      .then(async (response) => {`,
  `        if (!response.ok) throw new Error("HTTP " + response.status);`,
  `        const list = (await response.json()) as Link[];`,
  `        if (ignore) return;`,
  `        setLinks(list);`,
  `        setStatus("ready");`,
  `      })`,
  `      .catch(() => {`,
  `        if (!ignore) setStatus("error");`,
  `      });`,
  `    return () => {`,
  `      ignore = true;`,
  `    };`,
  `  }, [transport, attempt]);`,
  ``,
  `  function visit(slug: string) {`,
  `    // Load again whether or not the visit landed: the list shows the API's state.`,
  `    transport("/api/links/" + slug + "/visit", { method: "POST" })`,
  `      .catch(() => null)`,
  `      .then(reload);`,
  `  }`,
  level >= 5 && ``,
  level >= 5 && `  async function shorten(event: React.FormEvent) {`,
  level >= 5 && `    event.preventDefault();`,
  level >= 5 && `    setPending(true);`,
  level >= 5 && `    setMessage("");`,
  level >= 5 && `    try {`,
  level >= 5 && `      const response = await transport("/api/links", {`,
  level >= 5 && `        method: "POST",`,
  level >= 5 && `        headers: { "Content-Type": "application/json" },`,
  level >= 5 && `        body: JSON.stringify({ url, slug }),`,
  level >= 5 && `      });`,
  level >= 5 && `      if (response.status === 201) {`,
  level >= 5 && `        setUrl("");`,
  level >= 5 && `        setSlug("");`,
  level >= 5 && `        reload();`,
  level >= 5 && `      } else {`,
  level >= 5 && `        // Keep what was typed, and say what went wrong.`,
  level >= 5 && `        setMessage(MESSAGES[response.status] ?? "Request failed");`,
  level >= 5 && `      }`,
  level >= 5 && `    } catch {`,
  level >= 5 && `      setMessage("Request failed");`,
  level >= 5 && `    } finally {`,
  level >= 5 && `      setPending(false);`,
  level >= 5 && `    }`,
  level >= 5 && `  }`,
  ``,
  `  return (`,
  `    <main>`,
  level >= 5 && `      <form onSubmit={shorten}>`,
  level >= 5 && `        <label>`,
  level >= 5 && `          URL <input value={url} onChange={(event) => setUrl(event.target.value)} />`,
  level >= 5 && `        </label>`,
  level >= 5 && `        <label>`,
  level >= 5 && `          Slug <input value={slug} onChange={(event) => setSlug(event.target.value)} />`,
  level >= 5 && `        </label>`,
  level >= 5 && `        <button disabled={pending}>Shorten</button>`,
  level >= 5 && `      </form>`,
  level >= 5 && `      {message && <p role="alert">{message}</p>}`,
  `      {status === "loading" && <p role="status">Loading</p>}`,
  `      {status === "error" && (`,
  `        <>`,
  `          <p role="alert">Request failed</p>`,
  `          <button onClick={reload}>Retry</button>`,
  `        </>`,
  `      )}`,
  `      {status === "ready" && links.length === 0 && <p>No links</p>}`,
  `      {status === "ready" && (`,
  `        <ul>`,
  `          {links.map((link) => (`,
  `            <li key={link.slug}>`,
  `              {link.slug}: {link.url}, visits <output aria-label={"visits " + link.slug}>{link.visits}</output>`,
  `              <button onClick={() => visit(link.slug)}>Visit {link.slug}</button>`,
  `            </li>`,
  `          ))}`,
  `        </ul>`,
  `      )}`,
  `    </main>`,
  `  );`,
  `}`,
);

const reference = [1, 2, 3, 4, 5].map((level) => level === 1
  ? referenceNormalizeJs
  : [TYPES, referenceNormalizeTs, referenceApi(level), level >= 4 ? referenceApp(level) : ''].filter(Boolean).join('\n\n'));

/* ── junior ────────────────────────────────────────────────────────────── */

const juniorNormalize = (typed: boolean) => lines(
  typed ? `function normalizeLink(value: unknown): Draft | null {` : `function normalizeLink(value) {`,
  `  if (value === null) {`,
  `    return null;`,
  `  }`,
  `  if (typeof value !== "object") {`,
  `    return null;`,
  `  }`,
  `  if (Array.isArray(value)) {`,
  `    return null;`,
  `  }`,
  typed && `  const input = value as { url?: unknown; slug?: unknown };`,
  `  if (typeof ${typed ? 'input' : 'value'}.url !== "string") {`,
  `    return null;`,
  `  }`,
  `  if (typeof ${typed ? 'input' : 'value'}.slug !== "string") {`,
  `    return null;`,
  `  }`,
  `  const url = ${typed ? 'input' : 'value'}.url.trim();`,
  `  if (!url.startsWith("https://")) {`,
  `    return null;`,
  `  }`,
  `  if (url.length <= 8 || url.length > 200) {`,
  `    return null;`,
  `  }`,
  `  const slug = ${typed ? 'input' : 'value'}.slug.trim().toLowerCase();`,
  `  if (slug.length < 3 || slug.length > 20) {`,
  `    return null;`,
  `  }`,
  `  for (let i = 0; i < slug.length; i++) {`,
  `    const char = slug[i];`,
  `    const isLetter = char >= "a" && char <= "z";`,
  `    const isDigit = char >= "0" && char <= "9";`,
  `    if (!isLetter && !isDigit && char !== "-") {`,
  `      return null;`,
  `    }`,
  `  }`,
  `  return { url: url, slug: slug };`,
  `}`,
);

const juniorApi = (level: number) => lines(
  `function createApi(seed: readonly Link[]): (request: RequestData) => Reply {`,
  `  const links: Link[] = [];`,
  `  for (let i = 0; i < seed.length; i++) {`,
  `    links.push({ url: seed[i].url, slug: seed[i].slug, visits: seed[i].visits });`,
  `  }`,
  ``,
  `  function copyOf(link: Link): Link {`,
  `    return { url: link.url, slug: link.slug, visits: link.visits };`,
  `  }`,
  ``,
  `  function findIndex(slug: string): number {`,
  `    for (let i = 0; i < links.length; i++) {`,
  `      if (links[i].slug === slug) {`,
  `        return i;`,
  `      }`,
  `    }`,
  `    return -1;`,
  `  }`,
  ``,
  `  function handle(request: RequestData): Reply {`,
  `    if (request.path === "/api/links" && request.method === "GET") {`,
  `      const copies: Link[] = [];`,
  `      for (let i = 0; i < links.length; i++) {`,
  `        copies.push(copyOf(links[i]));`,
  `      }`,
  `      return { status: 200, body: copies };`,
  `    }`,
  `    if (request.path === "/api/links" && request.method === "POST") {`,
  `      const draft = normalizeLink(request.body);`,
  `      if (draft === null) {`,
  `        return { status: 400, body: { error: "invalid" } };`,
  `      }`,
  `      if (findIndex(draft.slug) !== -1) {`,
  `        return { status: 409, body: { error: "taken" } };`,
  `      }`,
  `      const link: Link = { url: draft.url, slug: draft.slug, visits: 0 };`,
  `      links.push(link);`,
  `      return { status: 201, body: copyOf(link) };`,
  `    }`,
  level >= 3 && `    const parts = request.path.split("/");`,
  level >= 3 && `    if (parts[0] === "" && parts[1] === "api" && parts[2] === "links" && parts.length >= 4) {`,
  level >= 3 && `      const index = findIndex(parts[3]);`,
  level >= 3 && `      if (index !== -1 && parts.length === 5 && parts[4] === "visit" && request.method === "POST") {`,
  level >= 3 && `        links[index].visits = links[index].visits + 1;`,
  level >= 3 && `        return { status: 200, body: copyOf(links[index]) };`,
  level >= 3 && `      }`,
  level >= 3 && `      if (index !== -1 && parts.length === 4 && request.method === "DELETE") {`,
  level >= 3 && `        links.splice(index, 1);`,
  level >= 3 && `        return { status: 200, body: { deleted: parts[3] } };`,
  level >= 3 && `      }`,
  level >= 3 && `    }`,
  `    return { status: 404, body: { error: "not_found" } };`,
  `  }`,
  ``,
  `  return handle;`,
  `}`,
);

const juniorApp = (level: number) => lines(
  `import React, { useEffect, useState } from "react";`,
  `import { createLocalFetch } from "./localFetch";`,
  `export { normalizeLink, createApi };`,
  ``,
  SEED,
  ``,
  `export default function App(props) {`,
  `  const [transport] = useState(() => {`,
  `    if (props.fetcher) {`,
  `      return props.fetcher;`,
  `    }`,
  `    return createLocalFetch(createApi(SEED));`,
  `  });`,
  `  const [links, setLinks] = useState([]);`,
  `  const [loading, setLoading] = useState(true);`,
  `  const [failed, setFailed] = useState(false);`,
  `  const [reloads, setReloads] = useState(0);`,
  level >= 5 && `  const [url, setUrl] = useState("");`,
  level >= 5 && `  const [slug, setSlug] = useState("");`,
  level >= 5 && `  const [sending, setSending] = useState(false);`,
  level >= 5 && `  const [message, setMessage] = useState("");`,
  ``,
  `  useEffect(() => {`,
  `    let cancelled = false;`,
  ``,
  `    async function load() {`,
  `      setLoading(true);`,
  `      setFailed(false);`,
  `      try {`,
  `        const response = await transport("/api/links");`,
  `        if (!response.ok) {`,
  `          throw new Error("Request failed");`,
  `        }`,
  `        const list = await response.json();`,
  `        if (!cancelled) {`,
  `          setLinks(list);`,
  `          setLoading(false);`,
  `        }`,
  `      } catch (error) {`,
  `        if (!cancelled) {`,
  `          setFailed(true);`,
  `          setLoading(false);`,
  `        }`,
  `      }`,
  `    }`,
  ``,
  `    load();`,
  `    return () => {`,
  `      cancelled = true;`,
  `    };`,
  `  }, [transport, reloads]);`,
  ``,
  `  function handleReload() {`,
  `    setReloads(reloads + 1);`,
  `  }`,
  ``,
  `  async function handleVisit(slug) {`,
  `    try {`,
  `      await transport("/api/links/" + slug + "/visit", { method: "POST" });`,
  `    } catch (error) {`,
  `      // The list is loaded again below either way.`,
  `    }`,
  `    setReloads((count) => count + 1);`,
  `  }`,
  level >= 5 && ``,
  level >= 5 && `  async function handleSubmit(event) {`,
  level >= 5 && `    event.preventDefault();`,
  level >= 5 && `    setSending(true);`,
  level >= 5 && `    setMessage("");`,
  level >= 5 && `    try {`,
  level >= 5 && `      const response = await transport("/api/links", {`,
  level >= 5 && `        method: "POST",`,
  level >= 5 && `        headers: { "Content-Type": "application/json" },`,
  level >= 5 && `        body: JSON.stringify({ url: url, slug: slug }),`,
  level >= 5 && `      });`,
  level >= 5 && `      if (response.status === 201) {`,
  level >= 5 && `        setUrl("");`,
  level >= 5 && `        setSlug("");`,
  level >= 5 && `        setReloads((count) => count + 1);`,
  level >= 5 && `      } else if (response.status === 409) {`,
  level >= 5 && `        setMessage("Slug already taken");`,
  level >= 5 && `      } else if (response.status === 400) {`,
  level >= 5 && `        setMessage("Check the link and slug");`,
  level >= 5 && `      } else {`,
  level >= 5 && `        setMessage("Request failed");`,
  level >= 5 && `      }`,
  level >= 5 && `    } catch (error) {`,
  level >= 5 && `      setMessage("Request failed");`,
  level >= 5 && `    }`,
  level >= 5 && `    setSending(false);`,
  level >= 5 && `  }`,
  ``,
  `  let content;`,
  `  if (loading) {`,
  `    content = <p role="status">Loading</p>;`,
  `  } else if (failed) {`,
  `    content = (`,
  `      <>`,
  `        <p role="alert">Request failed</p>`,
  `        <button onClick={handleReload}>Retry</button>`,
  `      </>`,
  `    );`,
  `  } else if (links.length === 0) {`,
  `    content = <p>No links</p>;`,
  `  } else {`,
  `    content = (`,
  `      <ul>`,
  `        {links.map((link) => (`,
  `          <li key={link.slug}>`,
  `            {link.slug} goes to {link.url}. Visits:{" "}`,
  `            <output aria-label={"visits " + link.slug}>{link.visits}</output>`,
  `            <button onClick={() => handleVisit(link.slug)}>Visit {link.slug}</button>`,
  `          </li>`,
  `        ))}`,
  `      </ul>`,
  `    );`,
  `  }`,
  ``,
  `  return (`,
  `    <main>`,
  level >= 5 && `      <form onSubmit={handleSubmit}>`,
  level >= 5 && `        <label>`,
  level >= 5 && `          URL`,
  level >= 5 && `          <input value={url} onChange={(event) => setUrl(event.target.value)} />`,
  level >= 5 && `        </label>`,
  level >= 5 && `        <label>`,
  level >= 5 && `          Slug`,
  level >= 5 && `          <input value={slug} onChange={(event) => setSlug(event.target.value)} />`,
  level >= 5 && `        </label>`,
  level >= 5 && `        <button disabled={sending}>Shorten</button>`,
  level >= 5 && `      </form>`,
  level >= 5 && `      {message !== "" && <p role="alert">{message}</p>}`,
  `      {content}`,
  `    </main>`,
  `  );`,
  `}`,
);

const junior = [1, 2, 3, 4, 5].map((level) => level === 1
  ? juniorNormalize(false)
  : [TYPES, juniorNormalize(true), juniorApi(level), level >= 4 ? juniorApp(level) : ''].filter(Boolean).join('\n\n'));

/* ── senior ────────────────────────────────────────────────────────────── */

const seniorNormalize = (typed: boolean) => lines(
  `const SLUG = /^[a-z0-9-]{3,20}$/;`,
  ``,
  typed ? `const normalizeLink = (value: unknown): Draft | null => {` : `const normalizeLink = (value) => {`,
  `  if (!value || typeof value !== "object" || Array.isArray(value)) return null;`,
  typed ? `  const { url, slug } = value as { url?: unknown; slug?: unknown };` : `  const { url, slug } = value;`,
  `  if (typeof url !== "string" || typeof slug !== "string") return null;`,
  `  const link = { url: url.trim(), slug: slug.trim().toLowerCase() };`,
  `  const validUrl = link.url.startsWith("https://") && link.url.length > 8 && link.url.length <= 200;`,
  `  return validUrl && SLUG.test(link.slug) ? link : null;`,
  `};`,
);

const seniorApi = (level: number) => lines(
  `const createApi = (seed: readonly Link[]): ((request: RequestData) => Reply) => {`,
  `  const links = new Map(seed.map((link): [string, Link] => [link.slug, { ...link }]));`,
  `  const json = (status: number, body: unknown): Reply => ({ status, body });`,
  `  const notFound = () => json(404, { error: "not_found" });`,
  ``,
  `  const create = (body: unknown): Reply => {`,
  `    const draft = normalizeLink(body);`,
  `    if (!draft) return json(400, { error: "invalid" });`,
  `    if (links.has(draft.slug)) return json(409, { error: "taken" });`,
  `    const link = { ...draft, visits: 0 };`,
  `    links.set(link.slug, link);`,
  `    return json(201, { ...link });`,
  `  };`,
  ``,
  `  return ({ method, path, body }) => {`,
  `    if (path === "/api/links") {`,
  `      if (method === "GET") return json(200, [...links.values()].map((link) => ({ ...link })));`,
  `      if (method === "POST") return create(body);`,
  `      return notFound();`,
  `    }`,
  level >= 3 && `    const [, slug = "", visit] = path.match(/^\\/api\\/links\\/([^/]+)(\\/visit)?$/) ?? [];`,
  level >= 3 && `    const link = links.get(slug);`,
  level >= 3 && `    if (!link) return notFound();`,
  level >= 3 && `    if (visit && method === "POST") return json(200, { ...link, visits: ++link.visits });`,
  level >= 3 && `    if (!visit && method === "DELETE") {`,
  level >= 3 && `      links.delete(slug);`,
  level >= 3 && `      return json(200, { deleted: slug });`,
  level >= 3 && `    }`,
  `    return notFound();`,
  `  };`,
  `};`,
);

const seniorApp = (level: number) => lines(
  `import React, { useEffect, useState } from "react";`,
  `import { createLocalFetch } from "./localFetch";`,
  `export { normalizeLink, createApi };`,
  ``,
  `type Fetcher = (url: string, options?: RequestInit) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;`,
  ``,
  SEED,
  level >= 5 && ``,
  level >= 5 && `const MESSAGES: Record<number, string> = { 400: "Check the link and slug", 409: "Slug already taken" };`,
  ``,
  `function useLinks(transport: Fetcher) {`,
  `  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; links: Link[] }>({ status: "loading", links: [] });`,
  `  const [version, setVersion] = useState(0);`,
  `  useEffect(() => {`,
  `    let live = true;`,
  `    setState((current) => ({ ...current, status: "loading" }));`,
  `    transport("/api/links")`,
  `      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))`,
  `      .then(`,
  `        (links) => live && setState({ status: "ready", links: links as Link[] }),`,
  `        () => live && setState((current) => ({ ...current, status: "error" })),`,
  `      );`,
  `    return () => {`,
  `      live = false;`,
  `    };`,
  `  }, [transport, version]);`,
  `  return { ...state, reload: () => setVersion((n) => n + 1) };`,
  `}`,
  ``,
  `export default function App({ fetcher }: { fetcher?: Fetcher }) {`,
  `  const [transport] = useState<Fetcher>(() => fetcher ?? createLocalFetch(createApi(SEED)));`,
  `  const { status, links, reload } = useLinks(transport);`,
  level >= 5 && `  const [form, setForm] = useState({ url: "", slug: "" });`,
  level >= 5 && `  const [pending, setPending] = useState(false);`,
  level >= 5 && `  const [message, setMessage] = useState("");`,
  ``,
  `  const visit = (slug: string) => transport("/api/links/" + slug + "/visit", { method: "POST" }).catch(() => null).then(reload);`,
  level >= 5 && ``,
  level >= 5 && `  const field = (name: "url" | "slug") => ({`,
  level >= 5 && `    value: form[name],`,
  level >= 5 && `    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [name]: event.target.value }),`,
  level >= 5 && `  });`,
  level >= 5 && ``,
  level >= 5 && `  const shorten = async (event: React.FormEvent) => {`,
  level >= 5 && `    event.preventDefault();`,
  level >= 5 && `    setPending(true);`,
  level >= 5 && `    setMessage("");`,
  level >= 5 && `    const response = await transport("/api/links", {`,
  level >= 5 && `      method: "POST",`,
  level >= 5 && `      headers: { "Content-Type": "application/json" },`,
  level >= 5 && `      body: JSON.stringify(form),`,
  level >= 5 && `    }).catch(() => null);`,
  level >= 5 && `    setPending(false);`,
  level >= 5 && `    if (response?.status === 201) {`,
  level >= 5 && `      setForm({ url: "", slug: "" });`,
  level >= 5 && `      reload();`,
  level >= 5 && `    } else {`,
  level >= 5 && `      setMessage((response && MESSAGES[response.status]) ?? "Request failed");`,
  level >= 5 && `    }`,
  level >= 5 && `  };`,
  ``,
  `  return (`,
  `    <main>`,
  level >= 5 && `      <form onSubmit={shorten}>`,
  level >= 5 && `        <label>URL <input {...field("url")} /></label>`,
  level >= 5 && `        <label>Slug <input {...field("slug")} /></label>`,
  level >= 5 && `        <button disabled={pending}>Shorten</button>`,
  level >= 5 && `      </form>`,
  level >= 5 && `      {message && <p role="alert">{message}</p>}`,
  `      {status === "loading" && <p role="status">Loading</p>}`,
  `      {status === "error" && (`,
  `        <>`,
  `          <p role="alert">Request failed</p>`,
  `          <button onClick={reload}>Retry</button>`,
  `        </>`,
  `      )}`,
  `      {status === "ready" && (links.length === 0 ? <p>No links</p> : (`,
  `        <ul>`,
  `          {links.map(({ slug, url, visits }) => (`,
  `            <li key={slug}>`,
  `              {slug} → {url} <output aria-label={"visits " + slug}>{visits}</output>`,
  `              <button onClick={() => visit(slug)}>Visit {slug}</button>`,
  `            </li>`,
  `          ))}`,
  `        </ul>`,
  `      ))}`,
  `    </main>`,
  `  );`,
  `}`,
);

const senior = [1, 2, 3, 4, 5].map((level) => level === 1
  ? seniorNormalize(false)
  : [TYPES, seniorNormalize(true), seniorApi(level), level >= 4 ? seniorApp(level) : ''].filter(Boolean).join('\n\n'));

const LINKS: Boards = { reference, junior, senior };
const IDS = ['js-fullstack-links', 'ts-fullstack-links', 'ts-fullstack-links', 'react-fullstack-links', 'react-fullstack-links'];

/** Hidden checks for the API levels. The React levels re-run every API check
 * through their suite's prelude, so they carry none of their own. */
const HIDDEN: [string, unknown][][] = [
  [['normalizeLink({url: "https://a.io", slug: "a-b-c"})', { url: 'https://a.io', slug: 'a-b-c' }], ['normalizeLink({url: "https://a.io", slug: "x".repeat(21)})', null], ['normalizeLink({url: "https://" + "a".repeat(193), slug: "abc"})', null], ['normalizeLink({url: "https://a.io"})', null], ['normalizeLink({url: "https://" + "a".repeat(192), slug: "abc"})', { url: 'https://' + 'a'.repeat(192), slug: 'abc' }]],
  [['createApi([])({method: "PUT", path: "/api/links"})', { status: 404, body: { error: 'not_found' } }], ['(() => { const api = createApi([]); api({method: "POST", path: "/api/links", body: {url: "https://a.io", slug: "one"}}); return api({method: "POST", path: "/api/links", body: {url: "https://b.io", slug: " ONE "}}).status; })()', 409],
    // The created link comes back as a copy.
    ['(() => { const api = createApi([]); const reply = api({method: "POST", path: "/api/links", body: {url: "https://a.io", slug: "abc"}}); reply.body.visits = 99; return api({method: "GET", path: "/api/links"}).body[0].visits; })()', 0],
    // A POST with no body at all is an invalid body.
    ['createApi([])({method: "POST", path: "/api/links"})', { status: 400, body: { error: 'invalid' } }]],
  [['createApi([{url: "https://a.io", slug: "abc", visits: 0}])({method: "DELETE", path: "/api/links/abc/visit"})', { status: 404, body: { error: 'not_found' } }], ['createApi([{url: "https://a.io", slug: "abc", visits: 0}])({method: "POST", path: "/api/links/abc/visit/again"})', { status: 404, body: { error: 'not_found' } }],
    // A visit answers with a copy, and only DELETE removes a link.
    ['(() => { const api = createApi([{url: "https://a.io", slug: "abc", visits: 3}]); const reply = api({method: "POST", path: "/api/links/abc/visit"}); reply.body.visits = 99; return api({method: "GET", path: "/api/links"}).body[0].visits; })()', 4],
    ['(() => { const api = createApi([{url: "https://a.io", slug: "abc", visits: 3}]); const reply = api({method: "PUT", path: "/api/links/abc"}); return [reply, api({method: "GET", path: "/api/links"}).body.length]; })()', [{ status: 404, body: { error: 'not_found' } }, 1]],
    // Only /visit counts a visit: any other last segment is not found.
    ['(() => { const api = createApi([{url: "https://a.io", slug: "abc", visits: 3}]); const reply = api({method: "POST", path: "/api/links/abc/like"}); return [reply, api({method: "GET", path: "/api/links"}).body[0].visits]; })()', [{ status: 404, body: { error: 'not_found' } }, 3]]],
];

export const FULLSTACK_PATH_SOLUTIONS: Record<string, CodingSolution> = Object.fromEntries(
  wholeLevels('links', LINKS).map(([, record], index): [string, CodingSolution] => [
    `${IDS[index]}-${index + 1}`,
    index < 3
      ? { ...record, hiddenTests: HIDDEN.slice(0, index + 1).flat().map(([call, expected]) => ({ call, expected, edge: true })) }
      : record,
  ]),
);

FULLSTACK_PATH_SOLUTIONS['js-fullstack-links-1'].hiddenTests = [...(FULLSTACK_PATH_SOLUTIONS['js-fullstack-links-1'].hiddenTests ?? []), {"call": "(()=>{const trims=['',' ','\\t','\\n','\\r','\\u00a0','\\ufeff','\\u2003','\\u2028','\\u2029'],slugs=[['ABC','abc'],['a-b','a-b'],['---','---'],['123','123'],['\u212aKK','kkk'],['ab',null],['x'.repeat(20),'x'.repeat(20)],['x'.repeat(21),null],['a b',null],['a_b',null],['\u00e9ab',null],['\u0130ab',null],['a\\u200bb',null]],urls=[['https://a','https://a'],['https://\\nx','https://\\nx'],['https://a b','https://a b'],['https://',''],['http://a',''],['HTTPS://a',''],['https://'+'a'.repeat(192),'https://'+'a'.repeat(192)],['https://'+'a'.repeat(193),'']];for(const ws of trims)for(const[slug,expectedSlug]of slugs)for(const[url,expectedUrl]of urls){const actual=normalizeLink({url:ws+url+ws,slug:ws+slug+ws});if(!expectedUrl||expectedSlug===null){if(actual!==null)return false;}else if(!actual||actual.url!==expectedUrl||actual.slug!==expectedSlug||Object.keys(actual).length!==2)return false;}return true;})()", "expected": true},{"call": "(()=>{const values=[Object.freeze({url:' https://a ',slug:' ABC ',extra:99}),Object.freeze(Object.create({url:'https://a',slug:'abc'})),Object.freeze(Object.assign(Object.create(null),{url:'https://a',slug:'abc'}))];for(const value of values){const a=normalizeLink(value),b=normalizeLink(value);if(!a||!b||a===b||a===value||Object.keys(a).join(',')!=='url,slug'&&Object.keys(a).join(',')!=='slug,url')return false;a.url='changed';a.slug='changed';a.extra=1;if(b.url!=='https://a'||b.slug!=='abc'||normalizeLink(value).slug!=='abc')return false;}const value={url:'https://a',slug:'abc'};Object.defineProperty(value,'ignored',{get(){throw Error('ignored field read');},enumerable:true});if(normalizeLink(value).slug!=='abc')return false;const invalid=[undefined,null,false,0,1n,Symbol('x'),()=>0,[],new String('x'),{}, {url:new String('https://a'),slug:'abc'},{url:'https://a',slug:12}];return invalid.every(value=>normalizeLink(value)===null);})()", "expected": true},{"call": "(()=>{const value=Object.freeze({url:' '.repeat(9900)+'https://a'+' '.repeat(9900),slug:' '.repeat(9900)+'A-B'+' '.repeat(9900)}),a=normalizeLink(value);return a.url==='https://a'&&a.slug==='a-b'&&normalizeLink({url:'https://'+'\ud83d\ude00'.repeat(96),slug:'abc'}).url.length===200&&normalizeLink({url:'https://'+'\ud83d\ude00'.repeat(97),slug:'abc'})===null&&normalizeLink({url:'https://a',slug:'x'.repeat(20000)})===null;})()", "expected": true}];

FULLSTACK_PATH_SOLUTIONS["ts-fullstack-links-2"].hiddenTests = [...(FULLSTACK_PATH_SOLUTIONS["ts-fullstack-links-2"].hiddenTests ?? []), {"call": "((()=>{const trims=['',' ','\\t','\\n','\\r','\\u00a0','\\ufeff','\\u2003','\\u2028','\\u2029'],slugs=[['ABC','abc'],['a-b','a-b'],['---','---'],['123','123'],['\u212aKK','kkk'],['ab',null],['x'.repeat(20),'x'.repeat(20)],['x'.repeat(21),null],['a b',null],['a_b',null],['\u00e9ab',null],['\u0130ab',null],['a\\u200bb',null]],urls=[['https://a','https://a'],['https://\\nx','https://\\nx'],['https://a b','https://a b'],['https://',''],['http://a',''],['HTTPS://a',''],['https://'+'a'.repeat(192),'https://'+'a'.repeat(192)],['https://'+'a'.repeat(193),'']];for(const ws of trims)for(const[slug,expectedSlug]of slugs)for(const[url,expectedUrl]of urls){const actual=normalizeLink({url:ws+url+ws,slug:ws+slug+ws});if(!expectedUrl||expectedSlug===null){if(actual!==null)return false;}else if(!actual||actual.url!==expectedUrl||actual.slug!==expectedSlug||Object.keys(actual).length!==2)return false;}return true;})()&&(()=>{const keys=['zoo','abc','---','k00'];for(let seed=0;seed<16;seed++){let model=[{url:'https://seed',slug:keys[seed%4],visits:seed}],api=createApi(model),other=createApi([]);for(let step=0;step<96;step++){const op=(seed+step*7)%4,slug=keys[(step+seed)%4];let request,expected;if(op===0){request={method:'GET',path:'/api/links'};expected={status:200,body:model.map(v=>({...v}))};}else if(op===1){request={method:'POST',path:'/api/links',body:{url:' https://new ',slug:' '+slug.toUpperCase()+' '}};const existing=model.some(v=>v.slug===slug);if(existing)expected={status:409,body:{error:'taken'}};else{const link={url:'https://new',slug,visits:0};model.push(link);expected={status:201,body:{...link}};}}else if(op===2){request={method:'POST',path:'/api/links',body:{url:'http://bad',slug}};expected={status:400,body:{error:'invalid'}};}else if(op===3){request={method:'PUT',path:'/api/links/'+slug};expected={status:404,body:{error:'not_found'}};} const actual=api(request);if(JSON.stringify(actual)!==JSON.stringify(expected))return false;const listed=api({method:'GET',path:'/api/links'});if(JSON.stringify(listed)!==JSON.stringify({status:200,body:model})||JSON.stringify(other({method:'GET',path:'/api/links'}).body)!=='[]')return false;}}return true;})())", "expected": true},{"call": "((()=>{const values=[Object.freeze({url:' https://a ',slug:' ABC ',extra:99}),Object.freeze(Object.create({url:'https://a',slug:'abc'})),Object.freeze(Object.assign(Object.create(null),{url:'https://a',slug:'abc'}))];for(const value of values){const a=normalizeLink(value),b=normalizeLink(value);if(!a||!b||a===b||a===value||Object.keys(a).join(',')!=='url,slug'&&Object.keys(a).join(',')!=='slug,url')return false;a.url='changed';a.slug='changed';a.extra=1;if(b.url!=='https://a'||b.slug!=='abc'||normalizeLink(value).slug!=='abc')return false;}const value={url:'https://a',slug:'abc'};Object.defineProperty(value,'ignored',{get(){throw Error('ignored field read');},enumerable:true});if(normalizeLink(value).slug!=='abc')return false;const invalid=[undefined,null,false,0,1n,Symbol('x'),()=>0,[],new String('x'),{}, {url:new String('https://a'),slug:'abc'},{url:'https://a',slug:12}];return invalid.every(value=>normalizeLink(value)===null);})()&&(()=>{const seed=[{url:'https://z',slug:'zzz',visits:7},{url:'https://a',slug:'aaa',visits:0}],api=createApi(seed),independent=createApi(seed);seed[0].url='changed';seed[0].slug='changed';seed[0].visits=99;seed.push({url:'https://b',slug:'bbb',visits:1});const first=api({method:'GET',path:'/api/links'});if(first.body.length!==2||first.body[0].slug!=='zzz'||first.body[0].url!=='https://z'||first.body[0].visits!==7)return false;first.status=0;first.body[0].slug='hacked';first.body.pop();const created=api({method:'POST',path:'/api/links',body:{url:'https://new',slug:'ccc'}});created.body.url='hacked';const listed=api({method:'GET',path:'/api/links'}).body,other=independent({method:'GET',path:'/api/links'}).body;return listed.length===3&&listed[0].slug==='zzz'&&listed[2].url==='https://new'&&other.length===2&&other[0].visits===7;})())", "expected": true},{"call": "((()=>{const value=Object.freeze({url:' '.repeat(9900)+'https://a'+' '.repeat(9900),slug:' '.repeat(9900)+'A-B'+' '.repeat(9900)}),a=normalizeLink(value);return a.url==='https://a'&&a.slug==='a-b'&&normalizeLink({url:'https://'+'\ud83d\ude00'.repeat(96),slug:'abc'}).url.length===200&&normalizeLink({url:'https://'+'\ud83d\ude00'.repeat(97),slug:'abc'})===null&&normalizeLink({url:'https://a',slug:'x'.repeat(20000)})===null;})()&&(()=>{const seed=Object.freeze(Array.from({length:10000},(_,i)=>Object.freeze({url:'https://a',slug:'k'+String(i).padStart(4,'0'),visits:i}))),api=createApi(seed);const result=api({method:'GET',path:'/api/links'});if(result.status!==200||result.body.length!==10000||result.body[9999].visits!==9999)return false;result.body[0].visits=999;return seed[0].visits===0&&api({method:'GET',path:'/api/links'}).body[0].visits===0;})())", "expected": true}];

FULLSTACK_PATH_SOLUTIONS["ts-fullstack-links-3"].hiddenTests = [...(FULLSTACK_PATH_SOLUTIONS["ts-fullstack-links-3"].hiddenTests ?? []), {"call": "(((()=>{const trims=['',' ','\\t','\\n','\\r','\\u00a0','\\ufeff','\\u2003','\\u2028','\\u2029'],slugs=[['ABC','abc'],['a-b','a-b'],['---','---'],['123','123'],['\u212aKK','kkk'],['ab',null],['x'.repeat(20),'x'.repeat(20)],['x'.repeat(21),null],['a b',null],['a_b',null],['\u00e9ab',null],['\u0130ab',null],['a\\u200bb',null]],urls=[['https://a','https://a'],['https://\\nx','https://\\nx'],['https://a b','https://a b'],['https://',''],['http://a',''],['HTTPS://a',''],['https://'+'a'.repeat(192),'https://'+'a'.repeat(192)],['https://'+'a'.repeat(193),'']];for(const ws of trims)for(const[slug,expectedSlug]of slugs)for(const[url,expectedUrl]of urls){const actual=normalizeLink({url:ws+url+ws,slug:ws+slug+ws});if(!expectedUrl||expectedSlug===null){if(actual!==null)return false;}else if(!actual||actual.url!==expectedUrl||actual.slug!==expectedSlug||Object.keys(actual).length!==2)return false;}return true;})()&&(()=>{const keys=['zoo','abc','---','k00'];for(let seed=0;seed<16;seed++){let model=[{url:'https://seed',slug:keys[seed%4],visits:seed}],api=createApi(model),other=createApi([]);for(let step=0;step<96;step++){const op=(seed+step*7)%4,slug=keys[(step+seed)%4];let request,expected;if(op===0){request={method:'GET',path:'/api/links'};expected={status:200,body:model.map(v=>({...v}))};}else if(op===1){request={method:'POST',path:'/api/links',body:{url:' https://new ',slug:' '+slug.toUpperCase()+' '}};const existing=model.some(v=>v.slug===slug);if(existing)expected={status:409,body:{error:'taken'}};else{const link={url:'https://new',slug,visits:0};model.push(link);expected={status:201,body:{...link}};}}else if(op===2){request={method:'POST',path:'/api/links',body:{url:'http://bad',slug}};expected={status:400,body:{error:'invalid'}};}else if(op===3){request={method:'PUT',path:'/api/links/'+slug};expected={status:404,body:{error:'not_found'}};} const actual=api(request);if(JSON.stringify(actual)!==JSON.stringify(expected))return false;const listed=api({method:'GET',path:'/api/links'});if(JSON.stringify(listed)!==JSON.stringify({status:200,body:model})||JSON.stringify(other({method:'GET',path:'/api/links'}).body)!=='[]')return false;}}return true;})())&&(()=>{const keys=['zoo','abc','---','k00'];for(let seed=0;seed<16;seed++){let model=[{url:'https://seed',slug:keys[seed%4],visits:seed}],api=createApi(model),other=createApi([]);for(let step=0;step<96;step++){const op=(seed+step*7)%6,slug=keys[(step+seed)%4];let request,expected;if(op===0){request={method:'GET',path:'/api/links'};expected={status:200,body:model.map(v=>({...v}))};}else if(op===1){request={method:'POST',path:'/api/links',body:{url:' https://new ',slug:' '+slug.toUpperCase()+' '}};const existing=model.some(v=>v.slug===slug);if(existing)expected={status:409,body:{error:'taken'}};else{const link={url:'https://new',slug,visits:0};model.push(link);expected={status:201,body:{...link}};}}else if(op===2){request={method:'POST',path:'/api/links',body:{url:'http://bad',slug}};expected={status:400,body:{error:'invalid'}};}else if(op===3){request={method:'PUT',path:'/api/links/'+slug};expected={status:404,body:{error:'not_found'}};}else if(op===4){request={method:'POST',path:'/api/links/'+slug+'/visit'};const link=model.find(v=>v.slug===slug);if(link){link.visits++;expected={status:200,body:{...link}};}else expected={status:404,body:{error:'not_found'}};}else{request={method:'DELETE',path:'/api/links/'+slug};const index=model.findIndex(v=>v.slug===slug);if(index>=0){model.splice(index,1);expected={status:200,body:{deleted:slug}};}else expected={status:404,body:{error:'not_found'}};} const actual=api(request);if(JSON.stringify(actual)!==JSON.stringify(expected))return false;const listed=api({method:'GET',path:'/api/links'});if(JSON.stringify(listed)!==JSON.stringify({status:200,body:model})||JSON.stringify(other({method:'GET',path:'/api/links'}).body)!=='[]')return false;}}return true;})())", "expected": true},{"call": "(((()=>{const values=[Object.freeze({url:' https://a ',slug:' ABC ',extra:99}),Object.freeze(Object.create({url:'https://a',slug:'abc'})),Object.freeze(Object.assign(Object.create(null),{url:'https://a',slug:'abc'}))];for(const value of values){const a=normalizeLink(value),b=normalizeLink(value);if(!a||!b||a===b||a===value||Object.keys(a).join(',')!=='url,slug'&&Object.keys(a).join(',')!=='slug,url')return false;a.url='changed';a.slug='changed';a.extra=1;if(b.url!=='https://a'||b.slug!=='abc'||normalizeLink(value).slug!=='abc')return false;}const value={url:'https://a',slug:'abc'};Object.defineProperty(value,'ignored',{get(){throw Error('ignored field read');},enumerable:true});if(normalizeLink(value).slug!=='abc')return false;const invalid=[undefined,null,false,0,1n,Symbol('x'),()=>0,[],new String('x'),{}, {url:new String('https://a'),slug:'abc'},{url:'https://a',slug:12}];return invalid.every(value=>normalizeLink(value)===null);})()&&(()=>{const seed=[{url:'https://z',slug:'zzz',visits:7},{url:'https://a',slug:'aaa',visits:0}],api=createApi(seed),independent=createApi(seed);seed[0].url='changed';seed[0].slug='changed';seed[0].visits=99;seed.push({url:'https://b',slug:'bbb',visits:1});const first=api({method:'GET',path:'/api/links'});if(first.body.length!==2||first.body[0].slug!=='zzz'||first.body[0].url!=='https://z'||first.body[0].visits!==7)return false;first.status=0;first.body[0].slug='hacked';first.body.pop();const created=api({method:'POST',path:'/api/links',body:{url:'https://new',slug:'ccc'}});created.body.url='hacked';const listed=api({method:'GET',path:'/api/links'}).body,other=independent({method:'GET',path:'/api/links'}).body;return listed.length===3&&listed[0].slug==='zzz'&&listed[2].url==='https://new'&&other.length===2&&other[0].visits===7;})())&&(()=>{const api=createApi([{url:'https://a',slug:'abc',visits:0}]),bad=['/api/links/abc/visit\\n','/api/links/abc/visit\\r','/api/links/abc/visit\\u2028','/api/links/abc/visit/','/api/links/abc//visit','/api/links/abc/visit?x=1','/api/links/ABC/visit','api/links/abc/visit','/API/links/abc/visit'];for(const path of bad)if(JSON.stringify(api({method:'POST',path}))!=='{\"status\":404,\"body\":{\"error\":\"not_found\"}}')return false;for(const method of ['GET','DELETE','PUT','post','HEAD'])if(api({method,path:'/api/links/abc/visit'}).status!==404)return false;return api({method:'GET',path:'/api/links'}).body[0].visits===0;})())", "expected": true},{"call": "(((()=>{const value=Object.freeze({url:' '.repeat(9900)+'https://a'+' '.repeat(9900),slug:' '.repeat(9900)+'A-B'+' '.repeat(9900)}),a=normalizeLink(value);return a.url==='https://a'&&a.slug==='a-b'&&normalizeLink({url:'https://'+'\ud83d\ude00'.repeat(96),slug:'abc'}).url.length===200&&normalizeLink({url:'https://'+'\ud83d\ude00'.repeat(97),slug:'abc'})===null&&normalizeLink({url:'https://a',slug:'x'.repeat(20000)})===null;})()&&(()=>{const seed=Object.freeze(Array.from({length:10000},(_,i)=>Object.freeze({url:'https://a',slug:'k'+String(i).padStart(4,'0'),visits:i}))),api=createApi(seed);const result=api({method:'GET',path:'/api/links'});if(result.status!==200||result.body.length!==10000||result.body[9999].visits!==9999)return false;result.body[0].visits=999;return seed[0].visits===0&&api({method:'GET',path:'/api/links'}).body[0].visits===0;})())&&(()=>{const seed=Object.freeze([{url:'https://a',slug:'abc',visits:1000000}]),api=createApi(seed);const first=api({method:'POST',path:'/api/links/abc/visit'});if(first.body.visits!==1000001)return false;first.body.visits=0;first.body.slug='hacked';for(let i=0;i<999;i++)if(api({method:'POST',path:'/api/links/abc/visit'}).status!==200)return false;if(api({method:'GET',path:'/api/links'}).body[0].visits!==1001000||seed[0].visits!==1000000)return false;if(api({method:'DELETE',path:'/api/links/abc'}).status!==200||api({method:'POST',path:'/api/links/abc/visit'}).status!==404)return false;const created=api({method:'POST',path:'/api/links',body:{url:'https://new',slug:'abc'}});return created.status===201&&created.body.visits===0&&api({method:'POST',path:'/api/links/abc/visit'}).body.visits===1;})())", "expected": true}];

// Current UI stages retain their API contracts and receive only their own checks.
const LINK_CLIENT_REVIEW_CASES: Record<string,string> = {
"react-fullstack-links-4": `const IO_PLANNER=false,IO_FULL=true,IO_ENDPOINT="/api/links",IO_EMPTY="No links";

const ioRTL=require('@testing-library/react'),ioQuery=v=>ioRTL.within(v.container);
const ioDeferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const ioFlush=async callback=>{await ioRTL.act(async()=>{callback();await Promise.resolve();});};
const ioRows=v=>ioQuery(v).queryAllByRole('listitem');
const ioReply=rows=>({ok:true,status:200,json:async()=>rows});
const ioLoading=v=>{expect(ioQuery(v).getByRole('status').textContent).toBe('Loading');expect(ioQuery(v).queryByText(IO_EMPTY,{exact:true})).toBeNull();};
const ioError=v=>{const node=ioQuery(v).getByRole('alert'),copy=node.cloneNode(true);copy.querySelectorAll('button').forEach(button=>button.remove());expect(copy.textContent.trim()).toBe('Request failed');};
const ioRecords=IO_PLANNER?[{id:31,name:'Literal <task>&',hours:1000,version:4},{id:107,name:'Zero task',hours:0,version:1},{id:203,name:'Third task',hours:9,version:2},{id:404,name:'Fourth task',hours:42,version:9}]:[{url:'https://one.example/<literal>&',slug:'one-long-slug',visits:1000},{url:'https://zero.example',slug:'zero',visits:0},{url:'https://three.example',slug:'constructor',visits:9},{url:'https://four.example',slug:'four',visits:42}];
const ioCheck=(v,records)=>{const rows=ioRows(v);expect(rows.length).toBe(records.length);for(let i=0;i<records.length;i++){const record=records[i],scope=ioRTL.within(rows[i]),label=IO_PLANNER?'hours '+record.name:'visits '+record.slug;expect(rows[i].textContent).toContain(IO_PLANNER?record.name:record.url);const output=scope.getByLabelText(label);expect(output.tagName).toBe('OUTPUT');expect(output.textContent).toBe(String(IO_PLANNER?record.hours:record.visits));if(!IO_PLANNER)expect(Boolean(scope.getByRole('button',{name:'Visit '+record.slug,exact:true}))).toBe(true);}expect(v.container.querySelector('task')).toBeNull();expect(v.container.querySelector('literal')).toBeNull();};

test('all supplied arbitrary records are rendered and the same transport does not load again on parent renders',async()=>{const pending=ioDeferred();const calls=[];const http=(url,options)=>{calls.push({url,method:options?.method||'GET'});return pending.promise;};const v=render(<App fetcher={http}/>);if(IO_FULL)ioLoading(v);expect(calls).toEqual([{url:IO_ENDPOINT,method:'GET'}]);v.rerender(<App fetcher={http}/>);expect(calls.length).toBe(1);await ioFlush(()=>pending.resolve(ioReply(ioRecords)));ioCheck(v,ioRecords);v.rerender(<App fetcher={http}/>);ioCheck(v,ioRecords);expect(calls.length).toBe(1);});
test('separate mounts keep their own successful answers and new default mounts use the authored seed',async()=>{const one=ioDeferred(),two=ioDeferred(),first=()=>one.promise,second=()=>two.promise;const a=render(<App fetcher={first}/>),b=render(<App fetcher={second}/>);await ioFlush(()=>two.resolve(ioReply(ioRecords.slice(1,3))));ioCheck(b,ioRecords.slice(1,3));await ioFlush(()=>one.resolve(ioReply(ioRecords.slice(0,1))));ioCheck(a,ioRecords.slice(0,1));ioCheck(b,ioRecords.slice(1,3));a.unmount();const fresh=render(<App/>);await ioRTL.waitFor(()=>expect(ioRows(fresh).length).toBe(IO_PLANNER?3:2),{timeout:500});expect(ioQuery(fresh).getByLabelText(IO_PLANNER?'hours Build login':'visits mdn').textContent).toBe(IO_PLANNER?'2':'3');ioCheck(b,ioRecords.slice(1,3));});

test('repeated rejected and non-ok list requests each allow a fresh retry and eventual empty recovery',async()=>{const requests=[ioDeferred(),ioDeferred(),ioDeferred(),ioDeferred()];let count=0;const calls=[];const http=(url,options)=>{calls.push({url,method:options?.method||'GET'});return requests[count++].promise;};const v=render(<App fetcher={http}/>);for(let i=0;i<3;i++){ioLoading(v);await ioFlush(()=>i===2?requests[i].reject('offline'):requests[i].resolve({ok:false,status:i===0?404:503,json:async()=>({error:'no'})}));ioError(v);expect(ioQuery(v).queryByRole('status')).toBeNull();expect(ioRows(v).length).toBe(0);expect(count).toBe(i+1);fireEvent.click(ioQuery(v).getByRole('button',{name:'Retry',exact:true}));expect(count).toBe(i+2);}ioLoading(v);await ioFlush(()=>requests[3].resolve(ioReply([])));expect(Boolean(ioQuery(v).getByText(IO_EMPTY,{exact:true}))).toBe(true);expect(ioQuery(v).queryByRole('alert')).toBeNull();expect(ioQuery(v).queryByRole('status')).toBeNull();expect(calls.every(call=>call.url===IO_ENDPOINT&&call.method==='GET')).toBe(true);});

test('a visit waits for its POST before reloading the complete authoritative list',async()=>{const api=createApi([{url:'https://custom.example',slug:'custom',visits:7}]),local=createLocalFetch(api),pending=ioDeferred(),calls=[];const http=(url,options)=>{const method=options?.method||'GET';calls.push({url,method});return method==='POST'?pending.promise:local(url,options);};const v=render(<App fetcher={http}/>);await ioRTL.waitFor(()=>expect(ioQuery(v).getByLabelText('visits custom').textContent).toBe('7'));fireEvent.click(ioQuery(v).getByRole('button',{name:'Visit custom',exact:true}));expect(calls).toEqual([{url:'/api/links',method:'GET'},{url:'/api/links/custom/visit',method:'POST'}]);expect(ioQuery(v).getByLabelText('visits custom').textContent).toBe('7');await ioFlush(()=>pending.resolve(local('/api/links/custom/visit',{method:'POST'})));await ioRTL.waitFor(()=>expect(ioQuery(v).getByLabelText('visits custom').textContent).toBe('8'));expect(calls).toEqual([{url:'/api/links',method:'GET'},{url:'/api/links/custom/visit',method:'POST'},{url:'/api/links',method:'GET'}]);});
test('default APIs are retained across renders and visits but stay isolated between mounted apps',async()=>{const a=render(<App/>),b=render(<App/>);await ioRTL.waitFor(()=>expect(ioQuery(a).getByLabelText('visits mdn').textContent).toBe('3'));await ioRTL.waitFor(()=>expect(ioQuery(b).getByLabelText('visits mdn').textContent).toBe('3'));for(const count of [4,5]){fireEvent.click(ioQuery(a).getByRole('button',{name:'Visit mdn',exact:true}));await ioRTL.waitFor(()=>expect(ioQuery(a).getByLabelText('visits mdn').textContent).toBe(String(count)));a.rerender(<App/>);expect(ioQuery(a).getByLabelText('visits mdn').textContent).toBe(String(count));expect(ioQuery(b).getByLabelText('visits mdn').textContent).toBe('3');}});

test('the retained link API keeps inherited normalization and frozen-seed ownership and exact routes',()=>{const owned={url:' https://custom.example ',slug:' CONSTRUCTOR '};Object.defineProperty(owned,'extra',{get(){throw Error('opaque extra');}});expect(normalizeLink(owned)).toEqual({url:'https://custom.example',slug:'constructor'});const factory=createApi([{url:'https://custom.example',slug:'constructor',visits:0}]),prototype=factory({method:'GET',path:'/api/links'}).body[0],inherited=factory({method:'GET',path:'/api/links'}).body[0];for(const key of Object.keys(inherited))delete inherited[key];inherited.__proto__=prototype;expect(Object.prototype.hasOwnProperty.call(inherited,'url')).toBe(false);expect(inherited.url).toBe('https://custom.example');expect(normalizeLink(inherited)).toEqual({url:'https://custom.example',slug:'constructor'});expect(factory({method:'GET',path:'/api/links'}).body[0].url).toBe('https://custom.example');const seed=Object.freeze([Object.freeze({url:'https://one.example',slug:'one',visits:7})]),api=createApi(seed),other=createApi(seed),listed=api({method:'GET',path:'/api/links'});listed.body[0].visits=999;expect(api({method:'GET',path:'/api/links'}).body[0].visits).toBe(7);for(const path of ['/api/links/one/visit\\n','/api/links/one/visit?x','/api/links/ONE/visit'])expect(api({method:'POST',path}).status).toBe(404);expect(api({method:'POST',path:'/api/links/one/visit'}).body.visits).toBe(8);expect(other({method:'GET',path:'/api/links'}).body[0].visits).toBe(7);expect(seed[0].visits).toBe(7);});
`,
"react-fullstack-links-5": `const IO_PLANNER=false,IO_FULL=true,IO_ENDPOINT="/api/links",IO_EMPTY="No links";

const ioRTL=require('@testing-library/react'),ioQuery=v=>ioRTL.within(v.container);
const ioDeferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const ioFlush=async callback=>{await ioRTL.act(async()=>{callback();await Promise.resolve();});};
const ioRows=v=>ioQuery(v).queryAllByRole('listitem');
const ioReply=rows=>({ok:true,status:200,json:async()=>rows});
const ioLoading=v=>{expect(ioQuery(v).getByRole('status').textContent).toBe('Loading');expect(ioQuery(v).queryByText(IO_EMPTY,{exact:true})).toBeNull();};
const ioError=v=>{const node=ioQuery(v).getByRole('alert'),copy=node.cloneNode(true);copy.querySelectorAll('button').forEach(button=>button.remove());expect(copy.textContent.trim()).toBe('Request failed');};
const ioRecords=IO_PLANNER?[{id:31,name:'Literal <task>&',hours:1000,version:4},{id:107,name:'Zero task',hours:0,version:1},{id:203,name:'Third task',hours:9,version:2},{id:404,name:'Fourth task',hours:42,version:9}]:[{url:'https://one.example/<literal>&',slug:'one-long-slug',visits:1000},{url:'https://zero.example',slug:'zero',visits:0},{url:'https://three.example',slug:'constructor',visits:9},{url:'https://four.example',slug:'four',visits:42}];
const ioCheck=(v,records)=>{const rows=ioRows(v);expect(rows.length).toBe(records.length);for(let i=0;i<records.length;i++){const record=records[i],scope=ioRTL.within(rows[i]),label=IO_PLANNER?'hours '+record.name:'visits '+record.slug;expect(rows[i].textContent).toContain(IO_PLANNER?record.name:record.url);const output=scope.getByLabelText(label);expect(output.tagName).toBe('OUTPUT');expect(output.textContent).toBe(String(IO_PLANNER?record.hours:record.visits));if(!IO_PLANNER)expect(Boolean(scope.getByRole('button',{name:'Visit '+record.slug,exact:true}))).toBe(true);}expect(v.container.querySelector('task')).toBeNull();expect(v.container.querySelector('literal')).toBeNull();};

test('all supplied arbitrary records are rendered and the same transport does not load again on parent renders',async()=>{const pending=ioDeferred();const calls=[];const http=(url,options)=>{calls.push({url,method:options?.method||'GET'});return pending.promise;};const v=render(<App fetcher={http}/>);if(IO_FULL)ioLoading(v);expect(calls).toEqual([{url:IO_ENDPOINT,method:'GET'}]);v.rerender(<App fetcher={http}/>);expect(calls.length).toBe(1);await ioFlush(()=>pending.resolve(ioReply(ioRecords)));ioCheck(v,ioRecords);v.rerender(<App fetcher={http}/>);ioCheck(v,ioRecords);expect(calls.length).toBe(1);});
test('separate mounts keep their own successful answers and new default mounts use the authored seed',async()=>{const one=ioDeferred(),two=ioDeferred(),first=()=>one.promise,second=()=>two.promise;const a=render(<App fetcher={first}/>),b=render(<App fetcher={second}/>);await ioFlush(()=>two.resolve(ioReply(ioRecords.slice(1,3))));ioCheck(b,ioRecords.slice(1,3));await ioFlush(()=>one.resolve(ioReply(ioRecords.slice(0,1))));ioCheck(a,ioRecords.slice(0,1));ioCheck(b,ioRecords.slice(1,3));a.unmount();const fresh=render(<App/>);await ioRTL.waitFor(()=>expect(ioRows(fresh).length).toBe(IO_PLANNER?3:2),{timeout:500});expect(ioQuery(fresh).getByLabelText(IO_PLANNER?'hours Build login':'visits mdn').textContent).toBe(IO_PLANNER?'2':'3');ioCheck(b,ioRecords.slice(1,3));});

test('repeated rejected and non-ok list requests each allow a fresh retry and eventual empty recovery',async()=>{const requests=[ioDeferred(),ioDeferred(),ioDeferred(),ioDeferred()];let count=0;const calls=[];const http=(url,options)=>{calls.push({url,method:options?.method||'GET'});return requests[count++].promise;};const v=render(<App fetcher={http}/>);for(let i=0;i<3;i++){ioLoading(v);await ioFlush(()=>i===2?requests[i].reject('offline'):requests[i].resolve({ok:false,status:i===0?404:503,json:async()=>({error:'no'})}));ioError(v);expect(ioQuery(v).queryByRole('status')).toBeNull();expect(ioRows(v).length).toBe(0);expect(count).toBe(i+1);fireEvent.click(ioQuery(v).getByRole('button',{name:'Retry',exact:true}));expect(count).toBe(i+2);}ioLoading(v);await ioFlush(()=>requests[3].resolve(ioReply([])));expect(Boolean(ioQuery(v).getByText(IO_EMPTY,{exact:true}))).toBe(true);expect(ioQuery(v).queryByRole('alert')).toBeNull();expect(ioQuery(v).queryByRole('status')).toBeNull();expect(calls.every(call=>call.url===IO_ENDPOINT&&call.method==='GET')).toBe(true);});

test('a visit waits for its POST before reloading the complete authoritative list',async()=>{const api=createApi([{url:'https://custom.example',slug:'custom',visits:7}]),local=createLocalFetch(api),pending=ioDeferred(),calls=[];const http=(url,options)=>{const method=options?.method||'GET';calls.push({url,method});return method==='POST'?pending.promise:local(url,options);};const v=render(<App fetcher={http}/>);await ioRTL.waitFor(()=>expect(ioQuery(v).getByLabelText('visits custom').textContent).toBe('7'));fireEvent.click(ioQuery(v).getByRole('button',{name:'Visit custom',exact:true}));expect(calls).toEqual([{url:'/api/links',method:'GET'},{url:'/api/links/custom/visit',method:'POST'}]);expect(ioQuery(v).getByLabelText('visits custom').textContent).toBe('7');await ioFlush(()=>pending.resolve(local('/api/links/custom/visit',{method:'POST'})));await ioRTL.waitFor(()=>expect(ioQuery(v).getByLabelText('visits custom').textContent).toBe('8'));expect(calls).toEqual([{url:'/api/links',method:'GET'},{url:'/api/links/custom/visit',method:'POST'},{url:'/api/links',method:'GET'}]);});
test('default APIs are retained across renders and visits but stay isolated between mounted apps',async()=>{const a=render(<App/>),b=render(<App/>);await ioRTL.waitFor(()=>expect(ioQuery(a).getByLabelText('visits mdn').textContent).toBe('3'));await ioRTL.waitFor(()=>expect(ioQuery(b).getByLabelText('visits mdn').textContent).toBe('3'));for(const count of [4,5]){fireEvent.click(ioQuery(a).getByRole('button',{name:'Visit mdn',exact:true}));await ioRTL.waitFor(()=>expect(ioQuery(a).getByLabelText('visits mdn').textContent).toBe(String(count)));a.rerender(<App/>);expect(ioQuery(a).getByLabelText('visits mdn').textContent).toBe(String(count));expect(ioQuery(b).getByLabelText('visits mdn').textContent).toBe('3');}});

const ioFill=(v,label,value)=>fireEvent.change(ioQuery(v).getByRole('textbox',{name:label,exact:true}),{target:{value}});
const ioShorten=v=>fireEvent.click(ioQuery(v).getByRole('button',{name:'Shorten',exact:true}));
test('every failed submission retains both current fields and a later success clears them and reloads',async()=>{const api=createApi([]),local=createLocalFetch(api);let status=409,postCount=0,getCount=0;const http=(url,options)=>{if((options?.method||'GET')==='POST'&&url==='/api/links'){postCount++;if(status==='reject')return Promise.reject('offline');if(status===201)return local(url,options);return Promise.resolve({ok:false,status,json:async()=>({error:'failed'})});}getCount++;return local(url,options);};const v=render(<App fetcher={http}/>);await ioRTL.waitFor(()=>expect(Boolean(ioQuery(v).queryByText('No links',{exact:true}))).toBe(true));for(const [failure,message]of [[409,'Slug already taken'],[400,'Check the link and slug'],[503,'Request failed'],['reject','Request failed']]){status=failure;ioFill(v,'URL','https://different.example/path');ioFill(v,'Slug','different');const calls=getCount;ioShorten(v);await ioRTL.waitFor(()=>expect(ioQuery(v).getByRole('alert').textContent).toBe(message));expect(ioQuery(v).getByRole('textbox',{name:'URL',exact:true}).value).toBe('https://different.example/path');expect(ioQuery(v).getByRole('textbox',{name:'Slug',exact:true}).value).toBe('different');expect(ioQuery(v).getByRole('button',{name:'Shorten',exact:true}).disabled).toBe(false);expect(getCount).toBe(calls);}status=201;ioShorten(v);await ioRTL.waitFor(()=>expect(ioQuery(v).getByLabelText('visits different').textContent).toBe('0'));expect(ioQuery(v).getByRole('textbox',{name:'URL',exact:true}).value).toBe('');expect(ioQuery(v).getByRole('textbox',{name:'Slug',exact:true}).value).toBe('');expect(ioQuery(v).queryByRole('alert')).toBeNull();expect(api({method:'GET',path:'/api/links'}).body[0].url).toBe('https://different.example/path');expect(postCount).toBe(5);});

test('the retained link API keeps inherited normalization and frozen-seed ownership and exact routes',()=>{const owned={url:' https://custom.example ',slug:' CONSTRUCTOR '};Object.defineProperty(owned,'extra',{get(){throw Error('opaque extra');}});expect(normalizeLink(owned)).toEqual({url:'https://custom.example',slug:'constructor'});const factory=createApi([{url:'https://custom.example',slug:'constructor',visits:0}]),prototype=factory({method:'GET',path:'/api/links'}).body[0],inherited=factory({method:'GET',path:'/api/links'}).body[0];for(const key of Object.keys(inherited))delete inherited[key];inherited.__proto__=prototype;expect(Object.prototype.hasOwnProperty.call(inherited,'url')).toBe(false);expect(inherited.url).toBe('https://custom.example');expect(normalizeLink(inherited)).toEqual({url:'https://custom.example',slug:'constructor'});expect(factory({method:'GET',path:'/api/links'}).body[0].url).toBe('https://custom.example');const seed=Object.freeze([Object.freeze({url:'https://one.example',slug:'one',visits:7})]),api=createApi(seed),other=createApi(seed),listed=api({method:'GET',path:'/api/links'});listed.body[0].visits=999;expect(api({method:'GET',path:'/api/links'}).body[0].visits).toBe(7);for(const path of ['/api/links/one/visit\\n','/api/links/one/visit?x','/api/links/ONE/visit'])expect(api({method:'POST',path}).status).toBe(404);expect(api({method:'POST',path:'/api/links/one/visit'}).body.visits).toBe(8);expect(other({method:'GET',path:'/api/links'}).body[0].visits).toBe(7);expect(seed[0].visits).toBe(7);});
`,
};
for (const [id,cases] of Object.entries(LINK_CLIENT_REVIEW_CASES)) {
  const solution=FULLSTACK_PATH_SOLUTIONS[id];
  solution.hiddenSuite=[solution.hiddenSuite,cases].filter(Boolean).join("\n\n");
}
