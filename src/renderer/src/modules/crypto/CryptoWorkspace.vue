<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CryptoRequest, Encoding } from '../../../../shared/crypto'
const form = ref<CryptoRequest>({ algorithm: 'md5', operation: 'encrypt', input: '', inputEncoding: 'utf8', outputEncoding: 'hex', key: '', keyEncoding: 'utf8', iv: '', ivEncoding: 'utf8', mode: 'cbc', padding: 'pkcs7' })
const output = ref(''), error = ref(''), busy = ref(false)
const symmetric = computed(() => ['aes','des'].includes(form.value.algorithm))
const encodings: { value: Encoding; label: string }[] = [{value:'utf8',label:'UTF-8 文本'},{value:'hex',label:'Hex'},{value:'base64',label:'Base64'}]
let revision = 0
watch(form, () => { revision++; output.value = ''; error.value = '' }, { deep: true, flush: 'sync' })
function defaults() {
  form.value.operation = 'encrypt'; form.value.inputEncoding = 'utf8'; form.value.outputEncoding = form.value.algorithm === 'md5' ? 'hex' : 'base64'
  form.value.key = ''; form.value.iv = ''; output.value = ''; error.value = ''
}
function changeOperation() {
  form.value.inputEncoding = form.value.operation === 'decrypt' ? 'base64' : 'utf8'
  form.value.outputEncoding = form.value.operation === 'decrypt' ? 'utf8' : 'base64'
}
async function run() {
  if (busy.value) return
  busy.value = true; output.value = ''; error.value = ''
  const current = revision
  try { const result = await window.desktop.crypto.transform(JSON.parse(JSON.stringify(form.value))); if (revision !== current) return; if (result.ok) output.value = result.output; else error.value = result.error }
  catch { if (revision === current) error.value = '桌面服务调用失败，请重试' } finally { busy.value = false }
}
function clear() { form.value.input = ''; form.value.key = ''; form.value.iv = ''; output.value = ''; error.value = '' }
function generateIv() {
  const bytes = crypto.getRandomValues(new Uint8Array(form.value.algorithm === 'aes' ? 16 : 8))
  form.value.ivEncoding = 'hex'; form.value.iv = Array.from(bytes, x => x.toString(16).padStart(2,'0')).join('')
}
</script>
<template>
  <section class="crypto-workspace">
    <h1>编码与加解密</h1><p class="hint">本机处理，不保存输入、密钥或结果。离开此模块会清空内容。</p>
    <div class="controls"><label>工具<select v-model="form.algorithm" :disabled="busy" @change="defaults"><option value="md5">MD5 摘要</option><option value="des">DES 加解密</option><option value="aes">AES 加解密</option><option value="jwt">JWT 解析</option></select></label><label v-if="symmetric">操作<select v-model="form.operation" :disabled="busy" @change="changeOperation"><option value="encrypt">加密</option><option value="decrypt">解密</option></select></label><label v-if="symmetric">模式<select v-model="form.mode"><option value="cbc">CBC</option><option value="ecb">ECB</option></select></label><label v-if="symmetric">填充<select v-model="form.padding"><option value="pkcs7">PKCS#7</option><option value="none">No Padding</option></select></label></div>
    <p v-if="form.algorithm === 'md5'" class="hint">MD5 是不可逆摘要，没有解密操作；不适合密码存储。</p>
    <p v-if="form.algorithm === 'des'" class="hint">DES 用于兼容旧系统，密钥必须为 8 字节。</p>
    <p v-if="form.algorithm === 'aes'" class="hint">AES 密钥为 16 / 24 / 32 字节，自动对应 128 / 192 / 256 位。这里使用原始密钥，不是口令派生。</p>
    <p v-if="symmetric" class="hint">CBC / ECB 不验证消息完整性。参数需与对端一致；CBC 加密请使用新的随机 IV，解密需填入原 IV。</p>
    <p v-if="form.algorithm === 'jwt'" class="jwt-warning">仅解析三段式 JWT Header / Payload，不验证签名和有效性，不支持 JWE 解密。</p>
    <div v-if="symmetric" class="secrets"><label>密钥<input v-model="form.key" type="password" autocomplete="off" spellcheck="false" placeholder="按所选编码填写原始密钥" /></label><label>密钥编码<select v-model="form.keyEncoding"><option v-for="e in encodings" :key="e.value" :value="e.value">{{ e.label }}</option></select></label><template v-if="form.mode === 'cbc'"><label>IV<input v-model="form.iv" autocomplete="off" spellcheck="false" :placeholder="`${form.algorithm === 'aes' ? 16 : 8} 字节`" /></label><label>IV 编码<select v-model="form.ivEncoding"><option v-for="e in encodings" :key="e.value" :value="e.value">{{ e.label }}</option></select></label><button v-if="form.operation === 'encrypt'" @click="generateIv">生成随机 IV</button></template></div>
    <div class="controls" v-if="form.algorithm !== 'jwt'"><label>输入编码<select v-model="form.inputEncoding"><option v-for="e in encodings" :key="e.value" :value="e.value">{{ e.label }}</option></select></label><label>输出编码<select v-model="form.outputEncoding"><option v-for="e in encodings.filter(e => form.algorithm !== 'md5' || e.value !== 'utf8')" :key="e.value" :value="e.value">{{ e.label }}</option></select></label></div>
    <label class="editor">{{ form.algorithm === 'jwt' ? 'JWT Token' : '输入' }}<textarea v-model="form.input" spellcheck="false" autocomplete="off" :maxlength="1048576" placeholder="输入待处理内容；Hex 和 Base64 不包含空格" /></label>
    <div class="controls"><button class="primary" :disabled="busy" @click="run">{{ busy ? '处理中…' : form.algorithm === 'jwt' ? '解析 JWT' : form.algorithm === 'md5' ? '计算 MD5' : form.operation === 'encrypt' ? '加密' : '解密' }}</button><button @click="clear">清空全部内容</button><span class="hint">解码后最大 256 KiB</span></div>
    <p v-if="error" class="error" role="alert">{{ error }}</p><label class="editor">结果<textarea :value="output" readonly spellcheck="false" placeholder="处理结果显示在这里，可选中复制" /></label>
  </section>
</template>
<style scoped>
.crypto-workspace{padding:28px 32px;max-width:1200px;width:100%;margin:0 auto}.crypto-workspace h1{font-size:26px}.hint{font-size:12px;color:var(--muted);line-height:1.8}.controls{display:flex;flex-wrap:wrap;align-items:end;gap:12px;margin:18px 0}label{display:flex;flex-direction:column;gap:7px;font-size:12px;color:var(--muted)}input,select,textarea,button{background:var(--surface);color:var(--text);border:1px solid var(--control-border);border-radius:6px;padding:10px;font:inherit;min-width:0}textarea{width:100%;min-height:160px;font:13px/1.6 Consolas,monospace;resize:vertical}input:focus,select:focus,textarea:focus{outline:1px solid var(--accent-border)}.secrets{display:grid;grid-template-columns:minmax(0,1fr) 160px;gap:14px;margin:20px 0}.secrets button{justify-self:start}button{font-size:13px}.primary{background:var(--primary);color:var(--on-primary);font-weight:600}button:disabled{opacity:.5;cursor:default}.editor{margin:16px 0}.error{color:var(--error);overflow-wrap:anywhere}.jwt-warning{border-left:3px solid var(--warning);padding:10px 14px;color:var(--warning);font-size:13px;line-height:1.8}
</style>
