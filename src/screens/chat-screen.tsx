import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Mic, Square } from 'lucide-react'
import { useStore } from '../stores/store-context'
import { Header } from '../components/header'

export const ChatScreen = observer(function ChatScreen() {
  const store = useStore()
  const sessionKey = store.route.type === 'chat' ? store.route.sessionKey : ''
  const session = store.sessionsStore.findSession(sessionKey)

  useEffect(() => {
    if (!session) return
    session.loadHistory()
  }, [session])

  if (!session) {
    return (
      <div className="min-h-screen p-12 flex flex-col gap-8">
        <Header onBack={() => store.setRoute({ type: 'sessions' })}>Chat</Header>
        <div className="text-3xl text-gray-400">Session not found</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="p-12 pb-0">
        <Header onBack={() => store.setRoute({ type: 'sessions' })}>Chat</Header>
      </div>

      <div className="flex-1 flex items-center justify-center p-12">
        {session.loading && !session.lastAssistantText && (
          <div className="text-3xl text-gray-400">Loading...</div>
        )}

        {session.lastAssistantText && (
          <div className="text-3xl text-gray-200 leading-relaxed prose prose-invert prose-2xl max-w-none">
            <Markdown remarkPlugins={[remarkGfm]}>{session.lastAssistantText}</Markdown>
          </div>
        )}
      </div>

      <button
        onClick={() => session.toggleRecording()}
        className={`fixed bottom-8 left-8 w-32 h-32 text-white rounded-full shadow-sm flex items-center justify-center cursor-pointer ${
          session.recording
            ? 'bg-white active:bg-gray-300'
            : 'bg-red-500 active:bg-red-700'
        }`}
      >
        {session.recording ? (
          <Square size={40} fill="black" color="black" />
        ) : (
          <Mic size={56} />
        )}
      </button>
    </div>
  )
})
