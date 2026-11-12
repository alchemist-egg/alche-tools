export type Encoding = 'utf8' | 'hex' | 'base64'
export interface CryptoRequest {
  algorithm: 'md5' | 'aes' | 'des' | 'jwt'
  operation: 'encrypt' | 'decrypt'
  input: string
  inputEncoding: Encoding
  outputEncoding: Encoding
  key: string
  keyEncoding: Encoding
  iv: string
  ivEncoding: Encoding
  mode: 'cbc' | 'ecb'
  padding: 'pkcs7' | 'none'
}
export type CryptoResult = { ok: true; output: string } | { ok: false; error: string }
export interface CryptoApi { transform(request: CryptoRequest): Promise<CryptoResult> }
