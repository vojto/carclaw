import {
  fromSnapshot,
  onSnapshot,
  registerRootStore,
} from "mobx-keystone";
import { getFilteredSnapshot } from "./lib/persist";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app.tsx";
import "./index.css";
import { RootStore } from "./stores/root-store";
import { StoreContext } from "./stores/store-context";

const STORAGE_KEY = "carclaw_store";

function loadStore(): RootStore {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return fromSnapshot<RootStore>(JSON.parse(saved));
    } catch {
      // corrupted data, start fresh
    }
  }
  return new RootStore({});
}

const store = loadStore();
registerRootStore(store);

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
onSnapshot(store, () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getFilteredSnapshot(store)));
  }, 500);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoreContext.Provider value={store}>
      <App />
    </StoreContext.Provider>
  </StrictMode>,
);
