import { Model, model, prop, modelAction, getRoot } from 'mobx-keystone'
import type { SessionRow } from '../lib/claw-client'
import type { RootStore } from './root-store'
import { Session } from './session'

@model('carclaw/SessionsStore')
export class SessionsStore extends Model({
  loading: prop<boolean>(false).withSetter(),
  sessions: prop<Session[]>(() => []),
}) {
  private get root(): RootStore {
    return getRoot<RootStore>(this)
  }

  persistKeys() {
    return ['sessions']
  }

  // ─── Lookup ────────────────────────────────────────────────

  findSession(key: string): Session | undefined {
    return this.sessions.find((s) => s.key === key)
  }

  // ─── Server Sync ──────────────────────────────────────────

  @modelAction
  syncFromServerData(serverSessions: SessionRow[]) {
    for (const row of serverSessions) {
      const existing = this.sessions.find((s) => s.key === row.key)
      if (existing) {
        existing.mergeFromServer({
          displayName: row.displayName ?? '',
          derivedTitle: row.derivedTitle ?? '',
          lastMessagePreview: row.lastMessagePreview ?? '',
          updatedAt: row.updatedAt != null ? String(row.updatedAt) : '',
        })
      } else {
        this.sessions.push(
          new Session({
            key: row.key,
            displayName: row.displayName ?? '',
            derivedTitle: row.derivedTitle ?? '',
            lastMessagePreview: row.lastMessagePreview ?? '',
            updatedAt: row.updatedAt != null ? String(row.updatedAt) : '',
          }),
        )
      }
    }
  }

  async syncFromServer() {
    const client = this.root.client
    if (!client) return

    this.setLoading(true)
    try {
      const res = await client.listSessions()
      this.syncFromServerData(res.sessions)
    } catch (err) {
      console.error('[sessions] failed to load:', err)
    } finally {
      this.setLoading(false)
    }
  }
}
