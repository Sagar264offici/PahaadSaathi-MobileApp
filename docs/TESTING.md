# PahaadSaathi — Verification & Testing Protocol

---

## 1. Automated Test Suite
The project uses `tsx --test` powered by Node's native test runner.

Run complete test suite:
```bash
npm test
```

### Coverage Matrix:
- **`src/lib/sms/sms.test.ts`**:
  - GSM 03.38 basic character 1-septet calculation
  - GSM extension character 2-septet calculation
  - Non-GSM character / UCS-2 detection
  - 306-septet budget cap enforcement
  - Indian phone number normalization (`+91` E.164 and short codes `112`, `108`, `1078`, `1033`)
  - Canonical SOS formatting and multiline injection sanitization
- **`src/lib/sqlite/outbox.test.ts`**:
  - Exponential backoff calculation with jitter bounds
  - Eligibility time checking for outbox event sync
  - Bounded retry limits (`MAX_RETRY_LIMIT = 5`)
  - Unique idempotency key generation
- **`src/lib/incidents/deduplication.test.ts`**:
  - Haversine distance calculations
  - Duplicate detection within 500m and 6-hour windows
- **`src/lib/relay/relay.test.ts`**:
  - 5-hop bound enforcement
  - TTL expiration checks
  - Deduplication ID set checks
  - Deterministic payload hashing
- **`src/data/communityStore.test.ts`**:
  - Geographic community retrieval
  - Help request creation, status transitions, and volunteer queries
- **`src/data/safetyGuides.test.ts`**:
  - Bilingual coverage (English & Hindi) across all 6 disaster categories
- **`src/lib/alerts/publicAlert.test.ts`**:
  - Bilingual headline validation
  - Dual-officer approval threshold enforcement

---

## 2. Static Analysis Checks
```bash
npx tsc --noEmit
npm run lint
```
Both commands must exit with 0 errors.
