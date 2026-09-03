import { defineConfig } from 'vite';

export default defineConfig({
    // Served from fastcomments.com/tmp_demos/canvas: assets must be relative.
    base: './',
    server: { port: 5175 },
});
