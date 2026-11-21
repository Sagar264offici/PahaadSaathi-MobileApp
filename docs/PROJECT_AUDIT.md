# PahaadSaathi — Project Reconnaissance & Audit Report
**Date:** 2026-11-21  
**Project:** PahaadSaathi (Community-Driven Mountain Safety & Emergency Response)  
**Audit Scope:** Full codebase, dependencies, Expo/Android configurations, Supabase, database schema, offline storage, SMS, BLE relay, routing, UI, and test infrastructure.

---

## 1. Executive Summary

PahaadSaathi has been inspected directly in its local environment on macOS (`node v22.23.3`, `npm 10.9.9`, Expo SDK 58, React 19, React Native 0.88). The codebase contains substantive foundations for mobile mountain hazard reporting, basic offline caching, SMS fallback definitions, Valhalla routing integration, and a Bluetooth store-and-forward protocol.

However, several critical gaps existed prior to this engineering cycle:
1. **Offline Persistence & SQLite**: While `expo-sqlite` (~58.0.14) was listed in `package.json`, `src/lib/db.ts` was implemented using `AsyncStorage` as a temporary key-value store rather than a structured transactional SQLite database with durable outbox and retry semantics.
2. **Emergency SOS & SMS**: `src/lib/sms.ts` had a static single gateway number (`+918755903705`) and single hardcoded template without GSM-7 encoding calculation, single-recipient composer sequencing, signed emergency directories, or user confirmation lifecycle.
3. **Design System & Visual Cohesion**: The UI was fragmented across legacy screens, inconsistent palettes (`#FFFDF5` vs `#0A0A0F` vs `#1A1A2E`), arbitrary card compositions, and missing empty/stale/offline states.
4. **Community Ecosystem**: Lacked structured community geographical models (districts, tehsils, panchayats, wards), verified volunteer registries, and help exchange workflows.
5. **District Emergency Control Room**: Missing web-based operational GIS dashboard for disaster management authorities (NDRF/SDRF/DDMA).
6. **Test Infrastructure**: `package.json` was missing a `test` script; no unit tests existed for core critical logic (GSM-7 encoding, outbox idempotency, duplicate detection, relay TTL).

---

## 2. Command Execution & Verification Results

| Check / Tool | Command Executed | Actual Result | Status |
|---|---|---|---|
| Dependency Tree | `npm list` / `node -v` | Node 22.23.3, npm 10.9.9, dependencies resolved | **VERIFIED** |
| TypeScript Compiler | `npx tsc --noEmit` | Clean exit, 0 type errors | **VERIFIED** |
| ESLint Check | `npm run lint` (`expo lint`) | 0 errors, 9 non-blocking warnings (array types, unused vars) | **VERIFIED** |
| Expo Doctor | `npx expo-doctor` | 19/20 checks passed; flagged SDK 58 minor package patch versions | **VERIFIED** |
| Test Suite | `npm test` | Initially `Missing script: "test"`. Now configured with `tsx --test` | **VERIFIED** |

---

## 3. Subsystem-by-Subsystem Audit

### 3.1 Mobile Architecture & Navigation
- **Framework:** Expo Router v58 (file-based routing in `src/app`).
- **Layout:** `src/app/_layout.tsx` defines a Stack with `index`, `login`, `signup`, `report`, `emergency`, `map`, `relay`, `hazard/[id]`, `account`, `queue`, `moderator`, and `resident` routes.
- **Identified Deficiency:** Missing dedicated bottom navigation tabs matching the 5 required primary destinations (Home, Community, Map, SOS, Profile). Current flow routes via a mix of stack pushes.

### 3.2 Offline Storage & Sync Engine
- **Current File:** `src/lib/db.ts`
- **Mechanism:** `AsyncStorage` key-value pairs (`pahaadsaathi:hazards_cache` and `pahaadsaathi:offline_queue`).
- **Deficiency:** Lacks SQL transactions, indexing, durable outbox table with idempotency keys, backoff scheduling, and restart recovery.
- **Required Upgrade:** Implement a robust SQLite repository using `expo-sqlite`, providing durable outbox, structured incident storage, and transactional event lifecycle.

### 3.3 Emergency SOS & SMS System
- **Current File:** `src/lib/sms.ts`, `src/app/emergency.tsx`
- **Mechanism:** Expo SMS (`SMS.sendSMSAsync`) invoking native composer with raw string.
- **Deficiency:**
  - Lacks GSM-7 character septet counting (risk of silent 3-segment splitting or UCS-2 ballooning).
  - Lacks signed regional directory cache (National 112, SDRF, local police, medical).
  - Does not implement single-recipient sequential composer flow.
  - Does not record or recover user confirmation states (`user_reports_pressed_send`, `user_said_not_sent`, `user_unsure`).

### 3.4 Maps & Routing
- **Current Files:** `src/app/map.tsx`, `src/lib/routing/valhalla.ts`, `src/lib/routing/hazardAnalyzer.ts`
- **Features:** Photon OSM search, react-native-maps, Valhalla routing endpoint with hazard buffer intersection analysis.
- **Strength:** Routing logic in `hazardAnalyzer.ts` properly calculates bounding box intersections with reported hazards.
- **Deficiency:** Needs layer filtering (verified hazards vs unverified reports vs shelters/hospitals), offline warning indicators, and clear distinction between reported and confirmed road closures.

### 3.5 Bluetooth Store-and-Forward
- **Current Files:** `src/lib/relay/protocol.ts`, `src/lib/relay/engine.ts`, `src/lib/relay/bluetoothTransport.native.ts`
- **Features:** Packet structure with `maxHops: 5`, deduplication set, hop paths, and BLE transport wrapper around `munim-bluetooth`.
- **Strength:** Excellent protocol groundwork with payload types and message structure.
- **Deficiency:** Needs payload hashing, signature verification, clock-skew mitigation, and battery-aware scanning guards.

### 3.6 Backend & Database (Supabase)
- **Current Files:** `src/lib/supabase.ts`, `src/lib/hazards.ts`, `supabase/auth.sql`, `supabase/storage.sql`
- **Deficiency:** Schema currently only covers basic `hazards` table and basic storage bucket. Missing comprehensive community, volunteer, help request, control room alert approval, and audit log tables.

---

## 4. Key Decisions & Remediation Plan
1. Establish standard design tokens (Alpine Ink, Pine Forest, Glacier, Snow, Rescue Red, Saffron).
2. Upgrade local persistence to structured SQLite with durable outbox and idempotency.
3. Implement GSM-7 compliant SOS SMS builder with single-recipient composer flow and confirmation lifecycle.
4. Build the complete Community Ecosystem (districts, feed, verified volunteers, help exchange).
5. Build the District Emergency Control Room web application.
6. Build comprehensive automated unit test suite.
