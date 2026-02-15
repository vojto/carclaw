import { observer } from 'mobx-react-lite'
import { useStore } from '../stores/store-context'
import { Header } from '../components/header'
import { Text } from '../components/text'
import { BigButton } from '../components/big-button'
import { TextInput } from '../components/text-input'
import { Spinner } from '../components/spinner'

export const SetupScreen = observer(function SetupScreen() {
  const store = useStore()

  let statusMessage = '\u00A0'
  let statusColor = ''
  if (store.connecting) {
    statusMessage = 'Connecting...'
    statusColor = 'text-gray-400'
  } else if (store.connectError) {
    statusMessage = store.connectError
    statusColor = 'text-red-400'
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-12 gap-10">
      <Header>Connect</Header>
      <div className="flex flex-col gap-6 w-full max-w-2xl">
        <TextInput label="Gateway Host" value={store.host} placeholder="127.0.0.1" onChange={(v) => store.setHost(v)} />
        <TextInput label="Port" value={store.port} placeholder="18789" onChange={(v) => store.setPort(v)} />
        <TextInput label="Token" value={store.token} placeholder="Enter your auth token" onChange={(v) => store.setToken(v)} />
        <TextInput label="Groq API Key" value={store.groqApiKey} placeholder="Enter your Groq API key" onChange={(v) => store.setGroqApiKey(v)} />
        <TextInput label="ElevenLabs API Key" value={store.elevenlabsApiKey} placeholder="Enter your ElevenLabs API key" onChange={(v) => store.setElevenlabsApiKey(v)} />
      </div>
      <div className="flex items-center gap-4 h-12">
        {store.connecting && <Spinner />}
        <Text className={statusColor}>{statusMessage}</Text>
      </div>
      <BigButton onClick={() => store.connect()}>Connect</BigButton>
    </div>
  )
})
