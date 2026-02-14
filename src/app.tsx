import { observer } from 'mobx-react-lite'
import { useViewModel } from './view-models/view-model-context'
import { Screen } from './view-models/screen'
import { WelcomeScreen } from './screens/welcome-screen'
import { HomeScreen } from './screens/home-screen'

const App = observer(function App() {
  const vm = useViewModel()

  switch (vm.screen) {
    case Screen.Welcome:
      return <WelcomeScreen />
    case Screen.Home:
      return <HomeScreen />
  }
})

export default App
