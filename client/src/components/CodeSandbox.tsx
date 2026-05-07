import { useEffect, useRef, useState } from 'react';
import { Box, Button, Paper, Typography, Chip } from '@mui/material';
import { BRAND } from '../theme/MuiTheme';

const SAMPLES: { label: string; code: string }[] = [
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
  {
    label: 'Array methods',
    code: `const xs = [1, 2, 3, 4, 5];
const result = xs.filter(n => n > 2).map(n => n * n).reduce((a, b) => a + b, 0);
console.log(result);`,
  },
];

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
      send({ type: 'log', level: 'error', line: e.message });
    });
    window.addEventListener('unhandledrejection', (e) => {
      send({ type: 'log', level: 'error', line: 'Unhandled rejection: ' + (e.reason && e.reason.message || e.reason) });
    });
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'run') {
        try {
          // eslint-disable-next-line no-new-func
          const fn = new Function(e.data.code);
          const out = fn();
          if (out !== undefined) send({ type: 'log', level: 'log', line: '⇒ ' + fmt(out) });
        } catch (err) {
          send({ type: 'log', level: 'error', line: err.message });
        } finally {
          send({ type: 'done' });
        }
      }
    });
    send({ type: 'ready' });
  })();
<\/script></body></html>`;

interface LogLine {
  level: 'log' | 'warn' | 'error' | 'info';
  line: string;
}

const TIMEOUT_MS = 2000;

function CodeSandbox() {
  const [code, setCode] = useState(SAMPLES[1].code);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      const { type, level, line } = event.data as { type: string; level?: LogLine['level']; line?: string };
      if (type === 'log' && level && line !== undefined) {
        setLogs((prev) => [...prev, { level, line }]);
      } else if (type === 'done') {
        setRunning(false);
        if (timerRef.current) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const run = () => {
    setLogs([]);
    setRunning(true);
    // Recreate iframe on every run to get a clean global scope.
    const iframe = iframeRef.current;
    if (!iframe) {
      setRunning(false);
      return;
    }
    iframe.srcdoc = RUNNER_HTML;
    const onLoad = () => {
      iframe.contentWindow?.postMessage({ type: 'run', code }, '*');
      iframe.removeEventListener('load', onLoad);
    };
    iframe.addEventListener('load', onLoad);

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setLogs((prev) => [...prev, { level: 'error', line: 'Execution timed out (2s).' }]);
      setRunning(false);
      // Force-reset the iframe to terminate any runaway code.
      if (iframe) iframe.srcdoc = '';
    }, TIMEOUT_MS);
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto' }}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
        Code playground
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Run JavaScript snippets in a sandboxed iframe. No network, no storage,
        2-second timeout. Console output is captured below.
      </Typography>

      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.5 }}>
        {SAMPLES.map((s) => (
          <Chip
            key={s.label}
            label={s.label}
            size="small"
            onClick={() => setCode(s.code)}
            clickable
          />
        ))}
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <Box
          component="textarea"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          aria-label="JavaScript code"
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
            disabled={running}
            sx={{
              backgroundColor: BRAND.green,
              '&:hover': { backgroundColor: BRAND.greenHover },
            }}
          >
            {running ? 'Running…' : 'Run ▶'}
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
          <div key={i} style={{ color: l.level === 'error' ? '#fca5a5' : l.level === 'warn' ? '#fcd34d' : '#e5e5e5' }}>
            {l.line}
          </div>
        ))}
      </Paper>

      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        title="Code sandbox runner"
        style={{ display: 'none' }}
      />
    </Box>
  );
}

export default CodeSandbox;
