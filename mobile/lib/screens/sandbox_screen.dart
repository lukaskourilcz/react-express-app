import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../theme.dart';

enum _Lang { javascript, typescript, python }

const _samples = <_Lang, List<({String label, String code})>>{
  _Lang.javascript: [
    (label: 'Closure puzzle', code: '''for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log('var', i), 0);
}
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log('let', i), 0);
}'''),
    (label: 'Microtasks vs macrotasks', code: '''console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
console.log('D');'''),
  ],
  _Lang.typescript: [
    (label: 'Discriminated union', code: '''type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function unwrap<T>(r: Result<T>): T {
  if (!r.ok) throw new Error(r.error);
  return r.value;
}
console.log(unwrap({ ok: true, value: 42 }));'''),
  ],
  _Lang.python: [
    (label: 'List comprehension', code: '''xs = [1, 2, 3, 4, 5]
squares = [x*x for x in xs if x > 2]
print(squares)
print(sum(squares))'''),
    (label: 'Generator', code: '''def fib():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

import itertools
print(list(itertools.islice(fib(), 10)))'''),
  ],
};

class SandboxScreen extends StatefulWidget {
  const SandboxScreen({super.key});

  @override
  State<SandboxScreen> createState() => _SandboxScreenState();
}

class _SandboxScreenState extends State<SandboxScreen> {
  late final WebViewController _wv;
  _Lang _lang = _Lang.javascript;
  late final TextEditingController _editor;
  bool _ready = false;
  bool _running = false;
  String _pyodideStatus = 'idle'; // idle | loading | ready

  @override
  void initState() {
    super.initState();
    _editor = TextEditingController(text: _samples[_Lang.javascript]!.first.code);

    _wv = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF1A1A1A))
      ..addJavaScriptChannel(
        'SandboxBridge',
        onMessageReceived: (msg) => _onMessage(msg.message),
      );
    _loadHtml();
  }

  Future<void> _loadHtml() async {
    final html = await rootBundle.loadString('assets/sandbox_runner.html');
    // Use a non-null base URL so fetch() / dynamic <script src=…> work in
    // the WebView and the parent has predictable origin headers.
    await _wv.loadHtmlString(html, baseUrl: 'https://devquiz.local/sandbox');
  }

  void _onMessage(String raw) {
    try {
      final msg = jsonDecode(raw) as Map<String, dynamic>;
      switch (msg['type']) {
        case 'ready':
          setState(() => _ready = true);
          break;
        case 'pyodide_loading':
          setState(() => _pyodideStatus = 'loading');
          break;
        case 'pyodide_ready':
          setState(() => _pyodideStatus = 'ready');
          break;
        case 'done':
          setState(() => _running = false);
          break;
      }
    } catch (_) {
      // ignore non-JSON noise
    }
  }

  void _changeLang(_Lang lang) {
    setState(() {
      _lang = lang;
      _editor.text = _samples[lang]!.first.code;
    });
  }

  Future<void> _run() async {
    if (!_ready || _running) return;
    setState(() => _running = true);
    final code = _editor.text;
    final encoded = jsonEncode(code);
    final fn = switch (_lang) {
      _Lang.javascript => 'runJs',
      _Lang.typescript => 'runTs',
      _Lang.python => 'runPython',
    };
    await _wv.runJavaScript('$fn($encoded);');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Code playground')),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(children: [
                SegmentedButton<_Lang>(
                  segments: const [
                    ButtonSegment(value: _Lang.javascript, label: Text('JS')),
                    ButtonSegment(value: _Lang.typescript, label: Text('TS')),
                    ButtonSegment(value: _Lang.python, label: Text('Py')),
                  ],
                  selected: {_lang},
                  onSelectionChanged: (s) => _changeLang(s.first),
                ),
                const Spacer(),
                if (_lang == _Lang.python && _pyodideStatus == 'loading')
                  const Row(mainAxisSize: MainAxisSize.min, children: [
                    SizedBox(
                        width: 12,
                        height: 12,
                        child: CircularProgressIndicator(strokeWidth: 2)),
                    SizedBox(width: 6),
                    Text('Loading…', style: TextStyle(fontSize: 11)),
                  ]),
              ]),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: SizedBox(
                height: 36,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _samples[_lang]!.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 6),
                  itemBuilder: (_, i) {
                    final s = _samples[_lang]![i];
                    return ActionChip(
                      label: Text(s.label),
                      onPressed: () => setState(() => _editor.text = s.code),
                    );
                  },
                ),
              ),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFFE5E5E5)),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: TextField(
                  controller: _editor,
                  maxLines: 8,
                  style: const TextStyle(
                    fontFamily: 'Menlo',
                    fontSize: 13,
                    height: 1.4,
                  ),
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.all(12),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: Row(children: [
                if (_lang == _Lang.python && _pyodideStatus == 'idle')
                  Expanded(
                    child: Text(
                      'First Python run downloads ~10MB of Pyodide.',
                      style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                    ),
                  )
                else
                  const Spacer(),
                ElevatedButton(
                  onPressed: !_ready || _running ? null : _run,
                  child: Text(!_ready
                      ? 'Initialising…'
                      : _running
                          ? 'Running…'
                          : 'Run ▶'),
                ),
              ]),
            ),
            const Divider(height: 1),
            Expanded(
              child: WebViewWidget(controller: _wv),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _editor.dispose();
    super.dispose();
  }
}
