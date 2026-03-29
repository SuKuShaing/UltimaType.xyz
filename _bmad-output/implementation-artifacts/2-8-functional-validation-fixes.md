# Story 2.8: Functional Validation Fixes

Status: ready-for-dev

## Story

As the development team,
We want to fix bugs discovered during the post-Epic 2 functional validation,
So that the core gameplay experience works correctly before starting Epic 3.

## Context

Created during Epic 2 retrospective functional validation phase (2026-03-28/29). Seba tested the app as a real user and found bugs not caught by unit tests or code reviews. This story is a living document — new findings from the validation session are added as they are discovered.

## Acceptance Criteria (BDD)

### AC1: Local player caret visible

**Given** a player typing during an active match
**When** they type characters
**Then** a visible caret (vertical bar) appears at their current position in the text
**And** the caret moves instantly (no spring animation) as they type
**And** the caret is visually distinct from opponent carets (different style: thicker, own color, or pulsing)
**And** the caret follows line wrapping correctly

**Size:** Small — render a positioned div at `spanRefs[localPosition]`, no WebSocket, no backend changes.

**Files:** `arena-page.tsx`, possibly a new `local-caret.tsx` component or inline in `live-text-canvas.tsx`

---

### AC2: Opponent caret correctly positioned (X and Y axes)

**Given** an opponent typing during an active match with text that wraps to multiple lines
**When** their position updates via CARET_SYNC
**Then** their MultiplayerCaret appears at the correct character position including line wrapping (Y axis)

**Root cause analysis:**
- **Bug A (Critical):** `getCharX` uses `span.offsetLeft` which is relative to the span's offsetParent (inner text div), but the caret is positioned within `textContainerRef` (outer wrapper). Two layers of offset are ignored.
- **Bug B (Critical):** Only X axis is tracked (`translateX`). Caret is `absolute top-0`, so it never follows line wrapping.
- **Bug C (Moderate):** `disconnectedLabelRef` position is never updated in `updateCaretPosition`.
- **Bug D (Minor):** Spring state starts at pixel 0 on mount, causing a visual jump from left edge to actual position.

**Fix approach:**
- Replace `getCharX` with `getCharPosition` using `getBoundingClientRect()` relative to container, returning `{ x, y }`
- Change transform from `translateX(${x}px)` to `translate(${x}px, ${y}px)`
- Add Y axis to spring interpolation (or use instant Y positioning with spring only on X)
- Include `disconnectedLabelRef` in `updateCaretPosition`
- Initialize spring `current` to target position on first frame to avoid jump

**Size:** Moderate — touches spring animation, position calculation, and needs visual testing with multi-line texts.

**Files:** `multiplayer-caret.tsx`

---

### AC3: Post-login redirect preserves intended URL

**Given** an unauthenticated user who opens a room link like `/room/NTZAUY`
**When** they complete OAuth login
**Then** they are redirected to `/room/NTZAUY` (not to `/`)

**Root cause:** `ProtectedRoute` redirects to `/` without saving the intended URL. `AuthCallback` always navigates to `/` on success.

**Fix approach:**
- `ProtectedRoute`: save `window.location.pathname + window.location.search` to `sessionStorage` key `redirectAfterLogin` before navigating to `/`
- `AuthCallback`: after successful token exchange, read `redirectAfterLogin` from `sessionStorage`, remove it, navigate there (fallback to `/`)

**Size:** Small — 2 files, ~5 lines total, no backend changes.

**Files:** `protected-route.tsx`, `auth-callback.tsx`

---

### AC4: OAuth code exchange fix (already applied)

**Given** a user completing OAuth login
**When** the browser redirects to `/auth/callback?code=JWT`
**Then** the frontend exchanges the code via `POST /auth/code` for real tokens

**Status:** Already fixed during this session. `handleCallback` in `use-auth.ts` now calls `POST /auth/code` instead of looking for tokens in URL params. `auth-callback.tsx` updated to handle async.

**Files:** `use-auth.ts`, `auth-callback.tsx` (already modified)

---

### AC5: Join room by code from home screen

**Given** an authenticated user on the home screen
**When** they have a room code (e.g. "NTZAUY") shared by a friend
**Then** they can paste/type the code into an input field and click "Unirse" to join that room
**And** they are navigated to `/room/{code}`
**And** the input validates the code format (6 characters, uppercase alphanumeric) before navigating

**Size:** Small — a text input + button on the home screen in `app.tsx`, navigates to `/room/{code}`. No backend changes.

**Files:** `app.tsx`

---

### AC6: Allow solo play (1 player start)

**Given** a host alone in a room lobby
**When** they click "Iniciar"
**Then** the match starts normally with 1 player (no minimum 2 players requirement)
**And** the player can type, see their WPM/precision, and see results when finished

**Root cause:** `rooms.service.ts:canStart` has `if (players.length < 2) return false` and the gateway error says "Se necesitan al menos 2 jugadores". Change to `players.length < 1` (or `=== 0`).

**Size:** Small — 1 line in `rooms.service.ts`, update error message in `game.gateway.ts`, update related tests.

**Files:** `rooms.service.ts`, `game.gateway.ts`

---

### AC7: Time limit selector in lobby

**Given** a host in the room lobby configuring the match
**When** they look at the match settings
**Then** they see a time limit selector with options: "Hasta terminar el texto (recomendado)" (default), 30s, 1min, 2min, 3min, 4min, 5min
**And** the selected time limit is broadcast to all players in the room (like difficulty level)
**And** "Hasta terminar el texto" uses the 5min hardcode as a safety net maximum
**And** when a timed match ends by timeout, players see "Tiempo agotado" in results

**Implementation:**

**Shared (`libs/shared`):**
- Add `TIME_LIMIT_OPTIONS` constant: `[0, 30_000, 60_000, 120_000, 180_000, 240_000, 300_000]` where `0` = "until text finished" (uses 300_000 as safety net)
- Add `SET_TIME_LIMIT` to `WS_EVENTS` (or extend `SET_LEVEL` to include timeLimit)
- Add `timeLimit` to room-related DTOs

**Backend:**
- Add `timeLimit` field to room state in Redis (default: `0`)
- New WS handler `SET_TIME_LIMIT` (host only, lobby only) — validates value is in allowed options, stores in Redis, broadcasts updated `LOBBY_STATE`
- `startMatchTimeout` reads `timeLimit` from room state. If `0`, use `MATCH_TIMEOUT_MS` (5min). Otherwise use the selected value.

**Frontend:**
- Add time limit selector in lobby UI (buttons or dropdown, similar to difficulty selector)
- Default selection: "Hasta terminar el texto"
- Host can change; non-host players see the selection but can't change it
- Emit `SET_TIME_LIMIT` on change

**Size:** Moderate — touches shared, backend (Redis + gateway), and frontend (lobby UI).

**Files:** `libs/shared` (constants, events, DTOs), `rooms.service.ts`, `game.gateway.ts`, lobby components

---

### AC8: FocusWPMCounter positioning and opacity

**Given** a player in an active race with Focus Fade enabled
**When** they look at the live WPM counter
**Then** the counter is positioned with enough separation from the text (not overlapping)
**And** the opacity is readable enough to glance at during typing (currently too faint)

**Size:** Small — CSS adjustments in `focus-wpm-counter.tsx`. No logic changes.

**Files:** `focus-wpm-counter.tsx`

---

### AC9: Rematch button not working

**Given** a completed match showing the results overlay
**When** the host clicks "Revancha"
**Then** the match state resets and all players return to the lobby in `waiting` status

**Root cause (investigated):** Two bugs cooperating:

1. **`LobbyPage` never passes `onReturnToLobby` to `ArenaPage`** (`lobby-page.tsx:53`). The prop is `undefined`, so calling it does nothing or crashes silently.

2. **`useLobby` LOBBY_STATE listener doesn't reset match state.** When the server broadcasts `LOBBY_STATE` with `status='waiting'` after rematch, `useLobby` updates `roomState` but `matchStarted` remains `true` and `matchData` remains set. `LobbyPage` keeps rendering `ArenaPage` instead of the lobby.

**Fix approach:**
- In `use-lobby.ts`: when `LOBBY_STATE` arrives with `status === 'waiting'` and `matchStarted` is true, reset `matchStarted=false` and `matchData=null`. This alone is sufficient — React re-renders `LobbyPage` which stops rendering `ArenaPage` and shows the lobby.
- In `lobby-page.tsx`: pass `onReturnToLobby` prop to `ArenaPage` as a safety fallback (calls a `resetMatch` function exposed by `useLobby`).

**Size:** Small — ~5 lines in `use-lobby.ts`, ~3 lines in `lobby-page.tsx`.

**Files:** `use-lobby.ts`, `lobby-page.tsx`

---

### AC10: Exit button on results screen

**Given** a player viewing the match results overlay
**When** they don't want a rematch and want to leave
**Then** they see a "Salir" button alongside "Revancha"
**And** clicking it disconnects the socket, leaves the room, and navigates to the home page

**Size:** Small — add a button in `match-results-overlay.tsx`. Disconnect socket + `window.location.href = '/'`.

**Files:** `match-results-overlay.tsx`

---

### AC11: Host configurable max players limit

**Given** a host in the room lobby configuring the match
**When** they look at the match settings
**Then** they see a max players selector with options from 2 to 20 (default: 20)
**And** the selected limit is broadcast to all players in the room
**And** when the room reaches the limit, new players are rejected with a message "Sala llena"

**Implementation:**

**Shared (`libs/shared`):**
- Add `MAX_PLAYERS_OPTIONS` constant or just validate range 2-20
- Add `maxPlayers` to room-related DTOs

**Backend:**
- Add `maxPlayers` field to room state in Redis (default: `20`)
- New WS handler `SET_MAX_PLAYERS` (host only, lobby only) — validates 2-20, stores in Redis, broadcasts updated `LOBBY_STATE`
- `joinRoom` checks current player count against `maxPlayers` and rejects if full

**Frontend:**
- Add max players selector in lobby UI (dropdown or number input, 2-20)
- Host can change; non-host players see the value but can't change it
- Emit `SET_MAX_PLAYERS` on change

**Size:** Moderate — same pattern as AC7 (time limit). Touches shared, backend (Redis + gateway + joinRoom validation), and frontend (lobby UI).

**Files:** `libs/shared` (DTOs), `rooms.service.ts`, `game.gateway.ts`, lobby components

---

## Dev Checklist

- [ ] AC1: Create local player caret with distinct visual style
- [ ] AC1: Position caret at current local position using span refs
- [ ] AC1: Verify caret follows line wrapping
- [ ] AC2: Replace getCharX with getCharPosition using getBoundingClientRect
- [ ] AC2: Add Y axis tracking to MultiplayerCaret
- [ ] AC2: Fix disconnectedLabelRef positioning
- [ ] AC2: Fix spring initialization jump
- [ ] AC2: Visual testing with multi-line texts
- [ ] AC3: Save intended URL in sessionStorage from ProtectedRoute
- [ ] AC3: Read and consume saved URL in AuthCallback
- [ ] AC4: Already done — verify tests pass
- [ ] AC5: Add room code input + "Unirse" button to home screen
- [ ] AC5: Validate code format before navigating
- [ ] AC6: Change canStart to allow 1 player
- [ ] AC6: Update error message
- [ ] AC6: Update related tests
- [ ] AC7: Add TIME_LIMIT_OPTIONS constant and SET_TIME_LIMIT event to shared lib
- [ ] AC7: Add timeLimit field to room state in Redis
- [ ] AC7: Add SET_TIME_LIMIT WebSocket handler (host only, lobby only)
- [ ] AC7: Update startMatchTimeout to use room's timeLimit
- [ ] AC7: Add time limit selector UI in lobby
- [ ] AC7: Verify timed matches end correctly with custom time limits
- [ ] AC8: Adjust FocusWPMCounter position and opacity
- [ ] AC9: Debug and fix rematch button
- [ ] AC10: Add "Salir" button to results overlay
- [ ] AC11: Add maxPlayers field to room state in Redis
- [ ] AC11: Add SET_MAX_PLAYERS WebSocket handler (host only, lobby only)
- [ ] AC11: Update joinRoom to validate against maxPlayers
- [ ] AC11: Add max players selector UI in lobby
- [ ] All existing tests pass (150 API + 77 web)
