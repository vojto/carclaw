import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useViewModel } from '../view-models/view-model-context'
import { Title } from '../components/title'
import { BigButton } from '../components/big-button'
import { TextInput } from '../components/text-input'

export const SetupScreen = observer(function SetupScreen() {
  const vm = useViewModel()
  const [host, setHost] = useState('127.0.0.1')
  const [port, setPort] = useState('18789')
  const [token, setToken] = useState('')

  const handleConnect = () => {
    vm.connect(host, port, token)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-12 gap-10">
      <Title>Connect</Title>
      <div className="flex flex-col gap-6 w-full max-w-2xl">
        <TextInput label="Gateway Host" value={host} placeholder="127.0.0.1" onChange={setHost} />
        <TextInput label="Port" value={port} placeholder="18789" onChange={setPort} />
        <TextInput label="Token" value={token} placeholder="Enter your auth token" onChange={setToken} />
      </div>
      <BigButton onClick={handleConnect}>Connect</BigButton>
    </div>
  )
})
