# PahaadSaathi — Emergency SMS System Specification

---

## 1. Architecture & Protocol
The emergency SMS system operates under strict constraints:
1. **User's Native SIM:** The user's active cellular carrier is utilized; the app does not silently background-send SMS (preserving Google Play / Android security permissions).
2. **Single-Recipient Sequencing:** Multi-recipient MMS group messaging fails in low-bandwidth 2G Himalayan corridors. The engine opens ONE recipient composer at a time and tracks post-composer outcomes.
3. **Honest Confirmation Lifecycle:**
   - On composer exit, the app asks: "Did you press Send in the SMS app?"
   - When the user selects "Yes, I pressed Send", the status is recorded as `user_reports_pressed_send` with the explicit user disclaimer:
     *"You confirmed pressing Send. Delivery to the recipient has not been verified."*

---

## 2. GSM 03.38 Septet Budget & Concatenation Limits
- **Single Segment Limit:** 160 septets
- **Concatenated Segment Limit:** 153 septets per segment
- **Max Allowed Concatenated Segments:** 2 segments (306 septets total)
- **Extension Characters:** `{`, `}`, `|`, `^`, `\`, `€`, `[`, `]` cost 2 septets.
- **Sanitization:** Removes non-GSM characters and collapses CRLF line injection attempts.

---

## 3. Canonical Emergency Message Format
```text
PAHAADSAATHI SOS
ID: PS-7F2A
TYPE: LANDSLIDE
SEV: HIGH
LOC: 30.08690,78.26760 ACC: 18M
TIME: 21-11-2026 14:52
NAME: RAHUL
PH: +919876543210
MAP: https://maps.google.com/?q=30.08690,78.26760
```
When GPS fix is unavailable:
```text
LOC: UNKNOWN
```
*Never fabricate or mock coordinates.*
