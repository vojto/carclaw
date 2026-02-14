import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { LogOut } from 'lucide-react'
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
      <Header
        action={
          <button
            onClick={() => store.logout()}
            className="w-32 h-32 rounded-full bg-blue-600 active:bg-blue-800 flex items-center justify-center cursor-pointer"
          >
            <LogOut size={40} className="text-white" />
          </button>
        }
      >
        Sessions
      </Header>

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
