import { createGunzip, createInflate, createBrotliDecompress } from 'node:zlib'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { performance } from 'node:perf_hooks'
import type { HttpRequest, HttpResult, Pair } from '../../../shared/http'
const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
export function validate(value: unknown): HttpRequest {
  if (!value || typeof value !== 'object') throw new Error('请求格式无效')
  const r = value as HttpRequest
  for (const key of ['id', 'name', 'collection', 'url', 'body'] as const) {
    if (typeof r[key] !== 'string' || r[key].length > (key === 'body' ? 1024 * 1024 : 8192)) throw new Error('请求字段无效或过长')
  }
  if (!r.id || !methods.includes(r.method) || !['none', 'json', 'text', 'form'].includes(r.bodyType)) throw new Error('请求类型无效')
  if (!Number.isInteger(r.timeoutMs) || r.timeoutMs < 100 || r.timeoutMs > 120000) throw new Error('超时必须在 100–120000 毫秒之间')
  for (const rows of [r.headers, r.params]) {
    if (!Array.isArray(rows) || rows.length > 200) throw new Error('参数过多')
    for (const p of rows) if (!p || typeof p.enabled !== 'boolean' || typeof p.key !== 'string' || typeof p.value !== 'string' || p.key.length > 8192 || p.value.length > 32768) throw new Error('参数格式无效')
  }
  return structuredClone(r)
}
export async function execute(input: HttpRequest, signal: AbortSignal): Promise<HttpResult> {
  const started = performance.now()
  try {
    const r = validate(input)
    const url = new URL(r.url)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('仅支持 HTTP/HTTPS；认证请使用 Authorization 请求头')
    for (const p of r.params) if (p.enabled && p.key) url.searchParams.append(p.key, p.value)
    const headers: string[] = []
    for (const p of r.headers) if (p.enabled && p.key) headers.push(p.key, p.value)
    if (!r.headers.some(p => p.enabled && p.key.toLowerCase() === 'host')) headers.push('Host', url.host)
    const body = r.bodyType === 'none' || ['GET', 'HEAD'].includes(r.method) ? '' : r.body
    if (r.bodyType === 'json' && body) JSON.parse(body)
    if (body && !r.headers.some(p => p.enabled && p.key.toLowerCase() === 'content-type')) headers.push('Content-Type', ({ json: 'application/json', text: 'text/plain; charset=utf-8', form: 'application/x-www-form-urlencoded' } as Record<string, string>)[r.bodyType])
    if (r.headers.some(p => p.enabled && ['content-length', 'transfer-encoding'].includes(p.key.toLowerCase()))) throw new Error('Content-Length 和 Transfer-Encoding 由客户端自动管理')
    if (body) headers.push('Content-Length', String(Buffer.byteLength(body)))
    return await new Promise<HttpResult>((resolve) => {
      let timer: ReturnType<typeof setTimeout>
      const finish = (result: HttpResult) => { clearTimeout(timer); resolve(result) }
      const req = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, { method: r.method, headers, signal }, res => {
        const chunks: Buffer[] = []; let size = 0
        const encoding = res.headers['content-encoding']
        const decoder = encoding === 'gzip' ? createGunzip() : encoding === 'deflate' ? createInflate() : encoding === 'br' ? createBrotliDecompress() : undefined
        const stream = decoder ? res.pipe(decoder) : res
        res.on('error', () => { decoder?.destroy(); req.destroy(new Error('响应读取中断')) })
        stream.on('error', () => { req.destroy(new Error('响应读取或解压失败')) })
        stream.on('data', (chunk: Buffer) => {
          size += chunk.length
          if (size > 5 * 1024 * 1024) { decoder?.destroy(); req.destroy(new Error('响应超过 5 MB 限制')); return }
          chunks.push(chunk)
        })
        res.on('error', () => finish({ ok: false, error: '响应读取中断' }))
        stream.on('end', () => {
          const pairs: Pair[] = []
          for (let i = 0; i < res.rawHeaders.length; i += 2) pairs.push({ enabled: true, key: res.rawHeaders[i], value: res.rawHeaders[i + 1] })
          finish({ ok: true, data: { status: res.statusCode ?? 0, statusText: res.statusMessage ?? '', headers: pairs, body: Buffer.concat(chunks).toString('utf8'), size, durationMs: Math.round(performance.now() - started), url: url.href } })
        })
      })
      timer = setTimeout(() => req.destroy(new Error('请求超时')), r.timeoutMs)
      req.on('error', (error) => finish({ ok: false, error: signal.aborted ? '请求已取消' : error.message }))
      req.end(body || undefined)
    })
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : '请求失败' } }
}

