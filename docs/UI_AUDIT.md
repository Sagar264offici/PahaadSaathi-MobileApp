# PahaadSaathi — UI & Screen Audit
**Date:** 2026-11-21  
**Scope:** Existing screen evaluations against master design and accessibility criteria

---

## 1. Screen-by-Screen Findings

### 1.1 Home Screen (`src/app/index.tsx`)
- **Strengths:** Quick links to reporting, offline queue counter, basic theme toggle.
- **Issues Identified:**
  - Overloaded with role-conditional views (moderator vs resident vs guest) that create visual jumps.
  - Lacks dedicated bottom tab navigation (forcing users into back-stack traps).
  - Telemetry information (network connectivity, altitude, current panchayat) was buried.
- **Remediation:** Introduce 5-tab persistent bottom navigation bar (`Home`, `Community`, `Map`, `SOS`, `Profile`), elevating emergency SOS to the center action.

### 1.2 Emergency SOS Screen (`src/app/emergency.tsx`)
- **Strengths:** 112 dialing shortcut, location coordinates capture.
- **Issues Identified:**
  - SMS button triggered multi-recipient composer or arbitrary numbers without GSM-7 validation.
  - No hold-to-activate protection against pocket dials.
  - No post-composer confirmation dialog ("Did you press Send in the SMS app?").
- **Remediation:** Redesign with telemetry lock banner, 3-second hold circular SOS trigger, single-recipient sequential composer, and honest confirmation modal.

### 1.3 Incident Report Screen (`src/app/report.tsx`)
- **Strengths:** Category selectors (Landslide, Road Damage, etc.), photo picker.
- **Issues Identified:**
  - Lacked offline durability guarantee; users weren't informed whether reports were saved to disk immediately before network dispatch.
  - Missing severity indicators (Low, Medium, High).
- **Remediation:** Wire directly to SQLite durable outbox; show clear offline preservation badge.

### 1.4 Map Screen (`src/app/map.tsx`)
- **Strengths:** React Native Maps integration, Valhalla route analyzer.
- **Issues Identified:**
  - Cluttered marker layout with no layer filters (hazards vs shelters vs hospitals).
  - Stale cache warnings were absent when offline.
- **Remediation:** Add layer control chips, cluster visualization, and prominent stale data indicator.

### 1.5 Web Control Room Dashboard
- **Issues Identified:** Missing entirely from previous mobile-only codebase.
- **Remediation:** Build a responsive, GIS-enabled District Emergency Control Room interface.
