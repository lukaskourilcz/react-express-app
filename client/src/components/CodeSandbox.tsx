import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import { BRAND } from '../theme/MuiTheme';

type Language = 'javascript' | 'typescript' | 'python';

const SAMPLES: Record<Language, { label: string; code: string }[]> = {
  javascript: [
    {
      label: 'Closure puzzle',
      code: `for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log('var', i), 0);
}
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log('let', i), 0);
}`,
    },
    {
      label: 'Microtasks vs macrotasks',
      code: `console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
console.log('D');`,
    },
    {
      label: 'Spread on objects',
      code: `const a = { x: 1, y: 2 };
const b = { ...a, y: 3, z: 4 };
console.log(b);`,
    },
  ],
  typescript: [
    {
      label: 'Discriminated union',
      code: `type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function unwrap<T>(r: Result<T>): T {
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

console.log(unwrap({ ok: true, value: 42 }));
try { unwrap({ ok: false, error: 'boom' }); } catch (e) {
  console.log((e as Error).message);
}`,
    },
    {
      label: 'as const tuple',
      code: `const arr = [1, 'two', true] as const;
type Item = typeof arr[number];
const x: Item = 'two';
console.log(typeof arr[1], arr);`,
    },
    {
      label: 'Generic constraint',
      code: `function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const k of keys) out[k] = obj[k];
  return out;
}
console.log(pick({ a: 1, b: 2, c: 3 }, ['a', 'c']));`,
    },
  ],
  python: [
    {
      label: 'List comprehension',
      code: `xs = [1, 2, 3, 4, 5]
squares = [x*x for x in xs if x > 2]
print(squares)
print(sum(squares))`,
    },
    {
      label: 'Walrus operator',
      code: `numbers = [10, 20, 30, 40, 50]
if (n := len(numbers)) > 3:
    print(f"List has {n} items")
print(numbers[-1])`,
    },
    {
      label: 'Generator expression',
      code: `def fib():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

import itertools
print(list(itertools.islice(fib(), 10)))`,
    },
  ],
};

const PYODIDE_VERSION = '0.26.4';
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

// Persistent runner page. Pyodide loads on first Python run and stays
// resident across subsequent runs. JavaScript runs each time inside a
// fresh function scope (`new Function`), so global pollution is bounded
// even though the iframe itself is reused.
const RUNNER_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>
  (function(){
    const send = (msg) => parent.postMessage(msg, '*');
    const fmt = (v) => {
      if (v === undefined) return 'undefined';
      if (v === null) return 'null';
      if (typeof v === 'string') return v;
      if (typeof v === 'function') return v.toString();
      try { return JSON.stringify(v, (_, x) => typeof x === 'function' ? String(x) : x, 2); }
      catch(e) { return String(v); }
    };
    const log = (level) => function(...args){
      send({ type: 'log', level, line: args.map(fmt).join(' ') });
    };
    console.log = log('log');
    console.error = log('error');
    console.warn = log('warn');
    console.info = log('info');
    window.addEventListener('error', (e) => {
      send({ type: 'log', level: 'error', line: e.message || String(e) });
    });
    window.addEventListener('unhandledrejection', (e) => {
      send({ type: 'log', level: 'error', line: 'Unhandled rejection: ' + (e.reason && e.reason.message || e.reason) });
    });

    let pyodide = null;
    let pyodideLoading = null;

    async function loadPyodide() {
      if (pyodide) return pyodide;
      if (pyodideLoading) return pyodideLoading;
      pyodideLoading = (async () => {
        send({ type: 'pyodide_loading' });
        const tag = document.createElement('script');
        tag.src = ${JSON.stringify(PYODIDE_BASE)} + 'pyodide.js';
        await new Promise((resolve, reject) => {
          tag.onload = resolve;
          tag.onerror = () => reject(new Error('Failed to load Pyodide'));
          document.head.appendChild(tag);
        });
        pyodide = await window.loadPyodide({ indexURL: ${JSON.stringify(PYODIDE_BASE)} });
        pyodide.setStdout({ batched: (line) => send({ type: 'log', level: 'log', line }) });
        pyodide.setStderr({ batched: (line) => send({ type: 'log', level: 'error', line }) });
        send({ type: 'pyodide_ready' });
        return pyodide;
      })();
      return pyodideLoading;
    }

    async function runJs(code) {
      try {
        const fn = new Function(code);
        const out = fn();
        if (out !== undefined) send({ type: 'log', level: 'log', line: '⇒ ' + fmt(out) });
      } catch (err) {
        send({ type: 'log', level: 'error', line: err.message });
      } finally {
        send({ type: 'done' });
      }
    }

    async function runPython(code) {
      try {
        const py = await loadPyodide();
        const result = await py.runPythonAsync(code);
        if (result !== undefined && result !== null) {
          send({ type: 'log', level: 'log', line: '⇒ ' + String(result) });
        }
      } catch (err) {
        send({ type: 'log', level: 'error', line: err.message || String(err) });
      } finally {
        send({ type: 'done' });
      }
    }

    window.addEventListener('message', (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'run_js') runJs(e.data.code);
      else if (e.data.type === 'run_py') runPython(e.data.code);
    });

    send({ type: 'ready' });
  })();
<\/script></body></html>`;

interface LogLine {
  level: 'log' | 'warn' | 'error' | 'info';
  line: string;
}

const TIMEOUT_MS = 8000;

let sucraseTransformPromise: Promise<(code: string) => string> | null = null;

async function loadSucrase() {
  if (sucraseTransformPromise) return sucraseTransformPromise;
  sucraseTransformPromise = (async () => {
    const mod = await import('sucrase');
    return (code: string) =>
      mod.transform(code, { transforms: ['typescript', 'imports'] }).code;
  })();
  return sucraseTransformPromise;
}

function CodeSandbox() {
  const [language, setLanguage] = useState<Language>('javascript');
  const [code, setCode] = useState(SAMPLES.javascript[1].code);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const [pyodideStatus, setPyodideStatus] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [iframeReady, setIframeReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      const data = event.data as { type: string; level?: LogLine['level']; line?: string };
      if (data.type === 'log' && data.level && data.line !== undefined) {
        setLogs((prev) => [...prev, { level: data.level!, line: data.line! }]);
      } else if (data.type === 'done') {
        setRunning(false);
        if (timerRef.current) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      } else if (data.type === 'ready') {
        setIframeReady(true);
      } else if (data.type === 'pyodide_loading') {
        setPyodideStatus('loading');
      } else if (data.type === 'pyodide_ready') {
        setPyodideStatus('ready');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleLanguageChange = (next: Language) => {
    setLanguage(next);
    setCode(SAMPLES[next][0].code);
    setLogs([]);
  };

  const sendToIframe = (msg: { type: string; code: string }) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) {
      setLogs((prev) => [...prev, { level: 'error', line: 'Sandbox iframe not available' }]);
      setRunning(false);
      return;
    }
    iframe.contentWindow.postMessage(msg, '*');
  };

  const runJS = (jsCode: string) => {
    setLogs([]);
    setRunning(true);
    sendToIframe({ type: 'run_js', code: jsCode });
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setLogs((prev) => [...prev, { level: 'error', line: 'Execution timed out (8s).' }]);
      setRunning(false);
      // Reset the iframe to terminate runaway code; Pyodide must reload.
      const iframe = iframeRef.current;
      if (iframe) {
        iframe.srcdoc = RUNNER_HTML;
        setIframeReady(false);
        setPyodideStatus('idle');
      }
    }, TIMEOUT_MS);
  };

  const runTS = async () => {
    setLogs([]);
    setRunning(true);
    try {
      const transform = await loadSucrase();
      const compiled = transform(code);
      runJS(compiled);
    } catch (err) {
      setLogs([{ level: 'error', line: err instanceof Error ? err.message : 'Compile error' }]);
      setRunning(false);
    }
  };

  const runPython = () => {
    setLogs([]);
    setRunning(true);
    sendToIframe({ type: 'run_py', code });
    if (timerRef.current) window.clearTimeout(timerRef.current);
    // Python gets a longer window to allow cold-start Pyodide load.
    timerRef.current = window.setTimeout(() => {
      setLogs((prev) => [...prev, { level: 'error', line: 'Execution timed out.' }]);
      setRunning(false);
      const iframe = iframeRef.current;
      if (iframe) {
        iframe.srcdoc = RUNNER_HTML;
        setIframeReady(false);
        setPyodideStatus('idle');
      }
    }, 60_000);
  };

  const run = () => {
    if (running || !iframeReady) return;
    if (language === 'javascript') return runJS(code);
    if (language === 'typescript') return runTS();
    return runPython();
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto' }}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
        Code playground
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Run JavaScript, TypeScript, or Python in a sandboxed iframe. No network from your code, no
        access to the parent page, hard timeout. Console output is captured below.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 1.5 }}>
        <ToggleButtonGroup
          aria-label="Programming language"
          value={language}
          exclusive
          size="small"
          onChange={(_, v) => v && handleLanguageChange(v)}
        >
          <ToggleButton value="javascript" aria-label="JavaScript">JavaScript</ToggleButton>
          <ToggleButton value="typescript" aria-label="TypeScript">TypeScript</ToggleButton>
          <ToggleButton value="python" aria-label="Python">Python</ToggleButton>
        </ToggleButtonGroup>
        {language === 'python' && pyodideStatus === 'loading' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
            <CircularProgress size={14} />
            <Typography variant="caption">Loading Python runtime (~10MB)…</Typography>
          </Box>
        )}
        {language === 'python' && pyodideStatus === 'ready' && (
          <Chip size="small" label="Python ready" color="success" variant="outlined" />
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.5 }}>
        {SAMPLES[language].map((s) => (
          <Chip
            key={s.label}
            label={s.label}
            size="small"
            onClick={() => setCode(s.code)}
            clickable
          />
        ))}
      </Box>

      {language === 'python' && pyodideStatus === 'idle' && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          Python runs entirely inside the sandboxed iframe via Pyodide (WebAssembly). First run
          downloads ~10MB from a CDN; subsequent runs reuse the loaded runtime.
        </Alert>
      )}

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <Box
          component="textarea"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          aria-label={`${language} code`}
          sx={{
            display: 'block',
            width: '100%',
            minHeight: 240,
            p: 2,
            border: 0,
            outline: 'none',
            resize: 'vertical',
            fontFamily: '"SF Mono", Consolas, Monaco, monospace',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            backgroundColor: 'background.paper',
            color: 'text.primary',
            boxSizing: 'border-box',
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            {code.length} chars · iframe-sandboxed
          </Typography>
          <Button
            variant="contained"
            onClick={run}
            disabled={running || !iframeReady}
            sx={{
              backgroundColor: BRAND.green,
              '&:hover': { backgroundColor: BRAND.greenHover },
            }}
          >
            {!iframeReady ? 'Initialising…' : running ? 'Running…' : 'Run ▶'}
          </Button>
        </Box>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          mt: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          backgroundColor: '#1a1a1a',
          color: '#e5e5e5',
          fontFamily: '"SF Mono", Consolas, Monaco, monospace',
          fontSize: '0.82rem',
          minHeight: 120,
          p: 2,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
        aria-live="polite"
      >
        {logs.length === 0 && (
          <Typography variant="caption" sx={{ color: '#888' }}>
            Console output will appear here.
          </Typography>
        )}
        {logs.map((l, i) => (
          <div
            key={i}
            style={{
              color: l.level === 'error' ? '#fca5a5' : l.level === 'warn' ? '#fcd34d' : '#e5e5e5',
            }}
          >
            {l.line}
          </div>
        ))}
      </Paper>

      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        title="Code sandbox runner"
        srcDoc={RUNNER_HTML}
        style={{ display: 'none' }}
      />
    </Box>
  );
}

export default CodeSandbox;
