const TOKEN_KEY = 'claw_token'
const DEFAULT_URL = 'ws://127.0.0.1:18789'

type EventHandler = (payload: unknown) => void

interface PendingRequest {
  resolve: (payload: unknown) => void
  reject: (error: { code: string; message: string }) => void
}

export class ClawClient {
  private ws: WebSocket | null = null
  private nextId = 1
  private pending = new Map<string, PendingRequest>()
  private eventHandlers = new Map<string, Set<EventHandler>>()
  private url: string

  constructor(url = DEFAULT_URL) {
    this.url = url
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  }

  set token(value: string | null) {
    if (value) {
      localStorage.setItem(TOKEN_KEY, value)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  }

  connect(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url)
      this.ws = ws

      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data)

        if (msg.type === 'event' && msg.event === 'connect.challenge') {
          this.handleChallenge(resolve, reject)
          return
        }

        if (msg.type === 'res') {
          const req = this.pending.get(msg.id)
          if (req) {
            this.pending.delete(msg.id)
            if (msg.ok) {
              req.resolve(msg.payload)
            } else {
              req.reject(msg.error)
            }
          }
          return
        }

        if (msg.type === 'event') {
          const handlers = this.eventHandlers.get(msg.event)
          if (handlers) {
            for (const handler of handlers) {
              handler(msg.payload)
            }
          }
        }
      }

      ws.onerror = () => reject(new Error('WebSocket connection failed'))
      ws.onclose = () => {
        this.ws = null
        this.rejectAllPending('Connection closed')
      }
    })
  }

  private handleChallenge(
    resolve: (payload: unknown) => void,
    reject: (error: Error) => void,
  ) {
    const token = this.token
    if (!token) {
      reject(new Error('No auth token configured'))
      return
    }

    const id = this.allocId()

    this.pending.set(id, {
      resolve,
      reject: (err) => reject(new Error(err.message)),
    })

    this.send({
      type: 'req',
      id,
      method: 'connect',
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: 'gateway-client',
          displayName: 'Carclaw',
          version: '0.1.0',
          platform: 'web',
          mode: 'backend',
        },
        auth: { token },
      },
    })
  }

  request(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected'))
        return
      }

      const id = this.allocId()
      this.pending.set(id, { resolve, reject: (err) => reject(new Error(err.message)) })
      this.send({ type: 'req', id, method, params })
    })
  }

  on(event: string, handler: EventHandler) {
    let handlers = this.eventHandlers.get(event)
    if (!handlers) {
      handlers = new Set()
      this.eventHandlers.set(event, handlers)
    }
    handlers.add(handler)
    return () => handlers!.delete(handler)
  }

  disconnect() {
    this.ws?.close()
    this.ws = null
  }

  private send(msg: unknown) {
    this.ws?.send(JSON.stringify(msg))
  }

  private allocId(): string {
    return String(this.nextId++)
  }

  private rejectAllPending(reason: string) {
    for (const [id, req] of this.pending) {
      req.reject({ code: 'CLOSED', message: reason })
    }
    this.pending.clear()
  }
}
