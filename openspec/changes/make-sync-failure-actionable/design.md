## Context

The outbox already preserves ordered operations and reports `remaining`, `blockedBy`, and a bounded internal error. App reduces that evidence to a four-state enum. AccountPanel then renders an 8px status label with no action. Run 38 made pending local append-only facts safe across bootstrap, so the product can now make a precise local-safety statement without claiming those facts are already in the cloud.

## Goals / Non-Goals

**Goals:** explain local safety, show bounded pending/category evidence, provide one retry, report its outcome, and reuse automatic sync behavior.

**Non-Goals:** expose endpoint/error strings, let the user delete or skip operations, promise cloud durability before success, or build a full operations console.

## Decisions

### Project a safe issue from the blocked outbox operation

The pure projector SHALL map only the first blocked operation kind to one of `账户设置`, `学习记录`, `进度快照`, `提交记录`, or `同步服务`, plus the bounded pending count. Raw operation IDs, payloads, stack traces, URLs, and server messages SHALL never enter UI props.

### Reuse one synchronization routine

Automatic debounce and manual retry SHALL call the same App callback. The callback enqueues the current snapshot idempotently, flushes the outbox, adopts conflict state as before, updates status/issue, and returns a bounded result.

### Separate local safety from cloud success

While pending, copy SHALL say the latest valid record remains on this device and will retry; it SHALL not say cloud saved. Success copy may say cloud synchronization recovered only after the outbox reports zero remaining operations.

### Preserve anonymous truth

Anonymous users remain `仅保存在本机` and never see cloud retry UI even if optional session restoration fails.

## Risks / Trade-offs

- [Manual and automatic flush overlap] → Existing operation IDs and outbox idempotency make duplicate enqueue safe; disable the button during the manual call.
- [A raw error leaks through callback] → Callback returns only a typed bounded result; component never receives thrown error text.
- [Failure category is too coarse] → Coarse is intentional; it is actionable enough without exposing internal implementation.
- [A retry remains blocked] → Preserve pending state and report the same safe category/count honestly.
