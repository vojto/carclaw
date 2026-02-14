import { observer } from 'mobx-react-lite'
import { useStore } from './stores/store-context'
import { Screen } from './stores/root-store'
import { WelcomeScreen } from './screens/welcome-screen'
import { SetupScreen } from './screens/setup-screen'
import { HomeScreen } from './screens/home-screen'
import { SessionsScreen } from './screens/sessions-screen'
import { ChatScreen } from './screens/chat-screen'

const App = observer(function App() {
  const store = useStore()

  switch (store.screen) {
    case Screen.Welcome:
      return <WelcomeScreen />
    case Screen.Setup:
      return <SetupScreen />
    case Screen.Home:
      return <HomeScreen />
    case Screen.Sessions:
      return <SessionsScreen />
    case Screen.Chat:
      return <ChatScreen />
  }
})

export default App
