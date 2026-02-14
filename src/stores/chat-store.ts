import { Model, model, prop } from 'mobx-keystone'

@model('carclaw/ChatStore')
export class ChatStore extends Model({
  loading: prop<boolean>(false).withSetter(),
  lastAssistantText: prop<string>('').withSetter(),
}) {
  persistKeys() {
    return [] as string[]
  }
}
