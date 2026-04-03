## Handoff Domain Contracts

- `recordContracts.ts` is the handoff-facing record contract.
- Handoff code should import `DailyRecord` from this folder, not from `@/types/domain/dailyRecord`.
- The contract is intentionally narrower than the persistence root and should grow only when handoff needs an additional field.
- `patientContracts.ts` mirrors the patient fields that handoff actually consumes and stays compatible with `PatientData` so persistence and UI code can share the same episode safely.

### Business Rule

- Handoff works on the active episode state for the current day.
- It must not depend on legacy compatibility facades or widen the record shape just because the persistence model contains more fields.
