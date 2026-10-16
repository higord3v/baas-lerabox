export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function responseMessage(body: unknown): string {
  if (typeof body !== 'object' || body === null || !('message' in body)) {
    return 'Não foi possível concluir a solicitação.'
  }

  const { message } = body
  if (typeof message === 'string') return message
  if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
    return message.join(', ')
  }
  return 'Não foi possível concluir a solicitação.'
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`/api${path}`, { ...options, headers })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(responseMessage(body), response.status)
  return body as T
}
