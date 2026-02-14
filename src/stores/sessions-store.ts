import { Model, model, prop, modelAction, getRoot } from 'mobx-keystone'
import type { SessionRow } from '../lib/claw-client'
import type { RootStore } from './root-store'
import { Session } from './session'

@model('carclaw/SessionsStore')
export class SessionsStore extends Model({
  isLoading: prop<boolean>(false).withSetter(),
  sessions: prop<Session[]>(() => []),
}) {
  private get root(): RootStore {
    return getRoot<RootStore>(this)
  }

  persistKeys() {
    return ['sessions']
  }

  // ─── Lookup ────────────────────────────────────────────────

  get visibleSessions(): Session[] {
    return this.sessions.filter((s) => s.kind !== 'cron')
  }

  findSession(key: string): Session | undefined {
    return this.sessions.find((s) => s.key === key)
  }

  @modelAction
  clearSessions() {
    this.sessions = []
  }

  // ─── Server Sync ──────────────────────────────────────────

  @modelAction
  syncFromServerData(serverSessions: SessionRow[]) {
    for (const row of serverSessions) {
      const existing = this.sessions.find((s) => s.key === row.key)
      if (existing) {
        existing.mergeFromServer({
          kind: row.kind ?? '',
          displayName: row.displayName ?? '',
          derivedTitle: row.derivedTitle ?? '',
          lastMessagePreview: row.lastMessagePreview ?? '',
          updatedAt: row.updatedAt != null ? String(row.updatedAt) : '',
        })
      } else {
        this.sessions.push(
          new Session({
            key: row.key,
            kind: row.kind ?? '',
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

    this.setIsLoading(true)
    try {
      const res = await client.listSessions()
      this.syncFromServerData(res.sessions)
    } catch (err) {
      console.error('[sessions] failed to load:', err)
    } finally {
      this.setIsLoading(false)
    }
  }
}
