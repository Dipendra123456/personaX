# Live/Socialize Page - Complete Implementation Guide

## Overview

This document describes the complete Live/Socialize page implementation for the AI Companion app. The feature enables real-time social interaction through chat, voice, and video rooms with queue-based matching, friend systems, and safety features.

## Architecture

### Technology Stack
- **Frontend**: Next.js + React, Zustand (state), Tailwind CSS, Socket.io client
- **Backend**: Node.js/Express, MongoDB, Socket.io server
- **Real-time**: Socket.io (signaling + room management)
- **WebRTC**: Agora.io (placeholder for Phase 6)
- **Authentication**: JWT Bearer tokens

## Implementation Phases

### ✅ Phase 1: Backend Infrastructure
**Status**: Complete

**Components Created**:
- 4 database models: `Room`, `MatchQueue`, `Friend`, `UserPreference`
- Service layer: `socialService.js` with 30+ functions
- 12 API routes under `/api/social/*`
- Socket.io event handlers
- Match queue worker (runs every 3 seconds)

**Key Features**:
- Room CRUD operations with auto-delete on empty
- Queue-based pair matching system
- Friend request management (pending/accepted/blocked)
- User preferences (identity, toggle settings)

**Files**:
```
backend/models/
  ├── Room.js
  ├── MatchQueue.js
  ├── Friend.js
  └── UserPreference.js

backend/routes/
  └── socialRoutes.js

backend/services/
  └── socialService.js

backend/sockets/
  └── index.js (extended with social events)
```

### ✅ Phase 2: Frontend State Management
**Status**: Complete

**Components Created**:
- Extended Zustand store with `liveState` slice
- `socialApi.js` service (API client)
- Custom hooks: `useLiveRoom.js`, `useMatchQueue.js`
- Settings UI integration

**Key Features**:
- Global state for rooms, queue, friends, preferences
- Real-time socket subscriptions
- Auto-navigation on match found

**Files**:
```
frontend/store/
  └── useCompanionStore.js (extended)

frontend/services/
  └── socialApi.js

frontend/hooks/
  ├── useLiveRoom.js
  └── useMatchQueue.js
```

### ✅ Phase 3: Live Page UI (All 10 Sections)
**Status**: Complete

**Components Created**:
- Main socialize page with all 10 sections
- 5 reusable components
- Live room view with chat

**10 Sections Implemented**:
1. ✅ Header (Title + subtitle)
2. ✅ Primary Actions (3 large buttons)
3. ✅ Live Rooms (card grid with filters)
4. ✅ Quick Connect (random matching)
5. ✅ Create Room (modal form)
6. ✅ Friends & Following (online friends)
7. ✅ Identity (profile/anonymous/AI selector)
8. ✅ Preferences (toggles)
9. ✅ Safety (block/report/mute)
10. ✅ AI Companion (toggle)

**Files**:
```
frontend/pages/
  ├── socialize.js (main page)
  └── live-room.js (in-room view)

frontend/components/
  ├── RoomCard.jsx
  ├── FriendListItem.jsx
  ├── QuickMatchButton.jsx
  ├── CreateRoomModal.jsx
  ├── BlockModal.jsx
  └── VideoGrid.jsx (WebRTC placeholder)
```

### ✅ Phase 4: Room Joining + Friends System
**Status**: Complete

**Features Implemented**:
- Real-time room join/leave with participant sync
- Friend request flow (send → pending → accept)
- Pending request display and accept/decline UI
- Block and report user functionality
- Socket event listeners for friend notifications
- Real-time participant list updates

**Key Handlers**:
- `handleJoinRoom()` - Join room API + auto-navigate
- `handleSendFriendRequest()` - Send friend request
- `handleAcceptFriendRequest()` - Accept request
- `handleBlockUser()` - Block/report user
- Socket listeners for `friend:request-received`, `friend:accepted`

### ✅ Phase 5: Queue Matching & WebRTC Placeholder
**Status**: Complete

**Features Implemented**:
- Quick Match buttons (Chat/Voice/Video) trigger queue join
- Match queue worker automatically pairs users every 3 seconds
- Socket event `match:found` auto-navigates matched users to room
- VideoGrid component with mute/video controls UI
- Responsive grid layout (1-4 participants)
- Control badges and online status

**WebRTC Placeholder**:
- VideoGrid displays mock video feeds
- Mute/camera toggle buttons functional (local only)
- Info banner: "Phase 6: Integrate Agora.io"
- Ready for WebRTC provider integration

**Match Queue Flow**:
1. User clicks "Random Chat/Voice/Video"
2. User joins MatchQueue
3. Backend worker pairs with another waiting user
4. New Room created
5. Socket emits `match:found` to both users
6. Both auto-navigate to `/live-room/[roomId]`

## Setup Instructions

### Prerequisites
- Node.js 16+
- MongoDB running locally or remote URI in `.env`
- npm or yarn

### Backend Setup

1. **Install dependencies**:
   ```bash
   cd personaX/backend
   npm install
   ```

2. **Configure .env**:
   ```
   PORT=5000
   CORS_ORIGIN=http://localhost:3000
   MONGODB_URI=mongodb://localhost:27017/personax
   JWT_SECRET=your-jwt-secret
   
   # Optional for Phase 6 (Agora WebRTC)
   AGORA_APP_ID=your-agora-app-id
   AGORA_CERTIFICATE=your-agora-certificate
   ```

3. **Start backend**:
   ```bash
   npm run dev
   ```

   The backend will:
   - Connect to MongoDB
   - Start Express server on port 5000
   - Initialize Socket.io
   - Start match queue worker (runs every 3 seconds)
   - All `/api/social/*` endpoints ready

### Frontend Setup

1. **Install dependencies**:
   ```bash
   cd personaX/frontend
   npm install
   ```

2. **Configure .env.local** (if needed):
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
   ```

3. **Start frontend**:
   ```bash
   npm run dev
   ```

   Then open `http://localhost:3000` → click **Socialize** tab

## Testing Guide

### Test 1: View Live Page
1. Log in to app
2. Click "Socialize" in sidebar
3. **Expected**: All 10 sections render properly
4. **Verify**: No console errors, responsive on mobile

### Test 2: Create a Room
1. Click any room type button (or "Create Your Space" section)
2. Fill in room title, select type (chat/voice/video)
3. Click "Create Room"
4. **Expected**: Room created, auto-joined, navigated to `/live-room/[id]`
5. **Verify**: Chat area ready, controls functional

### Test 3: Quick Match (Single User)
1. Click "Random Chat" button
2. **Expected**: Button shows "Searching..." (animated)
3. Wait 10+ seconds
4. **Expected**: No match (need 2 users minimally)
5. Click "Cancel" or wait for timeout

### Test 4: Quick Match (Two Users in Separate Tabs)
1. **Tab 1**: Log in as User A, go to Socialize
2. **Tab 2**: Log in as User B (or same user), go to Socialize
3. **Tab 1**: Click "Random Chat"
4. **Tab 2**: Click "Random Chat"
5. **Expected**: Both users search for 3-5 seconds, then auto-navigate to same room
6. **Verify**: Can chat back and forth

### Test 5: Friend Requests
1. **User A**: Go to Socialize
2. **User B**: Send friend request to User A (via `/api/social/friends/{userId}/add`)
3. **User A**: Refresh page
4. **Expected**: Pending request appears in "Friends & Following" section
5. **User A**: Click "Accept"
6. **Expected**: User B added to friends list
7. **Verify**: Both users see each other in friends

### Test 6: Block User
1. In "Safety & Moderation" section
2. Click "Block User"
3. Select block in modal
4. Click "Block"
5. **Expected**: Modal closes, success message
6. **Verify**: Blocked user can't see you in room lists

### Test 7: Chat in Room
1. Join a room (create or quick match)
2. Type message in chat input
3. Send
4. **Expected**: Message appears in chat area with username + timestamp
5. **Verify**: Compatible with existing chat patterns

### Test 8: Leave Room
1. In live room, click "Leave Room"
2. **Expected**: Navigated back to `/socialize`
3. If you were last user:
   - **Verify**: Room deleted from list (auto-cleanup)
4. If others remain:
   - **Verify**: Room still in list, you removed from participant list

## Data Flow Diagrams

### Quick Match Flow
```
User A clicks "Random Chat"
    ↓
POST /social/queue/join { type: "chat" }
    ↓
MatchQueue entry created (userId, type, status="waiting")
    ↓
[3 second polling: matchQueueWorker runs]
    ↓
Query: 2+ waiting "chat" entries found
    ↓
Create Room, add both users
    ↓
Update queue entries: status="matched", matchedRoomId=X
    ↓
Socket event match:found to both users → auto-navigate
```

### Friend Request Flow
```
User A: POST /social/friends/{userId}/add
    ↓
Friend record created (fromUser=A, toUser=B, status="pending")
    ↓
Socket event: friend:request-sent  → User B notified
    ↓
User B sees pending request UI
    ↓
User B clicks "Accept"
    ↓
POST /social/friends/{userId}/accept
    ↓
Friend record updated: status="accepted"
    ↓
Socket event: friend:accepted → User A notified
    ↓
Both users' friend lists updated
```

## Socket Events Reference

### Room Events
- `user:joined-room` — User joined room (broadcast to room)
- `user:left-room` — User left room (broadcast to room)
- `room:updated` — Room metadata changed

### Queue & Matching
- `match:found` — Queue match successful (targeted to both users)
- `match:expired` — Queue entry timeout (targeted to user)

### Friends
- `friend:request-sent` — Friend request sent (targeted to recipient)
- `friend:accepted` — Friend request accepted (targeted to sender)

### Controls
- `mute:user` — User muted (broadcast to room)
- `unmute:user` — User unmuted (broadcast to room)

### WebRTC Signaling (Phase 6)
- `webrtc:offer` — SDP offer
- `webrtc:answer` — SDP answer
- `webrtc:ice-candidate` — ICE candidate

## API Endpoints Summary

### Rooms
- `POST /social/rooms` — Create room
- `GET /social/rooms?type=chat&limit=20&page=1` — List rooms
- `GET /social/rooms/:id` — Room details
- `POST /social/rooms/:id/join` — Join room
- `POST /social/rooms/:id/leave` — Leave room

### Queue
- `POST /social/queue/join` — Join match queue
- `POST /social/queue/leave` — Leave queue
- `GET /social/queue/status` — Get queue position/status

### Friends
- `POST /social/friends/:userId/add` — Send friend request
- `POST /social/friends/:userId/accept` — Accept request
- `GET /social/friends` — Get accepted friends
- `GET /social/friends/pending` — Get pending requests
- `POST /social/users/:userId/block` — Block user
- `POST /social/users/:userId/report` — Report user
- `GET /social/users/blocked` — Get blocked users list

### Preferences
- `GET /social/preferences` — Get user preferences
- `POST /social/preferences` — Update preferences

## Phase 6: WebRTC Integration (TODO)

To complete the Live page with real video/audio:

### Steps:
1. **Get Agora Account**:
   - Sign up: https://console.agora.io
   - Create app, copy App ID + Certificate

2. **Update Backend**:
   ```bash
   npm install agora-access-token
   ```
   - Add endpoint: `POST /social/rooms/:id/webrtc-token`
   - Generate tokens using Agora SDK

3. **Update Frontend**:
   ```bash
   npm install agora-rtc-sdk-ng
   ```
   - Create `useWebRTC.js` hook
   - Replace VideoGrid placeholder
   - Join Agora channel with token

4. **Update .env**:
   ```
   AGORA_APP_ID=xxx
   AGORA_CERTIFICATE=xxx
   ```

## Known Limitations & TODOs

- ⚠️ WebRTC video/audio disabled (placeholder UI only) - Phase 6
- ⚠️ Screen sharing not implemented - Future phase
- ⚠️ Online status hardcoded to random - Connect to user presence system
- ⚠️ Decline friend request needs implementation
- ⚠️ Admin moderation dashboard not included
- ⚠️ Analytics/activity logging not included

## Troubleshooting

### "Room not found" error
- **Cause**: Room deleted (last user left)
- **Fix**: Go back to `/socialize`, create new room

### Match queue not pairing users
- **Cause**: Match worker may not be running or timeout is too long
- **Check**: Backend logs show "Queue worker started"
- **Verify**: 2+ users in same queue type, wait 5 seconds

### Socket connection failed
- **Cause**: Backend not running or CORS issue
- **Check**: `echo GET http://localhost:5000/health`
- **Fix**: Restart backend, verify CORS_ORIGIN in .env

### Friends list not updating
- **Cause**: Socket event not received
- **Check**: Browser console for socket connection status
- **Fix**: Refresh page, re-login if needed

## Performance Notes

- Room list refreshes every 5 seconds (configurable)
- Match worker runs every 3 seconds (configurable)
- Queue timeout: 5 minutes per entry
- Socket events broadcast only to affected rooms/users
- No message history retrieval (future optimization)

## Security Notes

- All social routes require authentication (Bearer token)
- Friend relationships: unique index prevents duplicates
- Block relationships: prevent visibility + contact
- Report data: persisted for moderation review
- Socket.io: user:connect registers user for targeted notifications

## File Structure

```
personaX/
├── backend/
│   ├── models/
│   │   ├── Room.js
│   │   ├── MatchQueue.js
│   │   ├── Friend.js
│   │   └── UserPreference.js
│   ├── routes/
│   │   └── socialRoutes.js
│   ├── services/
│   │   └── socialService.js
│   ├── sockets/
│   │   └── index.js (extended)
│   └── server.js (extended)
│
├── frontend/
│   ├── pages/
│   │   ├── socialize.js
│   │   └── live-room.js
│   ├── components/
│   │   ├── RoomCard.jsx
│   │   ├── FriendListItem.jsx
│   │   ├── QuickMatchButton.jsx
│   │   ├── CreateRoomModal.jsx
│   │   ├── BlockModal.jsx
│   │   └── VideoGrid.jsx
│   ├── hooks/
│   │   ├── useLiveRoom.js
│   │   └── useMatchQueue.js
│   ├── services/
│   │   └── socialApi.js
│   └── store/
│       └── useCompanionStore.js (extended)
```

---

**Status**: Fully functional through Phase 5. Ready for Phase 6 (WebRTC) integration.

**Last Updated**: April 9, 2026
