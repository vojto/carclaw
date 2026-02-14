import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from '../stores/store-context'
import { Title } from '../components/title'
import { ListItem } from '../components/list-item'

export const SessionsScreen = observer(function SessionsScreen() {
  const store = useStore()
  const { sessionsStore } = store

  useEffect(() => {
    if (!store.connected) return
    const client = store.client
    if (!client) return

    sessionsStore.setLoading(true)
    client.listSessions().then((res) => {
      sessionsStore.setSessions(res.sessions)
      sessionsStore.setLoading(false)
    }).catch((err) => {
      console.error('[sessions] failed to load:', err)
      sessionsStore.setLoading(false)
    })
  }, [store, store.connected, sessionsStore])

  const handleSelect = (key: string) => {
    store.setRoute({ type: 'chat', sessionKey: key })
  }

  return (
    <div className="min-h-screen p-12 flex flex-col gap-8">
      <Title>Sessions</Title>

      {sessionsStore.loading && sessionsStore.sessions.length === 0 && (
        <div className="text-3xl text-gray-400">Loading...</div>
      )}

      <div className="flex flex-col gap-4">
        {sessionsStore.sessions.map((s) => (
          <ListItem
            key={s.key}
            title={s.displayName || s.derivedTitle || s.key}
            subtitle={s.lastMessagePreview}
            onClick={() => handleSelect(s.key)}
          />
        ))}
      </div>
    </div>
  )
})
