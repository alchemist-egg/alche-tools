import { createHash, createCipheriv, createDecipheriv, getCiphers } from 'node:crypto'
import type { CryptoRequest, CryptoResult, Encoding } from '../../../shared/crypto'

const MAX_INPUT = 256 * 1024
function decode(text: string, encoding: Encoding, label: string): Buffer {
  if (encoding === 'utf8') return Buffer.from(text, 'utf8')
  if (encoding === 'hex') {
    if (!/^(?:[0-9a-fA-F]{2})*$/.test(text)) throw new Error(`${label}必须为偶数位 Hex，不含空格或 0x 前缀`)
    return Buffer.from(text, 'hex')
  }
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text)) throw new Error(`${label}必须为标准 Base64（含所需的 = 填充）`)
  const bytes = Buffer.from(text, 'base64')
  if (bytes.toString('base64') !== text) throw new Error(`${label}不是规范 Base64`)
  return bytes
}
function encode(bytes: Buffer, encoding: Encoding): string {
  if (encoding !== 'utf8') return bytes.toString(encoding)
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes) }
  catch { throw new Error('结果不是有效 UTF-8，请改用 Hex 或 Base64 输出') }
}
function validate(value: unknown): CryptoRequest {
  if (!value || typeof value !== 'object') throw new Error('参数格式无效')
  const r = value as CryptoRequest
  if (!['md5','aes','des','jwt'].includes(r.algorithm) || !['encrypt','decrypt'].includes(r.operation) || !['cbc','ecb'].includes(r.mode) || !['pkcs7','none'].includes(r.padding)) throw new Error('算法、操作、模式或填充无效')
  for (const field of ['inputEncoding','outputEncoding','keyEncoding','ivEncoding'] as const) if (!['utf8','hex','base64'].includes(r[field])) throw new Error('编码无效')
  for (const field of ['input','key','iv'] as const) if (typeof r[field] !== 'string' || r[field].length > (field === 'input' ? MAX_INPUT * 4 : 1024)) throw new Error('输入或密钥字段过长或无效')
  return r
}
function parseJwt(token: string): string {
  const parts = token.trim().split('.')
  if (parts.length === 5) throw new Error('这是 JWE 加密令牌，当前只支持三段式 JWT 内容解析')
  if (parts.length !== 3 || !parts[0] || !parts[1]) throw new Error('JWT 必须包含 Header.Payload.Signature 三段')
  const decoded = parts.map((part, index) => {
    if (!/^[A-Za-z0-9_-]*$/.test(part) || part.length % 4 === 1) throw new Error('JWT 包含无效 Base64URL')
    const bytes = Buffer.from(part, 'base64url')
    if (bytes.toString('base64url') !== part) throw new Error('JWT 包含非规范 Base64URL')
    if (index === 2) return part
    let data: unknown
    try { data = JSON.parse(encode(bytes, 'utf8')) } catch { throw new Error('JWT Header 或 Payload 不是有效 UTF-8 JSON') }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('JWT Header 和 Payload 必须是 JSON 对象')
    return data
  })
  return JSON.stringify({ verification: '未验证签名；内容不代表可信身份或授权', header: decoded[0], payload: decoded[1], signature: decoded[2] }, null, 2)
}
export function transform(value: unknown): CryptoResult {
  try {
    const r = validate(value)
    if (r.algorithm === 'jwt') {
      if (Buffer.byteLength(r.input) > MAX_INPUT) throw new Error('JWT 超过 256 KiB 限制')
      return { ok: true, output: parseJwt(r.input) }
    }
    const input = decode(r.input, r.inputEncoding, '输入')
    if (input.length > MAX_INPUT) throw new Error('输入解码后超过 256 KiB 限制')
    if (r.algorithm === 'md5') {
      if (!['hex','base64'].includes(r.outputEncoding)) throw new Error('MD5 输出请选择 Hex 或 Base64')
      return { ok: true, output: createHash('md5').update(input).digest(r.outputEncoding as 'hex' | 'base64') }
    }
    const key = decode(r.key, r.keyEncoding, '密钥')
    const blockSize = r.algorithm === 'aes' ? 16 : 8
    if (r.algorithm === 'aes' ? ![16,24,32].includes(key.length) : key.length !== 8) throw new Error(r.algorithm === 'aes' ? 'AES 密钥必须是 16、24 或 32 字节，不进行密码派生' : 'DES 密钥必须是 8 字节，不进行密码派生')
    const iv = r.mode === 'cbc' ? decode(r.iv, r.ivEncoding, 'IV') : null
    if (iv && iv.length !== blockSize) throw new Error(`CBC IV 必须是 ${blockSize} 字节`)
    // E(K, D(K, E(K, plaintext))) equals single DES; use the maintained EDE primitive.
    const algorithm = r.algorithm === 'aes' ? `aes-${key.length * 8}-${r.mode}` : r.mode === 'cbc' ? 'des-ede3-cbc' : 'des-ede3'
    if (!getCiphers().includes(algorithm)) throw new Error('当前运行时不支持此算法')
    if ((r.operation === 'decrypt' || r.padding === 'none') && input.length % blockSize !== 0) throw new Error(`输入字节数必须为 ${blockSize} 的整数倍`)
    if (r.operation === 'decrypt' && r.padding === 'pkcs7' && !input.length) throw new Error('密文不能为空')
    const effectiveKey = r.algorithm === 'des' ? Buffer.concat([key,key,key]) : key
    const cipher = r.operation === 'encrypt' ? createCipheriv(algorithm, effectiveKey, iv) : createDecipheriv(algorithm, effectiveKey, iv)
    cipher.setAutoPadding(r.padding === 'pkcs7')
    let output: Buffer
    try { output = Buffer.concat([cipher.update(input), cipher.final()]) }
    catch { throw new Error('处理失败，请检查密钥、IV、密文、模式及填充是否一致') }
    return { ok: true, output: encode(output, r.outputEncoding) }
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : '处理失败' } }
}
