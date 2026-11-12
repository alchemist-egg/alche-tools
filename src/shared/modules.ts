import type { ModuleDescriptor } from './contracts'

export const modules: readonly ModuleDescriptor[] = [
  { id: 'http', name: 'HTTP 调试', description: '编辑请求、查看响应、加密保存本地接口。', status: 'ready' },
  { id: 'kafka', name: 'Kafka', description: '管理连接、生产消息与观察消费结果。', status: 'planned' },
  { id: 'redis', name: 'Redis', description: '连接实例、检索 Key 与查看数据。', status: 'planned' },
  { id: 'crypto', name: '编码与加解密', description: 'MD5 摘要、DES/AES 加解密与 JWT 解析。', status: 'ready' }
]


