import { Model, model, prop, modelAction } from 'mobx-keystone'
import { observable } from 'mobx'
import type { SessionRow } from '../lib/claw-client'

@model('carclaw/SessionsStore')
export class SessionsStore extends Model({
  loading: prop<boolean>(false).withSetter(),
}) {
  @observable sessions: SessionRow[] = []

  @modelAction
  setSessions(sessions: SessionRow[]) {
    this.sessions = sessions
  }

  persistKeys() {
    return [] as string[]
  }
}
