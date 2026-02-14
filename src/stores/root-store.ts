import { Model, model, prop, modelAction } from 'mobx-keystone'
import { ClawClient, ChatEventPayloadSchema } from '../lib/claw-client'
import { SessionsStore } from './sessions-store'

export type Route =
  | { type: 'welcome' }
  | { type: 'setup' }
  | { type: 'sessions' }
  | { type: 'chat'; sessionKey: string }

@model('carclaw/RootStore')
export class RootStore extends Model({
  disclaimerAccepted: prop<boolean>(false).withSetter(),
  route: prop<Route>(() => ({ type: 'welcome' })).withSetter(),
  host: prop<string>('127.0.0.1').withSetter(),
  port: prop<string>('18789').withSetter(),
  token: prop<string>('').withSetter(),
  connecting: prop<boolean>(false).withSetter(),
  connectError: prop<string>('').withSetter(),
  connected: prop<boolean>(false).withSetter(),
  sessionsStore: prop<SessionsStore>(() => new SessionsStore({})),
}) {
  client: ClawClient | null = null
  private chatUnsubscribe: (() => void) | null = null

  get selectedSessionKey(): string {
    return this.route.type === 'chat' ? this.route.sessionKey : ''
  }

  protected onInit() {
    if (!this.disclaimerAccepted) {
      this.setRoute({ type: 'welcome' })
      return
    }

    if (!this.token) {
      this.setRoute({ type: 'setup' })
      return
    }

    // Has credentials — keep persisted route, connect silently in background
    this.connectSilently()
  }

  persistKeys() {
    return ['disclaimerAccepted', 'host', 'port', 'token', 'route']
  }

  @modelAction
  acceptDisclaimer() {
    this.disclaimerAccepted = true
    this.route = { type: 'setup' }
  }

  // ─── Connection ───────────────────────────────────────────

  async connectSilently() {
    const url = `ws://${this.host}:${this.port}`
    this.client = new ClawClient(url, this.token)
    try {
      await this.client.connect()
      this.setConnected(true)
      this.onConnected()
      // If still on welcome/setup, advance to sessions
      if (this.route.type === 'welcome' || this.route.type === 'setup') {
        this.setRoute({ type: 'sessions' })
      }
    } catch {
      this.setRoute({ type: 'setup' })
    }
  }

  async connect() {
    this.setConnecting(true)
    this.setConnectError('')
    const url = `ws://${this.host}:${this.port}`
    this.client = new ClawClient(url, this.token)
    try {
      await this.client.connect()
      this.setConnecting(false)
      this.setConnected(true)
      this.onConnected()
      this.setRoute({ type: 'sessions' })
    } catch (err) {
      this.setConnecting(false)
      this.setConnectError(err instanceof Error ? err.message : 'Connection failed')
    }
  }

  // ─── Global Subscriptions ────────────────────────────────

  private onConnected() {
    if (!this.client) return

    // Subscribe globally to chat events
    this.chatUnsubscribe = this.client.on('chat', (raw) => {
      const parsed = ChatEventPayloadSchema.safeParse(raw)
      if (!parsed.success) return
      const payload = parsed.data

      const session = this.sessionsStore.findSession(payload.sessionKey)
      if (session) {
        session.handleChatEvent(payload)
      }
    })

    // Load initial sessions
    this.sessionsStore.syncFromServer()
  }
}
