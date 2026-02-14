import { Model, model, prop } from 'mobx-keystone'
import type { SessionRow } from '../lib/claw-client'

@model('carclaw/SessionsStore')
export class SessionsStore extends Model({
  loading: prop<boolean>(false).withSetter(),
}) {
  sessions: SessionRow[] = []

  persistKeys() {
    return [] as string[]
  }
}
