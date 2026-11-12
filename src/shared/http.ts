export interface Pair { enabled: boolean; key: string; value: string }
export interface HttpRequest {
  id: string; name: string; collection: string; method: string; url: string
  params: Pair[]; headers: Pair[]; bodyType: 'none' | 'json' | 'text' | 'form'; body: string
  timeoutMs: number
}
export interface HttpResponse { status: number; statusText: string; headers: Pair[]; body: string; durationMs: number; size: number; url: string }
export type HttpResult = { ok: true; data: HttpResponse } | { ok: false; error: string }
export interface HttpApi {
  list(): Promise<HttpRequest[]>
  save(request: HttpRequest): Promise<HttpRequest[]>
  remove(id: string): Promise<HttpRequest[]>
  execute(taskId: string, request: HttpRequest): Promise<HttpResult>
  cancel(taskId: string): Promise<void>
}
