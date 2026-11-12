<script setup lang="ts">
import CryptoWorkspace from './modules/crypto/CryptoWorkspace.vue'
import HttpWorkspace from './modules/http/HttpWorkspace.vue'
import { computed, onMounted, ref, watchEffect, watch } from 'vue'
import { modules } from '../../shared/modules'
import type { AppInfo, ModuleId } from '../../shared/contracts'
import type { StorageLocation, StorageLocationMode } from '../../shared/storage'
import { applyTheme, readTheme, saveTheme, themeOptions } from './theme'

const selected = ref<ModuleId | 'home'>('home')
const theme = ref(readTheme())
const themeSaveFailed = ref(false)
watchEffect(() => applyTheme(theme.value))
watch(theme, (value) => {
  themeSaveFailed.value = !saveTheme(value)
})
const info = ref<AppInfo>()
const error = ref('')
const storageLocation = ref<StorageLocation>()
const storageError = ref('')
const storageNotice = ref('')
const changingStorage = ref(false)
const httpBusy = ref(true)
const active = computed(() => modules.find((item) => item.id === selected.value))
onMounted(async () => {
  try { info.value = await window.desktop.getAppInfo() }
  catch { error.value = '无法读取应用信息，请重启应用。' }
})
onMounted(async () => {
  try {
    storageLocation.value = await window.desktop.storage.getLocation()
  } catch (e) {
    storageError.value = e instanceof Error ? e.message : String(e)
  }
})

async function changeStorageLocation(mode: StorageLocationMode) {
  if (!storageLocation.value || changingStorage.value || httpBusy.value) return
  changingStorage.value = true
  storageError.value = ''
  storageNotice.value = ''
  try {
    const result = await window.desktop.storage.changeLocation(mode)
    if (result && result.directory !== storageLocation.value.directory) {
      storageLocation.value = result
      storageNotice.value = '存储目录已切换。'
    }
  } catch (e) {
    storageError.value = e instanceof Error ? e.message : String(e)
  } finally {
    changingStorage.value = false
  }
}
</script>

<template>
  <div class="layout">
    <nav class="icon-rail" aria-label="应用导航">
      <button
        type="button"
        class="rail-button"
        :aria-current="selected === 'home' ? 'page' : undefined"
        aria-label="工作台"
        title="工作台"
        @click="selected = 'home'"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M4 9h16M10 9v11" />
        </svg>
      </button>
      <button type="button" class="rail-button" popovertarget="theme-panel" aria-label="外观设置" title="外观设置">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <div id="theme-panel" class="theme-panel" popover>
        <label for="theme-preference">外观</label>
        <select id="theme-preference" v-model="theme" autofocus>
          <option v-for="option in themeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
        <p v-if="themeSaveFailed" role="status">主题仅在本次运行中生效。</p>
      </div>
      <button type="button" class="rail-button" popovertarget="storage-panel" aria-label="存储设置" title="存储设置">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">
          <path d="M3.5 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" />
        </svg>
      </button>
      <section id="storage-panel" class="storage-panel" popover aria-labelledby="storage-title">
        <h2 id="storage-title">存储设置</h2>
        <template v-if="storageLocation">
          <p>当前目录<br />{{ storageLocation.directory }}</p>
          <div class="storage-actions">
            <button type="button" :disabled="httpBusy || changingStorage" @click="changeStorageLocation('choose')">选择目录</button>
            <button v-if="storageLocation.directory !== storageLocation.defaultDirectory" type="button" :disabled="httpBusy || changingStorage" @click="changeStorageLocation('default')">恢复默认</button>
          </div>
        </template>
        <p v-if="changingStorage" role="status">正在处理存储目录…</p>
        <p v-if="storageError" role="alert">{{ storageError }}</p>
        <p v-if="storageNotice" role="status">{{ storageNotice }}</p>
      </section>
    </nav>
    <main>
      <header class="workspace-header">
        <span class="brand">Alche Tools</span>
        <nav class="module-nav" aria-label="工具模块">
          <button
            v-for="item in modules"
            :key="item.id"
            type="button"
            :aria-current="selected === item.id ? 'page' : undefined"
            @click="selected = item.id"
          >{{ item.name }}</button>
        </nav>
      </header>
      <section v-if="!active" class="content">
        <p class="eyebrow">YOUR EVERYDAY DEV TOOLKIT</p>
        <h1>常用工具，一个工作台。</h1>
        <p class="intro">从日常工作出发，逐步构建属于你的开发工具箱。</p>
        <div class="cards">
          <button v-for="(item, index) in modules" :key="item.id" class="card" @click="selected = item.id">
            <span class="number">0{{ index + 1 }}</span><span class="tag">{{ item.status === 'ready' ? '可使用' : '待规划' }}</span>
            <h2>{{ item.name }}</h2><p>{{ item.description }}</p><span class="card-link">查看模块 →</span>
          </button>
        </div>
        <div class="note"><strong>从一个完整功能开始</strong><p>模块入口已准备好。HTTP 已支持请求调试与本地保存，加解密模块支持 MD5、DES、AES 和 JWT 解析。</p></div>
      </section>
      <HttpWorkspace
        v-show="selected === 'http'"
        :storage-directory="storageLocation?.directory"
        :changing-storage="changingStorage"
        @library-busy="httpBusy = $event"
      />
      <CryptoWorkspace v-if="selected === 'crypto'" /><section v-if="active && selected !== 'http' && selected !== 'crypto'" class="content">
        <p class="eyebrow">{{ active.id.toUpperCase() }} MODULE</p><h1>{{ active.name }}</h1><p class="intro">{{ active.description }}</p>
        <div class="placeholder"><span class="placeholder-icon">＋</span><h2>等待第一份模块需求</h2><p>这里已预留模块工作区，尚未实现连接或业务操作。</p><button class="back" @click="selected = 'home'">返回工作台</button></div>
      </section>
      <footer><span v-if="error" role="alert">{{ error }}</span><span v-else-if="info">桌面连接正常 · {{ info.platform }} · Electron {{ info.electron }} · Node {{ info.node }}</span><span v-else>正在连接桌面服务…</span><span v-if="info">v{{ info.version }}</span></footer>
    </main>
  </div>
</template>


