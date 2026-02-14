import { makeObservable, observable } from 'mobx'

export class RecordingViewModel {
  @observable isVisible = false

  constructor() {
    makeObservable(this)
  }
}
