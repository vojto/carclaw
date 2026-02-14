import { observer } from 'mobx-react-lite'
import { Header } from '../components/header'

export const HomeScreen = observer(function HomeScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Header>Carclaw</Header>
    </div>
  )
})
