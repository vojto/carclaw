import { observer } from 'mobx-react-lite'
import { Title } from '../components/title'

export const HomeScreen = observer(function HomeScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Title>Carclaw</Title>
    </div>
  )
})
