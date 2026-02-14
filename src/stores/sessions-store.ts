import { Model, model, prop, modelAction, getRoot } from 'mobx-keystone'
import { reaction } from 'mobx'
import type { SessionRow } from '../lib/claw-client'
import type { RootStore } from './root-store'

@model('carclaw/SessionsStore')
export class SessionsStore extends Model({
  loading: prop<boolean>(false).withSetter(),
  sessions: prop<SessionRow[]>(() => []),
}) {
  private disposeReaction: (() => void) | null = null

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

  open() {
    if (this.root.connected) {
      this.load()
      return
    }

    // Wait for connection, then load
    this.disposeReaction = reaction(
      () => this.root.connected,
      (connected) => {
        if (connected) {
          this.load()
          this.disposeReaction?.()
          this.disposeReaction = null
        }
      },
    )
  }

  close() {
    this.disposeReaction?.()
    this.disposeReaction = null
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
