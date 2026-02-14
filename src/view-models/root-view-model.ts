import { action, makeObservable, observable } from 'mobx'
import { RecordingViewModel } from './recording-view-model'
import { Screen } from './screen'

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
