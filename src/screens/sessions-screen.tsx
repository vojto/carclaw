import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from '../stores/store-context'
import { Header } from '../components/header'
import { ListItem } from '../components/list-item'

export const SessionsScreen = observer(function SessionsScreen() {
  const store = useStore()
  const { sessionsStore } = store

  useEffect(() => {
    sessionsStore.syncFromServer()
  }, [sessionsStore])

  const handleSelect = (key: string) => {
    store.setRoute({ type: 'chat', sessionKey: key })
  }

  return (
    <div className="min-h-screen p-12 flex flex-col gap-8">
      <Header>Sessions</Header>

      {sessionsStore.isLoading && sessionsStore.visibleSessions.length === 0 && (
        <div className="text-3xl text-gray-400">Loading...</div>
      )}

      <div className="flex flex-col gap-4">
        {sessionsStore.visibleSessions.map((s) => (
          <ListItem
            key={s.key}
            title={s.displayName || s.derivedTitle || s.key}
            subtitle={s.preview}
            onClick={() => handleSelect(s.key)}
          />
        ))}
      </div>
    </div>
  )
})
