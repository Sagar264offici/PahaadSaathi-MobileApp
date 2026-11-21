# PahaadSaathi — District Emergency Control Room (EOC)

---

## 1. Role & Purpose
The District Emergency Control Room web application (`src/app/control-room/index.tsx`) is designed for District Disaster Management Authorities (DDMA), NDRF, SDRF, and Police Operations.

---

## 2. Core Capabilities
1. **Live Incident Triage:** Real-time visibility into incoming citizen reports with GPS coordinates, accuracy margins, and photo attachments.
2. **Official Verification Gate:** Authorizes transitioning an incident from `unverified` / `corroborated` to `authority_verified`.
3. **Official Public Warning Broadcast:**
   - Multi-officer authorization protocol (minimum 2 authorized officer sign-offs for high-severity warnings).
   - Mandatory bilingual directives (English & Hindi).
   - Modular integration with Common Alerting Protocol (CAP) / SACHET sandbox.
4. **Resource & Shelter Allocations:** Real-time monitoring of shelter bed occupancy, hospital casualty departments, and volunteer deployment.
