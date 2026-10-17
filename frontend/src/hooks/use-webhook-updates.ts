import { useEffect } from 'react'

async function readUpdates(body: ReadableStream<Uint8Array>, signal: AbortSignal, onUpdate: () => void): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let pending = ''
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read()
      if (done) return
      pending = (pending + decoder.decode(value, { stream: true })).replace(/\r\n/g, '\n')
      let boundary = pending.indexOf('\n\n')
      while (boundary !== -1) {
        const frame = pending.slice(0, boundary)
        pending = pending.slice(boundary + 2)
        const data = frame.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n')
        if (data) {
          try {
            const message: unknown = JSON.parse(data)
            if (typeof message === 'object' && message !== null && ('event' in message || 'connected' in message)) onUpdate()
          } catch { /* Ignore incomplete or unexpected messages. */ }
        }
        boundary = pending.indexOf('\n\n')
      }
    }
  } finally {
    reader.releaseLock()
  }
}

function waitForRetry(signal: AbortSignal, delay: number): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve()
    const timer = window.setTimeout(finish, delay)
    signal.addEventListener('abort', finish, { once: true })
    function finish() {
      window.clearTimeout(timer)
      signal.removeEventListener('abort', finish)
      resolve()
    }
  })
}

export function useWebhookUpdates(token: string, onUpdate: () => void): void {
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    async function connect() {
      let retryDelay = 1000
      while (!controller.signal.aborted) {
        try {
          const response = await fetch('/api/webhooks/updates', {
            headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
            signal: controller.signal,
          })
          if (response.status === 401 || response.status === 403) return
          if (!response.ok || !response.body) throw new Error('Canal de atualizações indisponível')
          retryDelay = 1000
          await readUpdates(response.body, controller.signal, onUpdate)
        } catch {
          if (controller.signal.aborted) return
        }
        await waitForRetry(controller.signal, retryDelay)
        retryDelay = Math.min(retryDelay * 2, 30000)
      }
    }
    void connect()
    return () => controller.abort()
  }, [token, onUpdate])
}
