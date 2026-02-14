import { Model, model, prop, modelAction } from 'mobx-keystone'
import { ClawClient } from '../lib/claw-client'

export enum Screen {
  Welcome = 'welcome',
  Setup = 'setup',
  Home = 'home',
}

@model('carclaw/RootStore')
export class RootStore extends Model({
  screen: prop<string>(Screen.Welcome).withSetter(),
  host: prop<string>('127.0.0.1').withSetter(),
  port: prop<string>('18789').withSetter(),
  token: prop<string>('').withSetter(),
  connecting: prop<boolean>(false).withSetter(),
  connectError: prop<string>('').withSetter(),
  recordingVisible: prop<boolean>(false).withSetter(),
}) {
  client: ClawClient | null = null

  @modelAction
  acceptDisclaimer() {
    this.screen = Screen.Setup
  }

  async connect() {
    this.setConnecting(true)
    this.setConnectError('')
    const url = `ws://${this.host}:${this.port}`
    this.client = new ClawClient(url, this.token)
    try {
      await Promise.all([
        this.client.connect(),
        new Promise((r) => setTimeout(r, 1000)),
      ])
      this.setConnecting(false)
      this.setScreen(Screen.Home)
    } catch (err) {
      this.setConnecting(false)
      this.setConnectError(err instanceof Error ? err.message : 'Connection failed')
    }
  }
}
