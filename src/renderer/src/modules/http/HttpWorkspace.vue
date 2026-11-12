<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, toRaw, watch } from 'vue'
import type { HttpRequest, HttpResponse } from '../../../../shared/http'
const blank = (): HttpRequest => ({ id: crypto.randomUUID(), name: '未命名请求', collection: '默认集合', method: 'GET', url: '', params: [], headers: [], bodyType: 'none', body: '', timeoutMs: 30000 })
const draft = ref(blank()), saved = ref<HttpRequest[]>([]), baseline = ref(JSON.stringify(draft.value))
const search = ref(''), tab = ref<'params' | 'headers' | 'body'>('params'), responseTab = ref<'body' | 'headers'>('body')
const response = ref<HttpResponse>(), error = ref(''), notice = ref(''), busy = ref(false), saving = ref(false), task = ref(''), pretty = ref(true)
const discardDialog = ref<HTMLDialogElement>()
const requestUrl = ref<HTMLInputElement>()
const props = defineProps<{ storageDirectory?: string; changingStorage: boolean }>()
const emit = defineEmits<{ 'library-busy': [busy: boolean] }>()
const loadingLibrary = ref(true)
const removing = ref(false)
const requestBusy = computed(() => busy.value || saving.value || removing.value || loadingLibrary.value)
const libraryBusy = computed(() => requestBusy.value || props.changingStorage)
watch(requestBusy, (value) => emit('library-busy', value), { immediate: true, flush: 'sync' })
let pendingRequest: HttpRequest | undefined
const dirty = computed(() => JSON.stringify(draft.value) !== baseline.value)
const filtered = computed(() => saved.value.filter(r => `${r.name} ${r.url} ${r.collection}`.toLowerCase().includes(search.value.toLowerCase())))
const groups = computed(() => [...new Set(filtered.value.map(r => r.collection || '默认集合'))])
const rows = computed(() => tab.value === 'headers' ? draft.value.headers : draft.value.params)
const bodyText = computed(() => { const text = response.value?.body ?? ''; if (pretty.value) { try { return JSON.stringify(JSON.parse(text), null, 2) } catch {} } return text })
function message(e: unknown) { error.value = e instanceof Error ? e.message : String(e) }
function open(r?: HttpRequest) {
  if (libraryBusy.value) return
  if (dirty.value) {
    pendingRequest = r
    discardDialog.value?.showModal()
    return
  }
  loadDraft(r)
}
function loadDraft(r?: HttpRequest) {
  draft.value = r ? structuredClone(toRaw(r)) : blank()
  baseline.value = JSON.stringify(draft.value)
  tab.value = 'params'
  responseTab.value = 'body'
  response.value = undefined
  error.value = ''
  notice.value = r ? '' : '已新建请求，填写后可发送或保存。'
  if (!r) requestUrl.value?.focus()
}
function confirmDiscard() {
  const request = pendingRequest
  discardDialog.value?.close()
  loadDraft(request)
}
function add() { rows.value.push({ enabled: true, key: '', value: '' }) }
async function save() {
  if (libraryBusy.value) return
  saving.value = true; error.value = ''; notice.value = ''
  const snapshot = JSON.parse(JSON.stringify(draft.value)) as HttpRequest
  if (!snapshot.name.trim()) { error.value = '请输入接口名称'; saving.value = false; return }
  try { saved.value = await window.desktop.http.save(snapshot); baseline.value = JSON.stringify(snapshot); notice.value = '已加密保存到本机' } catch (e) { message(e) } finally { saving.value = false }
}
async function remove(r: HttpRequest) {
  if (libraryBusy.value) return
  if (!window.confirm(`删除本地接口“${r.name}”？`)) return
  removing.value = true
  try { saved.value = await window.desktop.http.remove(r.id); if (draft.value.id === r.id) { draft.value = blank(); baseline.value = JSON.stringify(draft.value) } } catch (e) { message(e) }
  finally { removing.value = false }
}
watch(() => props.storageDirectory, async (directory, previous) => {
  if (!directory || !previous || directory === previous) return
  loadingLibrary.value = true
  saved.value = []
  search.value = ''
  error.value = ''
  notice.value = ''
  try {
    saved.value = await window.desktop.http.list()
  } catch (e) {
    message(e)
  } finally {
    if (dirty.value) {
      draft.value.id = crypto.randomUUID()
      notice.value = '未保存的编辑已保留为新草稿。'
    } else if (!saved.value.some(request => request.id === draft.value.id && JSON.stringify(request) === baseline.value)) {
      draft.value = blank()
      baseline.value = JSON.stringify(draft.value)
      response.value = undefined
    }
    loadingLibrary.value = false
  }
})
async function send() {
  if (busy.value || props.changingStorage || loadingLibrary.value) return
  busy.value = true; error.value = ''; notice.value = ''; response.value = undefined; task.value = crypto.randomUUID()
  try { const result = await window.desktop.http.execute(task.value, JSON.parse(JSON.stringify(draft.value))); if (result.ok) response.value = result.data; else error.value = result.error } catch (e) { message(e) } finally { busy.value = false; task.value = '' }
}
async function cancel() { try { await window.desktop.http.cancel(task.value) } catch (e) { message(e) } }
function beforeUnload(e: BeforeUnloadEvent) { if (dirty.value) { e.preventDefault(); e.returnValue = '' } }
onMounted(async () => {
  window.addEventListener('beforeunload', beforeUnload)
  try { saved.value = await window.desktop.http.list() } catch (e) { message(e) }
  finally { loadingLibrary.value = false }
})
onBeforeUnmount(() => { window.removeEventListener('beforeunload', beforeUnload); if (task.value) void cancel() })
</script>

<template>
  <section class="http-workspace">
    <dialog ref="discardDialog" class="discard-dialog" aria-labelledby="discard-title" @close="pendingRequest = undefined">
      <h2 id="discard-title">放弃未保存的修改？</h2>
      <p>继续操作将丢弃当前请求中尚未保存的修改。</p>
      <form method="dialog" class="dialog-actions">
        <button autofocus>继续编辑</button>
        <button type="button" class="primary" @click="confirmDiscard">放弃修改</button>
      </form>
    </dialog>
    <div class="request-library">
      <div class="http-heading"><h2>本地接口</h2><button :disabled="libraryBusy" @click="open()">＋ 新建</button></div>
      <input v-model="search" aria-label="搜索接口" placeholder="搜索名称、地址或集合" />
      <p v-if="!saved.length" class="muted">保存第一个请求，下次打开继续使用。</p>
      <div v-for="group in groups" :key="group"><h3>{{ group }}</h3>
        <div v-for="r in filtered.filter(x => (x.collection || '默认集合') === group)" :key="r.id" class="saved-row">
          <button class="saved-request" :class="{ chosen: r.id === draft.id }" :disabled="libraryBusy" @click="open(r)"><b>{{ r.method }}</b> {{ r.name }}</button>
          <button :disabled="libraryBusy" :aria-label="`删除 ${r.name}`" @click="remove(r)">×</button>
        </div>
      </div>
      <p class="muted">请求配置（含请求头与正文）通过系统加密存于本机。响应不保存。</p>
    </div>
    <div class="request-editor">
      <h1>HTTP 调试 <small>{{ dirty ? '未保存' : '' }}</small></h1>
      <div class="http-line"><input v-model="draft.name" aria-label="接口名称" placeholder="接口名称" /><input v-model="draft.collection" aria-label="集合名称" placeholder="集合名称" /><button :disabled="libraryBusy" @click="save">{{ saving ? '保存中…' : '保存接口' }}</button></div>
      <form class="http-line" @submit.prevent="send"><select v-model="draft.method" aria-label="请求方法"><option v-for="method in ['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS']" :key="method">{{ method }}</option></select><input ref="requestUrl" v-model="draft.url" aria-label="请求 URL" placeholder="https://api.example.com/users" required /><button v-if="!busy" class="primary" type="submit" :disabled="changingStorage || loadingLibrary">发送</button><button v-else type="button" @click="cancel">取消请求</button></form>
      <div class="http-tabs"><button v-for="t in (['params','headers','body'] as const)" :key="t" :class="{ chosen: tab === t }" @click="tab = t">{{ {params:'查询参数',headers:'请求头 / 认证',body:'请求体'}[t] }}</button><label class="timeout">超时(ms) <input v-model.number="draft.timeoutMs" type="number" min="100" max="120000" /></label></div>
      <div v-if="tab !== 'body'" class="pair-editor"><p v-if="tab === 'headers'" class="muted">Bearer Token：添加 Authorization，值为 Bearer &lt;token&gt;。</p><div v-for="(row,index) in rows" :key="index" class="http-line"><input v-model="row.enabled" type="checkbox" aria-label="启用此项" /><input v-model="row.key" aria-label="键" placeholder="Key" /><input v-model="row.value" aria-label="值" placeholder="Value" /><button aria-label="删除此项" @click="rows.splice(index,1)">×</button></div><button :disabled="rows.length >= 200" @click="add">＋ 添加一行</button></div>
      <div v-else><select v-model="draft.bodyType" aria-label="请求体格式"><option value="none">无请求体</option><option value="json">JSON</option><option value="text">Text</option><option value="form">x-www-form-urlencoded</option></select><p v-if="['GET','HEAD'].includes(draft.method)" class="muted">GET / HEAD 不发送请求体。</p><textarea v-if="draft.bodyType !== 'none'" v-model="draft.body" aria-label="请求体" spellcheck="false" :placeholder="draft.bodyType === 'form' ? 'name=Alice&tag=a&tag=b（请使用 URL 编码）' : '输入请求正文'" /></div>
      <p v-if="error" role="alert" class="http-error">{{ error }}</p><p v-if="notice" role="status" class="http-notice">{{ notice }}</p>
      <div class="response-area"><div class="http-heading"><h2>响应</h2><span v-if="response">{{ response.status }} {{ response.statusText }} · {{ response.durationMs }} ms · {{ response.size }} bytes</span></div><p v-if="busy" role="status" class="muted">正在发送请求…</p><p v-else-if="!response" class="muted">发送请求后在这里查看响应。最多读取 5 MB，不自动跟随重定向。</p><template v-if="response"><div class="http-tabs"><button @click="responseTab='body'">正文</button><button @click="responseTab='headers'">响应头</button><label><input v-model="pretty" type="checkbox" /> 格式化 JSON</label></div><pre v-if="responseTab === 'body'">{{ bodyText || '（空响应体）' }}</pre><dl v-else><template v-for="(row,i) in response.headers" :key="i"><dt>{{ row.key }}</dt><dd>{{ row.value }}</dd></template></dl></template></div>
    </div>
  </section>
</template>

<style scoped>
.discard-dialog {
  max-width: min(360px, 90vw);
  padding: 20px;
  border: 1px solid var(--control-border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
}
.discard-dialog::backdrop { background: rgb(0 0 0 / 45%); }
.discard-dialog p { color: var(--muted); font-size: 13px; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; }
.http-workspace{display:flex;flex:1;min-width:0}.request-library{width:245px;flex-shrink:0;padding:20px 16px;border-right:1px solid var(--divider)}.request-editor{padding:24px;min-width:0;flex:1}h1{font-size:24px}h1 small{font-size:12px;color:var(--warning)}h2{font-size:15px}h3{font-size:12px;color:var(--muted);margin-top:24px}.http-heading,.http-line,.http-tabs{display:flex;gap:8px;align-items:center;margin-bottom:12px}.http-heading{justify-content:space-between;flex-wrap:wrap}.http-heading span{font-size:12px;color:var(--accent)}input,select,textarea,button{background:var(--surface);color:var(--text);border:1px solid var(--control-border);border-radius:5px;padding:8px;font:inherit;font-size:12px;min-width:0}input:not([type=checkbox]){width:100%}.http-line input:not([type=checkbox]){flex:1}.http-line button,.http-line select{flex-shrink:0}button:hover{border-color:var(--accent-border)}button:disabled{opacity:.5;cursor:default}.primary{background:var(--primary);color:var(--on-primary);font-weight:bold}.chosen{background:var(--accent-surface);color:var(--accent)}.http-tabs{flex-wrap:wrap;border-bottom:1px solid var(--divider);padding:10px 0}.timeout{margin-left:auto;font-size:11px}.timeout input{max-width:90px}.muted{color:var(--muted);font-size:12px;line-height:1.8}.saved-row{display:flex;gap:4px;margin-bottom:6px}.saved-request{text-align:left;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.saved-request b{color:var(--accent);font-size:10px}.pair-editor{min-height:140px}textarea{display:block;width:100%;min-height:200px;resize:vertical;margin-top:10px;font-family:Consolas,monospace}pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:450px;overflow:auto;background:var(--inset);padding:16px;font-size:12px}dl{font-size:12px;overflow-wrap:anywhere}dt{color:var(--accent)}dd{margin:4px 0 12px}.response-area{margin-top:24px;border-top:1px solid var(--control-border);padding-top:12px}.http-error{color:var(--error);overflow-wrap:anywhere}.http-notice{color:var(--accent)}@media(max-width:1100px){.http-workspace{flex-direction:column}.request-library{width:auto;border-right:0;border-bottom:1px solid var(--divider);max-height:240px;overflow:auto}}
</style>

