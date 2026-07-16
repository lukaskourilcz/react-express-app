var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { PurgeCSS } from 'purgecss';
// `ANALYZE=true npm run build` emits a treemap of the bundle to
// dist/bundle-stats.html (open it to inspect the MUI/router/app split) plus a
// machine-readable dist/bundle-stats.json. No effect on a normal build.
var analyze = process.env.ANALYZE === 'true';
// Astryx ships ONE monolithic astryx.css covering ~100 components while the
// app imports ~40, and CSS has no per-component entry to import selectively.
// This post-build pass purges the emitted stylesheet against the emitted,
// tree-shaken JS — the exact class names that actually ship — so unused
// component styles are dropped without guessing at the source level.
// StyleX class names appear as literal strings in the bundle, which is what
// makes this safe; keyframes/font-faces/CSS variables are kept wholesale.
function purgeAstryxCss() {
    return {
        name: 'purge-astryx-css',
        apply: 'build',
        enforce: 'post',
        closeBundle: function () {
            return __awaiter(this, void 0, void 0, function () {
                var outDir, assetsDir, files, cssFiles, content, _i, cssFiles_1, cssFile, cssPath, before, result, after;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            outDir = path.resolve(__dirname, 'dist');
                            assetsDir = path.join(outDir, 'assets');
                            return [4 /*yield*/, readdir(assetsDir)];
                        case 1:
                            files = _a.sent();
                            cssFiles = files.filter(function (f) { return f.endsWith('.css'); });
                            content = __spreadArray([
                                path.join(outDir, 'index.html')
                            ], files.filter(function (f) { return f.endsWith('.js'); }).map(function (f) { return path.join(assetsDir, f); }), true);
                            _i = 0, cssFiles_1 = cssFiles;
                            _a.label = 2;
                        case 2:
                            if (!(_i < cssFiles_1.length)) return [3 /*break*/, 7];
                            cssFile = cssFiles_1[_i];
                            cssPath = path.join(assetsDir, cssFile);
                            return [4 /*yield*/, readFile(cssPath, 'utf8')];
                        case 3:
                            before = (_a.sent()).length;
                            return [4 /*yield*/, new PurgeCSS().purge({
                                    content: content,
                                    css: [cssPath],
                                    // Keep everything that isn't provably unused:
                                    variables: false, // custom properties pass through untouched
                                    keyframes: false, // all @keyframes kept (some are toggled at runtime)
                                    fontFace: false, // all @font-face kept
                                    safelist: {
                                        standard: [/^ss-/, /^rm-/, /^quiz-/, /^devshark/, 'html', 'body'],
                                        // Attribute/state selectors composed at runtime.
                                        greedy: [/data-theme/, /data-color-mode/, /data-selected/, /data-active/, /data-tone/, /data-locked/, /data-complete/],
                                    },
                                })];
                        case 4:
                            result = (_a.sent())[0];
                            return [4 /*yield*/, writeFile(cssPath, result.css)];
                        case 5:
                            _a.sent();
                            after = result.css.length;
                            this.info("purge-astryx-css: ".concat(cssFile, " ").concat((before / 1024).toFixed(1), "kB -> ").concat((after / 1024).toFixed(1), "kB"));
                            _a.label = 6;
                        case 6:
                            _i++;
                            return [3 /*break*/, 2];
                        case 7: return [2 /*return*/];
                    }
                });
            });
        },
    };
}
export default defineConfig({
    plugins: __spreadArray([
        react(),
        purgeAstryxCss()
    ], (analyze
        ? [
            visualizer({ filename: 'dist/bundle-stats.html', template: 'treemap', gzipSize: true, brotliSize: true }),
            visualizer({ filename: 'dist/bundle-stats.json', template: 'raw-data', gzipSize: true }),
        ]
        : []), true),
    server: {
        port: 3000,
        // For local dev, run `vercel dev` from the repo root which serves the
        // client + api/ routes together. Plain `vite` is fine if you don't need
        // the API.
    },
    build: {
        target: 'es2020',
        // 'hidden' still emits .map files (for Sentry/source-map tooling) but
        // strips the //# sourceMappingURL comment so browsers don't fetch them
        // for end users.
        sourcemap: 'hidden',
        chunkSizeWarningLimit: 500,
        rollupOptions: {
            output: {
                manualChunks: {
                    // React core in its own long-lived chunk. (The app is now MUI-free —
                    // the old combined `mui` chunk is gone.) `react-dom/client` must be
                    // listed explicitly: the app only imports the subpath (createRoot),
                    // and the bare `react-dom` entry alone never matches it — the
                    // renderer was silently landing in the main app chunk and getting
                    // re-downloaded on every deploy.
                    react: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
                    router: ['react-router-dom'],
                    tanstack: ['@tanstack/react-query', '@tanstack/query-core'],
                    supabase: ['@supabase/supabase-js'],
                    // Note: `motion` and `posthog-js` are intentionally NOT pinned to a
                    // manual chunk. Motion's heavy DOM-animation features are loaded via a
                    // dynamic import (lib/motion) and posthog-js via another (lib/analytics);
                    // forcing either into a manualChunk would pull the whole package into
                    // the initial graph and defeat that lazy code-splitting.
                },
            },
        },
    },
});
