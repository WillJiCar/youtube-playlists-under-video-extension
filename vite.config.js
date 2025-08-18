import { defineConfig } from "vite";
import react from '@vitejs/plugin-react'
import { resolve } from "path"

export default defineConfig(async () => {

    const { viteStaticCopy } = await import('vite-plugin-static-copy');
    
    return {
        plugins: [react(), viteStaticCopy({
            targets: [
            {
                src: 'manifest.json', // this allows web-ext run to load from the dist folder correctly
                dest: './'
            },
            {
                src: "config.json",
                dest: "./"
            }
        ]
        })],
        root: ".",
        build: {
            outDir: "dist",
            rollupOptions: {
                input: {
                    popup: resolve(__dirname, "src/popup/popup.html"),
                    bg: resolve(__dirname, "src/bg.html")
                }
            }
        }
}});
