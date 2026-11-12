// Run after build: electron scripts/smoke.cjs
const { app } = require('electron')
const assert = require('node:assert/strict')
const { join } = require('node:path')

const timeout = setTimeout(() => {
  console.error('Desktop smoke test timed out')
  app.exit(1)
}, 20000)

app.on('browser-window-created', (_event, window) => {
  window.hide()
  window.webContents.once('did-finish-load', async () => {
    try {
      const result = await window.webContents.executeJavaScript(`(async () => {
        const info = await window.desktop.getAppInfo();
        const buttons = Array.from(document.querySelectorAll('nav button'));
        const titles = [];
        for (const button of buttons.slice(1)) {
          button.click();
          await new Promise(resolve => setTimeout(resolve, 30));
          titles.push(document.querySelector('h1')?.textContent);
        }
        buttons[0].click();
        await new Promise(resolve => setTimeout(resolve, 30));
        return { info, titles, cards: document.querySelectorAll('.card').length,
          nodeExposed: typeof window.require !== 'undefined' };
      })()`)
      assert.equal(result.info.name, 'Alche Tools')
      assert.deepEqual(result.titles, ['HTTP 调试', 'Kafka', 'Redis', '编码与加解密'])
      assert.equal(result.cards, 4)
      assert.equal(result.nodeExposed, false)
      console.log('PASS: packaged renderer, preload IPC, module navigation, Node isolation')
      clearTimeout(timeout)
      app.exit(0)
    } catch (error) {
      console.error(error)
      clearTimeout(timeout)
      app.exit(1)
    }
  })
})

require(join(__dirname, '../out/main/index.js'))
