# 编码与加解密模块

状态：已实现待运行验收。入口为工作台“编码与加解密”。使用 Node.js crypto，无新增第三方密码库；不联网、不保存输入、密钥和结果，离开模块卸载视图。清空仅移除应用引用，不承诺底层内存安全擦除。

## 能力与参数

| 工具 | 支持范围 |
| --- | --- |
| MD5 | 不可逆摘要，输出 Hex 小写或 Base64，无解密 |
| AES | 128/192/256 位原始密钥；CBC/ECB；PKCS#7 或 No Padding |
| DES | 8 字节原始密钥；CBC/ECB；PKCS#7 或 No Padding |
| JWT | 解析三段式 Header/Payload/Signature；不验签、不判断授权，不解密五段式 JWE |

输入、密钥和 IV 支持 UTF-8/Hex/Base64；二进制结果可输出 Hex/Base64，UTF-8 输出遇到无效文本报错而非替换乱码。Hex 必须为偶数位，不含空格/0x；标准 Base64 保留所需填充；JWT 使用无填充 Base64URL。UTF-8 密钥按字节计算长度，不按字符数。

CBC IV：AES 16 字节、DES 8 字节；支持生成随机 IV。ECB 无 IV。使用原始密钥，不进行口令派生、补零或截断，不输出 OpenSSL Salted__ 封套。PKCS#7 默认；No Padding 要求分组对齐。解密参数必须与加密端一致。

DES 通过重复三次同一密钥的 EDE 原语实现单 DES 等价运算，不开启全局 legacy provider；实际运行时若不支持该原语，返回明确错误。CBC/ECB 不提供完整性认证，错误密钥并不保证必然触发错误。DES 仅用于旧系统兼容；MD5 不用于密码存储。

输入解码后最大 256 KiB，IPC 文本字段另有限长。当前小数据同步处理在主进程进行；文件和批量任务不在范围内。

## 接口与源码

window.desktop.crypto.transform(request) → crypto:transform → CryptoResult。DTO 位于 src/shared/crypto.ts；参数校验与算法位于 src/main/modules/crypto/service.ts。IPC 校验当前窗口、顶层 frame 和 URL。结果使用文本区域显示，不执行内容。

CryptoResult 为 `{ok:true,output:string}` 或 `{ok:false,error:string}`；来源拒绝仍可能使 Promise reject。界面修改参数后清除旧结果，忽略与旧输入关联的迟到结果。

## 验证

类型检查与生产构建通过，未启动 Electron。scripts/test-crypto.cjs 已提供 MD5、AES、DES 已知向量、CBC/填充往返、输入拒绝与 JWT 解析测试；本次按只做代码确认的要求未执行。后续可运行 `node --test scripts/test-crypto.cjs`，该脚本不启动 Electron 或联网。

待验收：上述向量、错误密钥/填充、中文和二进制编码、随机 IV、JWT/JWE 错误提示、离开清空和三平台算法可用性。未验证前不标为已验收。

## 依据

- [Node.js crypto API](https://nodejs.org/download/release/v24.22.1/docs/api/crypto.html)
- [OpenSSL 对称算法说明](https://docs.openssl.org/master/man1/openssl-enc/)
