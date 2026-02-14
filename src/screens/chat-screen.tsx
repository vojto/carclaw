import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from '../stores/store-context'
import { Screen } from '../stores/root-store'
import { Title } from '../components/title'
import { BigButton } from '../components/big-button'

export const ChatScreen = observer(function ChatScreen() {
  const store = useStore()
  const { chatStore } = store

  useEffect(() => {
    const client = store.client
    if (!client || !store.selectedSessionKey) return

    chatStore.setLoading(true)
    chatStore.setLastAssistantText('')

    client.chatHistory(store.selectedSessionKey).then((res) => {
      const lastAssistant = [...res.messages]
        .reverse()
        .find((m) => m.role === 'assistant')

      if (lastAssistant) {
        const text = lastAssistant.content
          .filter((b) => b.type === 'text' && b.text)
          .map((b) => b.text!)
          .join('\n')
        chatStore.setLastAssistantText(text)
      }

      chatStore.setLoading(false)
    }).catch(() => {
      chatStore.setLoading(false)
    })
  }, [store, chatStore, store.selectedSessionKey])

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
        <div className="text-3xl text-gray-200 leading-relaxed whitespace-pre-wrap">
          {chatStore.lastAssistantText}
        </div>
      )}
    </div>
  )
})
