// Pure local unit tests. Does not launch Electron or access the network.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const ts = require('typescript')
const source = readFileSync(join(__dirname, '../src/main/modules/crypto/service.ts'), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const moduleExports = {}
new Function('require', 'exports', compiled)(require, moduleExports)
const { transform } = moduleExports
const base = { algorithm: 'aes', operation: 'encrypt', input: '', inputEncoding: 'hex', outputEncoding: 'hex', key: '', keyEncoding: 'hex', iv: '', ivEncoding: 'hex', mode: 'ecb', padding: 'none' }
function run(overrides) { return transform({ ...base, ...overrides }) }
function output(overrides) { const r = run(overrides); assert.equal(r.ok, true, r.error); return r.output }
test('MD5 RFC 1321 empty and abc vectors', () => {
  assert.equal(output({algorithm:'md5'}), 'd41d8cd98f00b204e9800998ecf8427e')
  assert.equal(output({algorithm:'md5',input:'abc',inputEncoding:'utf8'}), '900150983cd24fb0d6963f7d28e17f72')
})
test('AES FIPS 197 ECB vectors, all key sizes, both directions', () => {
  const plaintext = '00112233445566778899aabbccddeeff'
  const vectors = [
    ['000102030405060708090a0b0c0d0e0f','69c4e0d86a7b0430d8cdb78070b4c55a'],
    ['000102030405060708090a0b0c0d0e0f1011121314151617','dda97ca4864cdfe06eaf70a0ec0d7191'],
    ['000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f','8ea2b7ca516745bfeafc49904b496089']
  ]
  for (const [key, ciphertext] of vectors) {
    assert.equal(output({key,input:plaintext}), ciphertext)
    assert.equal(output({key,input:ciphertext,operation:'decrypt'}), plaintext)
  }
})
test('AES CBC NIST SP 800-38A first block', () => {
  assert.equal(output({mode:'cbc', key:'2b7e151628aed2a6abf7158809cf4f3c', iv:'000102030405060708090a0b0c0d0e0f', input:'6bc1bee22e409f96e93d7e117393172a'}), '7649abac8119b246cee98e9b12e9197d')
})
test('Single DES known answer in both directions', () => {
  const params = {algorithm:'des', key:'133457799bbcdff1'}
  assert.equal(output({...params,input:'0123456789abcdef'}), '85e813540f0ab405')
  assert.equal(output({...params,input:'85e813540f0ab405',operation:'decrypt'}), '0123456789abcdef')
})
test('CBC PKCS7 unicode and empty round trips', () => {
  for (const algorithm of ['aes','des']) for (const input of ['', '你好，Alche Tools']) {
    const params = {algorithm,mode:'cbc',padding:'pkcs7',key:algorithm === 'aes' ? '00'.repeat(16) : '01'.repeat(8),iv:'00'.repeat(algorithm === 'aes' ? 16 : 8)}
    const encrypted = output({...params,input,inputEncoding:'utf8',outputEncoding:'base64'})
    assert.equal(output({...params,input:encrypted,inputEncoding:'base64',outputEncoding:'utf8',operation:'decrypt'}), input)
  }
})
test('Reject malformed encodings, invalid parameters and oversized input', () => {
  for (const params of [null, {}, {...base,key:'00'}, {...base,algorithm:'invalid'}, {...base,algorithm:'md5',input:'0'}, {...base,algorithm:'md5',input:'!@',inputEncoding:'base64'}, {...base,algorithm:'md5',input:'Zh==',inputEncoding:'base64'}, {...base,algorithm:'md5',input:'a'.repeat(256*1024+1),inputEncoding:'utf8'}, {...base,key:'00'.repeat(16),mode:'cbc',iv:'00'}, {...base,key:'00'.repeat(16),input:'ff'}]) assert.equal(transform(params).ok, false)
})
test('JWT parsing explicitly reports unverified contents and rejects JWE/bad JSON', () => {
  const part = value => Buffer.from(JSON.stringify(value)).toString('base64url')
  const parsed = JSON.parse(output({algorithm:'jwt',input:`${part({alg:'none'})}.${part({sub:'example'})}.`}))
  assert.equal(parsed.payload.sub, 'example'); assert.match(parsed.verification, /未验证/)
  for (const input of ['a.b.c.d.e', 'a.b.c', `${part([])}.${part({})}.`]) assert.equal(run({algorithm:'jwt',input}).ok, false)
})
