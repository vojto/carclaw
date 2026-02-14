import { action, makeObservable, observable } from 'mobx'
import { ClawClient } from '../lib/claw-client'
import { RecordingViewModel } from './recording-view-model'

export enum Screen {
  Welcome = 'welcome',
  Setup = 'setup',
  Home = 'home',
}

export class RootViewModel {
  @observable screen = Screen.Welcome
  @observable recording = new RecordingViewModel()
  client: ClawClient | null = null

  constructor() {
    makeObservable(this)
  }

  @action acceptDisclaimer() {
    this.screen = Screen.Setup
  }

  @action connect(host: string, port: string, token: string) {
    const url = `ws://${host}:${port}`
    this.client = new ClawClient(url, token)
    this.client.connect().then(
      action(() => {
        this.screen = Screen.Home
      }),
    )
  }
}
