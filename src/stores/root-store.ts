import { Model, model, prop, modelAction } from 'mobx-keystone'
import { ClawClient } from '../lib/claw-client'
import { SessionsStore } from './sessions-store'
import { ChatStore } from './chat-store'

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
  chatStore: prop<ChatStore>(() => new ChatStore({})),
}) {
  client: ClawClient | null = null

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

  async connectSilently() {
    const url = `ws://${this.host}:${this.port}`
    this.client = new ClawClient(url, this.token)
    try {
      await this.client.connect()
      this.setConnected(true)
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
      this.setRoute({ type: 'sessions' })
    } catch (err) {
      this.setConnecting(false)
      this.setConnectError(err instanceof Error ? err.message : 'Connection failed')
    }
  }
}
