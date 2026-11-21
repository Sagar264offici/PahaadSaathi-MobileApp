# PahaadSaathi — Implementation Roadmap & Slices
**Date:** 2026-11-21  
**Approach:** Autonomous vertical slice engineering

---

## Roadmap Overview

```
PHASE 0: Reconnaissance & Auditing (COMPLETED)
   │
   ▼
PHASE 1: Visual & Engineering Foundation (Design System Tokens, Component Kit, Lucide Icons)
   │
   ▼
PHASE 2: Offline Engine (SQLite Repositories, Durable Outbox, Idempotency, Retry Scheduling)
   │
   ▼
PHASE 3: Emergency Communication & SOS (GSM-7 Engine, Single-Recipient Composer, Confirmation States)
   │
   ▼
PHASE 4: Incident Management & Corroboration (Hazard Reporting, Deduplication, Verification States)
   │
   ▼
PHASE 5: Community Ecosystem (Geographic Communities, Village Feeds, Volunteers, Help Exchange)
   │
   ▼
PHASE 6: Maps, Resources & Offline Guides (Map Filters, Shelter Directories, Bundled Bilingual Safety Guides)
   │
   ▼
PHASE 7: Bluetooth Store-and-Forward Relay (Payload Hashing, Hop Capping, Battery-Aware Scanning)
   │
   ▼
PHASE 8: District Emergency Control Room (Operational GIS Web Dashboard, Alert Approval, Resource Triage)
   │
   ▼
PHASE 9: Government-Wide Alert Adapter (CAP / SACHET Modular Sandbox Interface)
   │
   ▼
PHASE 10: Testing, Verification & Final Hardening (Automated Unit & Integration Test Suites, Documentation)
```

---

## Slice Breakdown

### Slice 1: Visual & Engineering Foundation
- **Goals:**
  - Create standardized design token system (`src/theme/tokens.ts`) with Alpine Ink, Pine Forest, Glacier, Snow, Rescue Red, Saffron, and Slate.
  - Create reusable core UI components: `AppButton`, `Badge`, `StatusLabel`, `NetworkIndicator`, `OfflineBanner`, `EmptyState`.
  - Update `ThemeContext` and typography tokens.
  - Run typecheck and lint.

### Slice 2: Offline Engine & Durable Outbox
- **Goals:**
  - Build SQLite database repository (`src/lib/sqlite/`) with migrations, outbox table, incident table, directory cache, and sync state.
  - Implement durable outbox with idempotency keys, exponential backoff, retry counting, and re-entrancy protection.
  - Write unit tests for outbox processing, duplicate prevention, and retry backoff.

### Slice 3: Emergency SOS & SMS System
- **Goals:**
  - Implement GSM-7 septet counter & encoder (`src/lib/sms/gsm7.ts`).
  - Implement signed emergency authority directory cache (`src/lib/sms/directory.ts`).
  - Implement sequential single-recipient composer coordinator with confirmation states (`src/lib/sms/coordinator.ts`).
  - Redesign `src/app/emergency.tsx` with one-touch SOS hold, telemetry lock, guest SOS, and honest confirmation dialogs.
  - Write unit tests for GSM-7 calculation, SMS message formatting, and directory normalization.

### Slice 4: Incident Management & Reporting
- **Goals:**
  - Redesign `src/app/report.tsx` with offline-first persistence, severity indicators, and photo attachment fallback.
  - Implement corroboration & deduplication logic in `src/lib/incidents/deduplication.ts`.
  - Update `src/app/hazard/[id].tsx` with timeline and verification badges.
  - Write unit tests for deduplication and status transitions.

### Slice 5: Community Ecosystem & Help Exchange
- **Goals:**
  - Build community store and models (`src/data/communityStore.ts`) covering Uttarakhand districts (Chamoli, Rudraprayag, Uttarkashi, etc.), tehsils, and gram panchayats.
  - Implement volunteer directory and help request exchanges.
  - Build community feed and interactive screens.

### Slice 6: Maps & Offline Safety Guides
- **Goals:**
  - Upgrade `src/app/map.tsx` with layer toggles (Verified vs Reported vs Shelters/Medical), search, and stale-data indicators.
  - Build bundled offline bilingual emergency safety guides (`src/data/safetyGuides.ts`) in English and Hindi.

### Slice 7: Bluetooth Store-and-Forward Relay
- **Goals:**
  - Strengthen `src/lib/relay/protocol.ts` with SHA-256 payload hashing, signature verification, and 5-hop bounds.
  - Unit test packet validation, duplicate filtering, and hop limits.

### Slice 8: District Emergency Control Room (Web Dashboard)
- **Goals:**
  - Build modern responsive operational web dashboard (`src/web/control-room/` or dedicated dashboard screen) for DDMA/SDRF operators.
  - Incident triage, live GIS map view, volunteer dispatch, shelter capacities, and official alert approval workflow.

### Slice 9: Public Warning Integration
- **Goals:**
  - Build modular `PublicAlertProvider` adapter with CAP-compatible sandbox.

### Slice 10: Verification, Test Execution & Complete Documentation
- **Goals:**
  - Execute full test suite (`npm test`), lint (`npm run lint`), typecheck (`npx tsc --noEmit`).
  - Produce all required documentation in `docs/`.
