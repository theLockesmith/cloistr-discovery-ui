# CLAUDE.md - coldforge-discovery-ui

**Relay discovery web UI - find, filter, and manage Nostr relays**

## REQUIRED READING (Before ANY Action)

**Claude MUST read this file at the start of every session:**
- `~/claude/coldforge/cloistr/CLAUDE.md` - Cloistr project rules (contains further required reading)

## Documentation

Full documentation: `~/claude/coldforge/cloistr/services/discovery-ui/CLAUDE.md`

## Autonomous Work Mode (CRITICAL)

**Work autonomously. Do NOT stop to ask what to do next.**

- Keep working until the task is complete or you hit a genuine blocker
- Use the "Next Steps" section in the service docs to know what to work on
- Make reasonable decisions - don't ask for permission on obvious choices
- If tests fail, fix them. If code needs review, use the reviewer agent. Keep going.

## Agent Usage

| When... | Use agent... |
|---------|-------------|
| Starting new work | `explore` |
| Writing code | `reviewer` after changes |
| Writing tests | `test-writer` |
| Running tests | `tester` |
| Bugs | `debugger` |
| Dockerfiles | `docker` |
| K8s deployment | `atlas-deploy` |
| Auth/crypto code | `security` |

## Tech Stack

- **Language:** TypeScript
- **Framework:** SolidJS
- **Build:** Vite
- **Nostr:** nostr-tools

## Project Structure

```
src/
├── components/       # UI components
│   ├── RelayCard.tsx
│   ├── RelayList.tsx
│   ├── FilterBar.tsx
│   └── LoginButton.tsx
├── lib/              # Utilities and API
│   ├── api.ts        # Discovery API client
│   ├── nostr.ts      # NIP-07/NIP-46 auth
│   └── types.ts      # TypeScript types
├── App.tsx           # Main app component
├── App.css           # Styles
└── index.tsx         # Entry point
```

## Commands

```bash
pnpm dev      # Start dev server
pnpm build    # Build for production
pnpm preview  # Preview production build
```

## API

Backend: `https://discovery.coldforge.xyz/api/v1/`

```typescript
// Get relays with filters
const relays = await api.getRelays({
  health: 'online',
  nips: '50',
  topic: 'bitcoin',
});
```

## Deployment & DNS

All services deployed via Atlas:
- **Atlas docs:** `~/Atlas/CLAUDE.md`
- **DNS (public):** `flarectl` + `~/Atlas/roles/kube/cloistr-tunnel/`
- **DNS (internal):** `~/Atlas/roles/nginx_proxy/`

## See Also

- Service Documentation: `~/claude/coldforge/cloistr/services/discovery-ui/CLAUDE.md`
- Discovery Backend: `~/Development/coldforge-discovery/`
- Atlas Documentation: `~/Atlas/CLAUDE.md`
