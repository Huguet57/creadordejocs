# MVP 1 - First Autonomous Game TODO

Objective: build the core UX for create/edit/run/save with minimal friction.

## Cycle 1.1 - Minimal Create/Edit/Run

### Must
- [x] Implement basic resources: sprites, sounds, and objects with quick creation.
- [x] Implement room editor with drag-and-drop instances.
- [x] Add base object properties (`x`, `y`, `speed`, `direction`).
- [x] Create visible `Run` and `Reset` buttons.
- [x] Save and load project locally without losing state.

### Should
- [x] Add UI inspector with clear tooltips for each property.
- [x] Add mini inspector with smart defaults.

### Could
- [ ] Add simple asset import with friendly validations.

## Cycle 1.2 - Safe iteration (never lose work)

### Must
- [x] Implement periodic autosave and recovery on editor reopen.
- [x] Implement reliable undo/redo for main editing actions.
- [x] Implement short local version history (snapshot checkpoints).
- [x] Cover safety flows with E2E tests (simulated crash, recovery, undo).
- [x] Show clear save status in UI (`Saved`, `Saving`, `Error`).

### Should
- [x] Add keyboard shortcut for undo/redo.
- [x] Add confirmation before destructive changes.

### Could
- [ ] Add version recovery by timestamp.

## MVP 1 Exit KPIs
- [ ] 0 data loss in test sessions.
- [ ] >90% of common actions resolved in <= 3 clicks.
- [ ] reduction in initial frustration during playtests (qualitative + short survey).
