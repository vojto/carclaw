import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerRootStore, getSnapshot, fromSnapshot } from 'mobx-keystone'
import './index.css'
import App from './app.tsx'
import { RootStore } from './stores/root-store'
import { StoreContext } from './stores/store-context'
import { onSnapshot } from 'mobx-keystone'

const STORAGE_KEY = 'carclaw_store'

function loadStore(): RootStore {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      return fromSnapshot<RootStore>(JSON.parse(saved))
    } catch {
      // corrupted data, start fresh
    }
  }
  return new RootStore({})
}

const store = loadStore()
registerRootStore(store)

onSnapshot(store, (snapshot) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreContext.Provider value={store}>
      <App />
    </StoreContext.Provider>
  </StrictMode>,
)
