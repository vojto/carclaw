import { Model, model, prop, modelAction } from 'mobx-keystone'
import { ClawClient, ChatEventPayloadSchema } from '../lib/claw-client'
import type { AgentRow } from '../lib/claw-client'
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
  elevenlabsApiKey: prop<string>('').withSetter(),
  connecting: prop<boolean>(false).withSetter(),
  connectError: prop<string>('').withSetter(),
  connected: prop<boolean>(false).withSetter(),
  sessionsStore: prop<SessionsStore>(() => new SessionsStore({})),
}) {
  client: ClawClient | null = null
  private chatUnsubscribe: (() => void) | null = null
  agents: AgentRow[] = []

  get selectedSessionKey(): string {
    return this.route.type === 'chat' ? this.route.sessionKey : ''
  }

  // ─── Agents ─────────────────────────────────────────────

  agentForSession(sessionKey: string): AgentRow | undefined {
    // Session keys are formatted as "agent:<agentId>:<rest>"
    const parts = sessionKey.split(':')
    if (parts[0] !== 'agent' || parts.length < 2) return undefined
    const agentId = parts[1]
    return this.agents.find((a) => a.id === agentId)
  }

  get isLocalhost(): boolean {
    return this.host === '127.0.0.1' || this.host === 'localhost'
  }

  get wsUrl(): string {
    if (this.isLocalhost) {
      return `ws://${this.host}:${this.port}`
    }
    return `wss://${this.host}`
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
    return ['disclaimerAccepted', 'host', 'port', 'token', 'elevenlabsApiKey', 'route']
  }

  @modelAction
  acceptDisclaimer() {
    this.disclaimerAccepted = true
    this.route = { type: 'setup' }
  }

  // ─── Logout ─────────────────────────────────────────────

  @modelAction
  logout() {
    this.chatUnsubscribe?.()
    this.chatUnsubscribe = null
    this.client?.disconnect()
    this.client = null
    this.connected = false
    this.host = '127.0.0.1'
    this.port = '18789'
    this.token = ''
    this.elevenlabsApiKey = ''
    this.sessionsStore.clearSessions()
    this.route = { type: 'setup' }
  }

  // ─── Connection ───────────────────────────────────────────

  async connectSilently() {
    const url = this.wsUrl
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
    const url = this.wsUrl
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

    // Load agents and sessions
    this.loadAgents()
    this.sessionsStore.syncFromServer()
  }

  private async loadAgents() {
    if (!this.client) return
    try {
      const res = await this.client.listAgents()
      this.agents = res.agents
    } catch (err) {
      console.error('[agents] failed to load:', err)
    }
  }
}
