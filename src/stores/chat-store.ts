import { Model, model, prop, getRoot } from 'mobx-keystone'
import { ChatEventPayloadSchema } from '../lib/claw-client'
import type { RootStore } from './root-store'

function extractText(message?: { content: { type: string; text?: string }[] }): string {
  if (!message) return ''
  return message.content
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text!)
    .join('\n')
}

@model('carclaw/ChatStore')
export class ChatStore extends Model({
  loading: prop<boolean>(false).withSetter(),
  lastAssistantText: prop<string>('').withSetter(),
}) {
  private unsubscribe: (() => void) | null = null

  persistKeys() {
    return [] as string[]
  }

  private get root(): RootStore {
    return getRoot<RootStore>(this)
  }

  /** Load history + subscribe to live chat events for the given session. */
  open(sessionKey: string) {
    this.close()
    this.setLoading(true)
    this.setLastAssistantText('')

    const client = this.root.client
    if (!client) return

    // Load latest assistant message from history
    client.chatHistory(sessionKey).then((res) => {
      const lastAssistant = [...res.messages]
        .reverse()
        .find((m) => m.role === 'assistant')
      if (lastAssistant) {
        this.setLastAssistantText(extractText(lastAssistant))
      }
      this.setLoading(false)
    }).catch(() => {
      this.setLoading(false)
    })

    // Subscribe to live chat events
    this.unsubscribe = client.on('chat', (raw) => {
      const parsed = ChatEventPayloadSchema.safeParse(raw)
      if (!parsed.success) return
      const payload = parsed.data
      if (payload.sessionKey !== sessionKey) return

      if (payload.state === 'delta' || payload.state === 'final') {
        const text = extractText(payload.message)
        if (text) {
          this.setLastAssistantText(text)
        }
      }
    })
  }

  /** Unsubscribe from live chat events. */
  close() {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
  }
}
