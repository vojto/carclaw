import { Model, model, prop, modelAction } from 'mobx-keystone'
import { ClawClient } from '../lib/claw-client'

export enum Screen {
  Welcome = 'welcome',
  Setup = 'setup',
  Home = 'home',
}

@model('carclaw/RootStore')
export class RootStore extends Model({
  disclaimerAccepted: prop<boolean>(false).withSetter(),
  screen: prop<string>(Screen.Welcome).withSetter(),
  host: prop<string>('127.0.0.1').withSetter(),
  port: prop<string>('18789').withSetter(),
  token: prop<string>('').withSetter(),
  connecting: prop<boolean>(false).withSetter(),
  connectError: prop<string>('').withSetter(),
  recordingVisible: prop<boolean>(false).withSetter(),
}) {
  client: ClawClient | null = null

  protected onInit() {
    if (!this.disclaimerAccepted) {
      return
    }

    if (!this.token) {
      this.setScreen(Screen.Setup)
      return
    }

    // Has credentials — try connecting
    this.setScreen(Screen.Setup)
    this.connect()
  }

  persistKeys() {
    return ['disclaimerAccepted', 'host', 'port', 'token']
  }

  @modelAction
  acceptDisclaimer() {
    this.disclaimerAccepted = true
    this.screen = Screen.Setup
  }

  async connect() {
    this.setConnecting(true)
    this.setConnectError('')
    const url = `ws://${this.host}:${this.port}`
    this.client = new ClawClient(url, this.token)
    try {
      await this.client.connect()
      this.setConnecting(false)
      this.setScreen(Screen.Home)
    } catch (err) {
      this.setConnecting(false)
      this.setConnectError(err instanceof Error ? err.message : 'Connection failed')
    }
  }
}
