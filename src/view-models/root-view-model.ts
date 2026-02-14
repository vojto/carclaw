import { action, makeObservable, observable } from 'mobx'
import { RecordingViewModel } from './recording-view-model'

export enum Screen {
  Welcome = 'welcome',
  Home = 'home',
}

export class RootViewModel {
  @observable screen = Screen.Welcome
  @observable recording = new RecordingViewModel()

  constructor() {
    makeObservable(this)
  }

  @action acceptDisclaimer() {
    this.screen = Screen.Home
  }
}
