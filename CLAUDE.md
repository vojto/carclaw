# Carclaw

Voice-powered client for OpenClaw, built with Vite + React + TypeScript.

## Self-Improvement

- **CLAUDE.md is the project's living memory.** When you discover a better pattern, get steered in a new direction, or learn a gotcha — update CLAUDE.md **in the same commit** as the code change. Don't wait to be asked.
- Capture **general principles**, not specific implementation details. Good: "Use `when()` from mobx to wait for async conditions." Bad: "SessionsStore uses `when()` on line 24."
- When the user corrects your approach, that's a signal to write it down so future sessions don't repeat the mistake.

## Workflow

- **Auto-commit**: After finishing a chunk of work, automatically commit and push. Don't wait for the user to ask. Keep commits small and focused.

## Testing & Credentials

- Credentials live in `.env` (gitignored). Read from `.env` whenever testing via WebSocket (`websocat`) or browser automation (Playwright skill).
- Variables: `OPENCLAW_TOKEN`, `OPENCLAW_WS_URL` (default `ws://127.0.0.1:18789`).
- To explore the WebSocket API: `websocat $OPENCLAW_WS_URL` then send JSON messages.

## UI Design

- **Target device: Tesla car screen.** All UI must be large, bold, and easy to tap — think CarPlay / automotive style.
- Use oversized text (`text-3xl` minimum for body, `text-6xl` for headings), large buttons (`py-6 px-16`, `text-4xl`), and generous spacing (`gap-12`, `p-12`).
- Dark background (`#000`), white text. Keep it high-contrast and glanceable.
- Rounded corners on interactive elements (`rounded-2xl` for buttons).
- No tiny controls, no dense layouts. Every tap target should be easy to hit without looking.
- **No hover states** — this is a touchscreen. Only use `active:` for press feedback.
- **No loading flicker.** Only show a loading indicator when there's nothing else to display. If stale data exists, keep showing it while refreshing in the background.

## Navigation

- The current route is a **discriminated union** (`Route` type) stored in `RootStore.route`. Some routes carry arguments (e.g. `{ type: 'chat'; sessionKey: string }`).
- `app.tsx` switches on `route.type` to render the correct screen component.
- Screen components live in `src/screens/`.
- The route is persisted to `localStorage`, so the app reopens to the last screen.

## Code Organization

- **Group methods in classes** using `// ─── Group Name ───` comment separators. This applies to all classes (stores, clients, etc.).
- **Lifecycle goes first** — `open()`/`close()`, `connect()`/`disconnect()`, or similar mount/unmount pairs always appear as the first group.
- Other groups depend on the class (e.g. Data, Recording, Authentication, Internal). Keep groups logical and consistent.

## Naming Conventions

- **All filenames use dash-case** (e.g. `root-store.ts`, `claw-client.ts`, `welcome-screen.tsx`). No PascalCase or camelCase filenames.

## Tech Stack

- **Vite** + **React** + **TypeScript**
- **Tailwind CSS** v4 (via `@tailwindcss/vite` plugin)
- **mobx-keystone** for state management, **mobx-react-lite** for React bindings
- **Lucide React** for icons
- **Hono** for backend API (runs on Cloudflare Workers)
- **Cloudflare Workers** for hosting (SPA + API in one deploy)
- **pnpm** as package manager, **mise** for Node.js version management

## State Management

- **Component-local state**: Use `useState` for state that only lives in a single component.
- **Shared state**: Use mobx-keystone stores. Never use `useState` for state shared between components.

### mobx-keystone Store Architecture

- There is a single `RootStore` created at app startup, registered as the root store, and provided via React context (`StoreContext`).
- Access the store in components with `useStore()` from `src/stores/store-context.ts`.
- The entire root store is auto-persisted to `localStorage` via `onSnapshot`. On startup, the store is restored from `localStorage` with `fromSnapshot`.
- Feel free to split into sub-stores as the app grows. Keep everything in `RootStore` until it gets unwieldy.

### Thin Components, Fat Stores

- **Keep React components thin.** `useEffect` hooks should just call a method on the store — all real logic (fetching, subscriptions, data transforms) lives in the mobx-keystone stores.
- Components render store state and invoke store actions. That's it.

### Waiting for Async Conditions

- Use `when()` from `mobx` to wait for an observable to become truthy. It fires immediately if the condition is already met, or waits until it is. Returns a disposer for cancellation.
- Example: a store's `open()` waits for `root.connected` before loading data. If the screen unmounts first, `close()` cancels the `when`.

### mobx-keystone Conventions

- Use `@model('carclaw/ModelName')` decorator on store classes.
- Extend `Model({...})` with `prop<T>()` / `prop(default)` for observable, snapshotable properties.
- Use `.withSetter()` on props instead of writing manual setter actions. Only use `@modelAction` for methods with logic beyond a simple set.
- **Always use keystone `prop` for reactive state** — even for ephemeral data that isn't persisted. Use `persistKeys()` to control what gets saved. Never use `@observable` from `mobx` as a substitute; it bypasses keystone's snapshot system and creates inconsistency.
- Non-serializable state (like WebSocket clients, unsubscribe callbacks) should be plain class properties, not `prop`.
- Wrap **every** React component that reads store state with the `observer()` HOC from `mobx-react-lite`.

```tsx
import { observer } from 'mobx-react-lite'
import { useStore } from '../stores/store-context'

const MyComponent = observer(function MyComponent() {
  const store = useStore()
  return <div>{store.someValue}</div>
})
```

## Project Structure

```
src/
  lib/
    claw-client.ts           # WebSocket client for OpenClaw
  stores/
    root-store.ts            # Root mobx-keystone store
    store-context.ts         # React context + useStore hook
  screens/
    welcome-screen.tsx       # Disclaimer / acceptance screen
    setup-screen.tsx         # Gateway connection setup
    home-screen.tsx          # Main screen with mic button
  components/
    big-button.tsx           # Large tap-friendly button
    text-input.tsx           # Large text input field
    title.tsx                # Heading component
    text.tsx                 # Body text component
  app.tsx                    # Screen router
  main.tsx                   # Entry point, store setup + persistence
```

- `src/lib/` — **reusable, domain-agnostic** classes and utilities. Code here should be generic enough to use in other apps (e.g. `AudioRecorder`, `ClawClient`). No imports from `stores/` or app-specific logic.
- `src/stores/` — mobx-keystone stores
- `src/screens/` — top-level screen components
- `src/components/` — reusable UI components
- `worker/` — Hono backend API (Cloudflare Workers)

## Backend (Cloudflare Workers)

- The backend is a **Hono** app in `worker/index.ts`, deployed as a Cloudflare Worker.
- All API routes live under `/api/*`. The worker handles these; everything else falls through to the SPA.
- Config is in `wrangler.jsonc`. The `@cloudflare/vite-plugin` integrates the worker into `vite dev`.
- `pnpm dev` starts both the SPA and the worker. `pnpm deploy` deploys to Cloudflare.
- Worker has its own tsconfig (`tsconfig.worker.json`) with `@cloudflare/workers-types`.
