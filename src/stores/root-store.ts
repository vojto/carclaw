import { Model, model, prop, modelAction } from 'mobx-keystone'
import { ClawClient } from '../lib/claw-client'

export enum Screen {
  Welcome = 'welcome',
  Setup = 'setup',
  Home = 'home',
}

@model('carclaw/RootStore')
export class RootStore extends Model({
  screen: prop<string>(Screen.Welcome),
  host: prop<string>('127.0.0.1'),
  port: prop<string>('18789'),
  token: prop<string>(''),
  recordingVisible: prop<boolean>(false),
}) {
  client: ClawClient | null = null

  @modelAction
  acceptDisclaimer() {
    this.screen = Screen.Setup
  }

  @modelAction
  setHost(value: string) {
    this.host = value
  }

  @modelAction
  setPort(value: string) {
    this.port = value
  }

  @modelAction
  setToken(value: string) {
    this.token = value
  }

  @modelAction
  setScreen(screen: Screen) {
    this.screen = screen
  }

  connect() {
    const url = `ws://${this.host}:${this.port}`
    this.client = new ClawClient(url, this.token)
    this.client.connect().then(() => {
      this.setScreen(Screen.Home)
    })
  }
}
