import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Markdown from 'react-markdown'
import { Mic, Square, Loader } from 'lucide-react'
import { useStore } from '../stores/store-context'
import { Title } from '../components/title'
import { BigButton } from '../components/big-button'

export const ChatScreen = observer(function ChatScreen() {
  const store = useStore()
  const { chatStore } = store
  const sessionKey = store.route.type === 'chat' ? store.route.sessionKey : ''

  useEffect(() => {
    if (!sessionKey || !store.connected) return
    chatStore.open(sessionKey)
    return () => chatStore.close()
  }, [chatStore, sessionKey, store.connected])

  return (
    <div className="min-h-screen p-12 flex flex-col gap-8">
      <BigButton onClick={() => store.setRoute({ type: 'sessions' })}>
        Back
      </BigButton>

      <Title>Chat</Title>

      {chatStore.loading && !chatStore.lastAssistantText && (
        <div className="text-3xl text-gray-400">Loading...</div>
      )}

      {chatStore.lastAssistantText && (
        <div className="text-3xl text-gray-200 leading-relaxed prose prose-invert prose-2xl max-w-none">
          <Markdown>{chatStore.lastAssistantText}</Markdown>
        </div>
      )}

      <button
        onClick={() => chatStore.toggleRecording()}
        disabled={chatStore.transcribing}
        className={`fixed bottom-8 left-8 w-32 h-32 text-white rounded-full shadow-sm flex items-center justify-center cursor-pointer ${
          chatStore.transcribing
            ? 'bg-gray-600'
            : chatStore.recording
              ? 'bg-white active:bg-gray-300'
              : 'bg-red-500 active:bg-red-700'
        }`}
      >
        {chatStore.transcribing ? (
          <Loader size={56} className="animate-spin" />
        ) : chatStore.recording ? (
          <Square size={40} fill="black" color="black" />
        ) : (
          <Mic size={56} />
        )}
      </button>
    </div>
  )
})
