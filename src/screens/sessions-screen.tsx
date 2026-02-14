import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { useStore } from '../stores/store-context'
import { Screen } from '../stores/root-store'
import { Title } from '../components/title'
import { ListItem } from '../components/list-item'

export const SessionsScreen = observer(function SessionsScreen() {
  const store = useStore()
  const { sessionsStore } = store

  useEffect(() => {
    const client = store.client
    if (!client) return

    sessionsStore.setLoading(true)
    client.listSessions().then((res) => {
      runInAction(() => {
        sessionsStore.sessions = res.sessions
        sessionsStore.setLoading(false)
      })
    }).catch(() => {
      sessionsStore.setLoading(false)
    })
  }, [store, sessionsStore])

  const handleSelect = (key: string) => {
    store.setSelectedSessionKey(key)
    store.setScreen(Screen.Chat)
  }

  return (
    <div className="min-h-screen p-12 flex flex-col gap-8">
      <Title>Sessions</Title>

      {sessionsStore.loading && (
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
