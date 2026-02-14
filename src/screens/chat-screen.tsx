import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Markdown from 'react-markdown'
import { Mic } from 'lucide-react'
import { useStore } from '../stores/store-context'
import { Screen } from '../stores/root-store'
import { Title } from '../components/title'
import { BigButton } from '../components/big-button'

export const ChatScreen = observer(function ChatScreen() {
  const store = useStore()
  const { chatStore } = store

  useEffect(() => {
    if (!store.selectedSessionKey) return
    chatStore.open(store.selectedSessionKey)
    return () => chatStore.close()
  }, [chatStore, store.selectedSessionKey])

  return (
    <div className="min-h-screen p-12 flex flex-col gap-8">
      <BigButton onClick={() => store.setScreen(Screen.Sessions)}>
        Back
      </BigButton>

      <Title>Chat</Title>

      {chatStore.loading && (
        <div className="text-3xl text-gray-400">Loading...</div>
      )}

      {chatStore.lastAssistantText && (
        <div className="text-3xl text-gray-200 leading-relaxed prose prose-invert prose-2xl max-w-none">
          <Markdown>{chatStore.lastAssistantText}</Markdown>
        </div>
      )}

      <button className="fixed bottom-8 left-8 w-32 h-32 bg-red-500 active:bg-red-700 text-white rounded-full shadow-sm flex items-center justify-center cursor-pointer">
        <Mic size={56} />
      </button>
    </div>
  )
})
