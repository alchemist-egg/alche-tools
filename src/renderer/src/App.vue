<script setup lang="ts">
import CryptoWorkspace from './modules/crypto/CryptoWorkspace.vue'
import HttpWorkspace from './modules/http/HttpWorkspace.vue'
import { computed, onMounted, ref } from 'vue'
import { modules } from '../../shared/modules'
import type { AppInfo, ModuleId } from '../../shared/contracts'

const selected = ref<ModuleId | 'home'>('home')
const info = ref<AppInfo>()
const error = ref('')
const active = computed(() => modules.find((item) => item.id === selected.value))
onMounted(async () => {
  try { info.value = await window.desktop.getAppInfo() }
  catch { error.value = '无法读取应用信息，请重启应用。' }
})
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
      <HttpWorkspace v-show="selected === 'http'" /><CryptoWorkspace v-if="selected === 'crypto'" /><section v-if="active && selected !== 'http' && selected !== 'crypto'" class="content">
        <p class="eyebrow">{{ active.id.toUpperCase() }} MODULE</p><h1>{{ active.name }}</h1><p class="intro">{{ active.description }}</p>
        <div class="placeholder"><span class="placeholder-icon">＋</span><h2>等待第一份模块需求</h2><p>这里已预留模块工作区，尚未实现连接或业务操作。</p><button class="back" @click="selected = 'home'">返回工作台</button></div>
      </section>
      <footer><span v-if="error" role="alert">{{ error }}</span><span v-else-if="info">桌面连接正常 · {{ info.platform }} · Electron {{ info.electron }} · Node {{ info.node }}</span><span v-else>正在连接桌面服务…</span><span v-if="info">v{{ info.version }}</span></footer>
    </main>
  </div>
</template>


