import { Model, model, prop, modelAction, getRoot } from 'mobx-keystone'
import { when } from 'mobx'
import type { SessionRow } from '../lib/claw-client'
import type { RootStore } from './root-store'

@model('carclaw/SessionsStore')
export class SessionsStore extends Model({
  loading: prop<boolean>(false).withSetter(),
  sessions: prop<SessionRow[]>(() => []),
}) {
  private cancelWhen: (() => void) | null = null

  private get root(): RootStore {
    return getRoot<RootStore>(this)
  }

  persistKeys() {
    return ['sessions']
  }

  @modelAction
  setSessions(sessions: SessionRow[]) {
    this.sessions = sessions
  }

  async open() {
    this.cancelWhen = when(
      () => this.root.connected,
      () => this.load(),
    )
  }

  close() {
    this.cancelWhen?.()
    this.cancelWhen = null
  }

  private load() {
    const client = this.root.client
    if (!client) return

    this.setLoading(true)
    client.listSessions().then((res) => {
      this.setSessions(res.sessions)
      this.setLoading(false)
    }).catch((err) => {
      console.error('[sessions] failed to load:', err)
      this.setLoading(false)
    })
  }
}
