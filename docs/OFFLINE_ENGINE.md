# PahaadSaathi — Offline Engine & Durable Outbox Specification

---

## 1. Engine Lifecycle
The offline engine ensures zero report loss across network dropouts, app restarts, device reboots, and airplane mode:

```
[User Action: Report / SOS]
           │
           ▼
[IncidentRepository.saveIncidentLocally]  <--- Synchronous Disk Persistence
           │
           ▼
[OutboxRepository.enqueue]                <--- Idempotency Key & Pending Status
           │
           ▼
     [SyncEngine]
           │
    +------┴------+
    │             │
[Success]     [Network Failure]
    │             │
    ▼             ▼
[Mark Synced] [Calculate Exponential Backoff with Jitter]
                  │
                  ▼
              [Retry Countdown (Max 5 Retries)]
                  │
                  ▼
              [Transition to 'failed' for User Attention]
```

---

## 2. Exponential Backoff Formula
$$\text{Delay}(r) = \min(\text{MaxDelay}, \text{BaseDelay} \times 2^r) \pm \text{Jitter}$$
- `BaseDelay`: 2,000 ms (2s)
- `MaxDelay`: 60,000 ms (60s)
- `MaxRetries`: 5 attempts
- `Jitter`: 25% uniform random noise to prevent synchronized reconnection spikes across mountain cell towers.

---

## 3. Re-entrancy & Restart Recovery
If the application is killed while an event is in the `processing` state:
- On startup, the outbox engine scans all events.
- Any event remaining in `processing` is restored to `pending` with its original creation timestamp preserved.
