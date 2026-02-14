import { z } from 'zod'

const DEFAULT_URL = 'ws://127.0.0.1:18789'

type EventHandler = (payload: unknown) => void

// --- Zod schemas ---

export const SessionRowSchema = z.object({
  key: z.string(),
  displayName: z.string().optional(),
  derivedTitle: z.string().optional(),
  lastMessagePreview: z.string().optional(),
  updatedAt: z.union([z.string(), z.number()]).optional(),
  kind: z.string().optional(),
})
export type SessionRow = z.infer<typeof SessionRowSchema>

const SessionsListResponseSchema = z.object({
  sessions: z.array(SessionRowSchema),
  count: z.number(),
  ts: z.union([z.string(), z.number()]).optional(),
})

const ContentBlockSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
})

export const ChatMessageSchema = z.object({
  role: z.string(),
  content: z.array(ContentBlockSchema),
})
export type ChatMessage = z.infer<typeof ChatMessageSchema>

const ChatHistoryResponseSchema = z.object({
  sessionKey: z.string(),
  messages: z.array(ChatMessageSchema),
})

export const ChatEventPayloadSchema = z.object({
  runId: z.string(),
  sessionKey: z.string(),
  seq: z.number(),
  state: z.enum(['delta', 'final', 'aborted', 'error']),
  message: ChatMessageSchema.optional(),
  errorMessage: z.string().optional(),
})
export type ChatEventPayload = z.infer<typeof ChatEventPayloadSchema>

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
  private token: string

  constructor(url = DEFAULT_URL, token = '') {
    this.url = url
    this.token = token
  }

  // ─── Lifecycle ───────────────────────────────────────────────

  connect(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url)
      this.ws = ws

      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data)
        console.log('[claw] ◀', msg)

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

  disconnect() {
    this.ws?.close()
    this.ws = null
  }

  // ─── Authentication ─────────────────────────────────────────

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
          displayName: '',
          version: '0.1.0',
          platform: 'web',
          mode: 'backend',
        },
        auth: { token },
      },
    })
  }

  // ─── Requests & Events ───────────────────────────────────────

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

  // ─── Sessions ────────────────────────────────────────────────

  async listSessions() {
    const raw = await this.request('sessions.list', {
      includeLastMessage: true,
      includeDerivedTitles: true,
    })
    return SessionsListResponseSchema.parse(raw)
  }

  // ─── Chat ────────────────────────────────────────────────────

  async chatHistory(sessionKey: string, limit?: number) {
    const params: Record<string, unknown> = { sessionKey }
    if (limit !== undefined) params.limit = limit
    const raw = await this.request('chat.history', params)
    return ChatHistoryResponseSchema.parse(raw)
  }

  async sendMessage(sessionKey: string, text: string) {
    const idempotencyKey = crypto.randomUUID()
    await this.request('chat.send', {
      sessionKey,
      idempotencyKey,
      message: text,
    })
  }

  // ─── Internal ────────────────────────────────────────────────

  private send(msg: unknown) {
    console.log('[claw] ▶', msg)
    this.ws?.send(JSON.stringify(msg))
  }

  private allocId(): string {
    return String(this.nextId++)
  }

  private rejectAllPending(reason: string) {
    for (const [, req] of this.pending) {
      req.reject({ code: 'CLOSED', message: reason })
    }
    this.pending.clear()
  }
}
