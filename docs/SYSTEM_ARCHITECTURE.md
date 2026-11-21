# PahaadSaathi — System Architecture & Topology
**Version:** 1.0.0  
**Domain:** Community Safety & Disaster Management Platform  
**Target Geography:** Uttarakhand (Himalayan Belt, India)

---

## 1. System Topology

```
                                  +---------------------------------------+
                                  |     Supabase Cloud (PostgreSQL 15)    |
                                  |  - Auth (Multi-Role RLS)              |
                                  |  - PostGIS Spatial Extension          |
                                  |  - Realtime Change Subscriptions      |
                                  |  - Storage Buckets (Media Evidence)   |
                                  +-------------------+-------------------+
                                                      |
                                         HTTPS / TLS 1.3 / REST API
                                                      |
                  +-----------------------------------+-----------------------------------+
                  |                                                                       |
+-----------------+-----------------+                                   +-----------------+-----------------+
|      Mobile Client (Android/iOS)  |                                   |  District Control Room (Web EOC)  |
| - Expo SDK 58 / React Native 0.88 |                                   | - Operational Command Dashboard   |
| - SQLite Durable Outbox Storage   |                                   | - Live GIS Incident Triage Queue  |
| - Sequential GSM-7 SMS Dispatcher |                                   | - Shelter & Resource Allocator    |
| - BLE Store-and-Forward Mesh (5h) |                                   | - Dual-Officer Alert Authorization|
| - Bilingual Safety Guides (EN/HI) |                                   | - CAP / SACHET Provider Interface |
+-----------------+-----------------+                                   +-----------------------------------+
                  |
     Opportunistic Bluetooth LE
                  |
+-----------------+-----------------+
|      Nearby Peer Mobile Node      |
| - Opportunistic Store-and-Forward |
| - Deduplicated Hop Path (Max 5)   |
+-----------------------------------+
```

---

## 2. Core Engineering Principles
1. **Never Casual Data Loss:** Emergency SOS and incident reports are written to persistent SQLite storage synchronously before network transmission is attempted.
2. **Honest Connectivity Representation:** Distinction between `ONLINE`, `OFFLINE_WITH_CELLULAR` (SMS available), `OFFLINE_WITHOUT_CELLULAR` (BLE & local storage only), and `LIMITED_CONNECTIVITY`.
3. **Deterministic GSM-7 SMS Fallback:** Strict 306 septet (2 concatenated SMS segment) limit with verified recipient normalization (`+91` E.164 and short codes `112`, `108`, `1078`, `1033`).
4. **Separation of Corroboration & Verification:** Community confirmations aggregate crowd consensus, while official status (`authority_verified`) requires authenticated DDMA/SDRF control room operator sign-off.
