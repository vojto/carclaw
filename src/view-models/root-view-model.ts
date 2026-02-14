import { makeObservable, observable } from 'mobx'
import { RecordingViewModel } from './recording-view-model'

export class RootViewModel {
  @observable recording = new RecordingViewModel()

  constructor() {
    makeObservable(this)
  }
}
