import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [react()],
    base: './',
    build: {
        outDir: 'build',
        rolldownOptions: {
            input: {
                index_m: resolve(import.meta.dirname, 'index_m.html'),
                tab_m: resolve(import.meta.dirname, 'tab_m.html'),
            },
        },
    },
    server: {
        port: 3000,
    },
});
