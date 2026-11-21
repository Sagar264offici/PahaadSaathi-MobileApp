# PahaadSaathi — Known Limitations & Operational Boundaries

---

1. **Cellular SMS Delivery Verification:** The Android OS `sendSMSAsync` composer API launches the user's messaging application. It does not provide carrier-grade SMS delivery receipts back to third-party applications without privileged carrier permissions. The application addresses this by explicitly asking for user confirmation and noting: *"Delivery to the recipient has not been verified."*
2. **Bluetooth Range:** BLE store-and-forward depends on physical line-of-sight and device density. In remote ravines without other peer devices, events remain safely queued in local SQLite storage until a peer node or cellular tower is encountered.
3. **Government Alert Authority:** Dispatches from the District Control Room in this repository interact with the `SandboxPublicAlertProvider`. Live CAP / SACHET or Cell Broadcast dissemination across entire telecom towers requires administrative certification from the National Disaster Management Authority (NDMA) and Telecom Service Providers (TSPs).
4. **Emergency Services:** PahaadSaathi is an emergency coordination and community resilience aid; it does not replace the official 112 emergency response network or professional SDRF / NDRF search and rescue units.
