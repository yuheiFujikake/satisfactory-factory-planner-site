import { defineConfig } from 'vite'
import { renderFile } from 'pug'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

const pugEntry = resolve(__dirname, 'src/pug/index.pug')
const htmlOutput = resolve(__dirname, 'index.html')

function compilePugToHtml() {
  try {
    const html = renderFile(pugEntry, { pretty: false, basedir: resolve(__dirname, 'src/pug') })
    writeFileSync(htmlOutput, html)
  } catch (e) {
    console.error('[pug] Compilation error:', e)
  }
}

function pugPlugin() {
  return {
    name: 'pug-compiler',
    buildStart() {
      compilePugToHtml()
    },
    configureServer(server: any) {
      server.watcher.add('src/pug/**/*.pug')
      server.watcher.on('change', (file: string) => {
        if (file.endsWith('.pug')) {
          compilePugToHtml()
          server.ws.send({ type: 'full-reload' })
        }
      })
    },
  }
}

export default defineConfig({
  base: '/satisfactory-factory-planner-site/',
  plugins: [pugPlugin()],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
})
