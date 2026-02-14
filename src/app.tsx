import { observer } from 'mobx-react-lite'
import { useStore } from './stores/store-context'
import { WelcomeScreen } from './screens/welcome-screen'
import { SetupScreen } from './screens/setup-screen'
import { SessionsScreen } from './screens/sessions-screen'
import { ChatScreen } from './screens/chat-screen'

const App = observer(function App() {
  const store = useStore()

  switch (store.route.type) {
    case 'welcome':
      return <WelcomeScreen />
    case 'setup':
      return <SetupScreen />
    case 'sessions':
      return <SessionsScreen />
    case 'chat':
      return <ChatScreen />
  }
})

export default App
