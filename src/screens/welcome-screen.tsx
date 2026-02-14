import { observer } from 'mobx-react-lite'
import { useStore } from '../stores/store-context'
import { Header } from '../components/header'
import { Text } from '../components/text'
import { BigButton } from '../components/big-button'

export const WelcomeScreen = observer(function WelcomeScreen() {
  const store = useStore()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-12 gap-12">
      <Header>Carclaw</Header>
      <Text className="text-center max-w-3xl">
        This app is designed to be used with a vehicle display. By continuing, you acknowledge that you are solely responsible for safe operation of your vehicle at all times. Do not interact with this app while driving.
      </Text>
      <BigButton onClick={() => store.acceptDisclaimer()}>I Understand</BigButton>
    </div>
  )
})
