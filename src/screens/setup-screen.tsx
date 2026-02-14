import { observer } from 'mobx-react-lite'
import { useStore } from '../stores/store-context'
import { Title } from '../components/title'
import { Text } from '../components/text'
import { BigButton } from '../components/big-button'
import { TextInput } from '../components/text-input'

export const SetupScreen = observer(function SetupScreen() {
  const store = useStore()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-12 gap-10">
      <Title>Connect</Title>
      <div className="flex flex-col gap-6 w-full max-w-2xl">
        <TextInput label="Gateway Host" value={store.host} placeholder="127.0.0.1" onChange={(v) => store.setHost(v)} />
        <TextInput label="Port" value={store.port} placeholder="18789" onChange={(v) => store.setPort(v)} />
        <TextInput label="Token" value={store.token} placeholder="Enter your auth token" onChange={(v) => store.setToken(v)} />
      </div>
      {store.connectError && (
        <Text className="text-red-400">{store.connectError}</Text>
      )}
      <BigButton onClick={() => store.connect()}>
        {store.connecting ? 'Connecting...' : 'Connect'}
      </BigButton>
    </div>
  )
})
