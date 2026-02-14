import { Model, model, prop, modelAction } from 'mobx-keystone'
import type { SessionRow } from '../lib/claw-client'

@model('carclaw/SessionsStore')
export class SessionsStore extends Model({
  loading: prop<boolean>(false).withSetter(),
  sessions: prop<SessionRow[]>(() => []),
}) {
  @modelAction
  setSessions(sessions: SessionRow[]) {
    this.sessions = sessions
  }

  persistKeys() {
    return [] as string[]
  }
}
