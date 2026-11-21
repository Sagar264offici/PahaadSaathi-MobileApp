# PahaadSaathi — Current Architecture Analysis
**Date:** 2026-11-21  
**Repository State:** Audited & Base-Committed

---

## 1. System Topology Overview

```
                                +-----------------------------------+
                                |    Supabase Cloud / PostgreSQL     |
                                |  (PostGIS, Auth, Storage, Edge)   |
                                +-----------------+-----------------+
                                                  |
                         HTTPS / TLS (REST / Realtime / Storage API)
                                                  |
                    +-----------------------------+-----------------------------+
                    |                                                           |
+-------------------+-------------------+                 +---------------------+-------------------+
|      Mobile Client (React Native)      |                 |   District Control Room (Web Dashboard)   |
| - Expo Router (App Tabs & Stacks)      |                 | - Incident Monitoring & Triage        |
| - SQLite Repository (Durable Outbox)   |                 | - GIS Hazard Layer & Shelter Map      |
| - Emergency SMS Engine (Single Comp.)  |                 | - Volunteer & Resource Allocation     |
| - BLE Store-and-Forward Relay          |                 | - Multi-Person Alert Approvals        |
| - Offline Safety Guides & Cache        |                 +-----------------------------------------+
+-------------------+-------------------+
                    |
      Opportunistic Bluetooth LE
                    |
+-------------------+-------------------+
|      Nearby Peer Mobile Node          |
| - Hop Relay (Max 5 hops)              |
| - Deduplicated Forwarding             |
+---------------------------------------+
```

---

## 2. Component Boundaries & State Layers

### 2.1 Mobile Application (`src/`)
- `src/app/`: Expo Router routes.
  - `(tabs)/` or root stack: Core screens (`index.tsx`, `emergency.tsx`, `map.tsx`, `community.tsx`, `account.tsx`).
- `src/theme/`: Visual token system and palette definitions.
- `src/lib/db.ts`: Local storage engine (migrating to SQLite durable outbox).
- `src/lib/sms.ts`: Emergency SMS formatting and single-recipient dispatch coordinator.
- `src/lib/routing/`: Valhalla-based mountain road routing and hazard proximity intersection analyzer.
- `src/lib/relay/`: BLE protocol, store-and-forward engine, and native BLE transport.
- `src/data/`: Store abstractions (`hazardStore.ts`, `userStore.ts`, `communityStore.ts`).

### 2.2 Offline-First Data Pipeline
```
[User Action: Report / SOS]
           │
           ▼
[Local SQLite Incident Table] <--- Immediate Local Persistence
           │
           ▼
[Durable Outbox Event Table]  <--- Idempotency Key & Pending Status
           │
   +-------┴-------------------+
   │                           │
[Online]                   [Offline]
   │                           │
   ▼                           ▼
[Submit to Supabase]       [Keep Queued with Backoff]
   │                           │
   ├─ Success ──> [Synced]     ├─ [Opportunistic BLE Relay Broadcast]
   └─ Failure ──> [Retry/Jitter]├─ [User-Initiated Emergency SMS Fallback]
```

---

## 3. Threat Model & Security Posture
- **Identity & Roles:** Supabase RLS enforces authorization boundaries. Client cannot elevate its own role.
- **Relay Security:** Payloads hashed and signed with origin device public key; hops strictly capped at 5; timestamp expiration enforced.
- **Emergency Directory:** Pre-bundled, versioned, and verified phone numbers for emergency authorities to prevent redirection attacks.
