# PahaadSaathi — Security, Threat Model & Privacy Specification

---

## 1. Threat Model & Mitigations

| Threat | Attack Vector | Mitigation Strategy |
|---|---|---|
| **Fake SOS / Hoax Attacks** | Malicious users spamming SOS to divert emergency responders | Signed directory verification, GPS accuracy auditing, incident corroboration consensus before high-tier mobilization. |
| **GPS Spoofing** | Faking coordinates to mislead emergency routing | Flagging zero-accuracy fixes; comparing reported location with cellular tower telemetry; requiring manual landmark confirmation. |
| **Relay Broadcast Storms** | Flooding BLE mesh with repeated messages | Cryptographic SHA-256 payload hashing, duplicate ID rejection set, strict 5-hop hard ceiling. |
| **Unauthorized Public Warnings** | Bad actors issuing fake district-wide evacuations | Dual-officer approval threshold; signed public alert sandbox provider; strict server-side RBAC. |
| **Emergency Contact Tampering** | Hijacking SMS numbers to redirect victims to malicious numbers | Bundled, versioned, unexpired directory signed by state authorities. |

---

## 2. Privacy & Data Minimization
- No real-time continuous background tracking of citizens.
- Precise GPS coordinates are retained and transmitted only during explicit user-initiated emergency reporting or SOS.
- Public community feeds omit private residential addresses.
