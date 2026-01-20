import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import styleX from '@stylexjs/babel-plugin';
import path from 'path';
import { fileURLToPath } from 'url';
var __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
    plugins: [
        react({
            babel: {
                plugins: [
                    [
                        styleX,
                        {
                            dev: true,
                            genConditionalClasses: true,
                            treeshakeCompensation: true,
                            unstable_moduleResolution: {
                                type: 'commonJS',
                                rootDir: __dirname,
                            },
                        },
                    ],
                ],
            },
        }),
    ],
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
        },
    },
});
