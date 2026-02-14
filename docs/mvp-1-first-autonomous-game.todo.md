# MVP 1 - First Autonomous Game TODO

Objective: build the core UX for create/edit/run/save with minimal friction.

## Cycle 1.1 - Minimal Create/Edit/Run

### Must
- [ ] Implement basic resources: sprites, sounds, and objects with quick creation.
- [ ] Implement room editor with drag-and-drop instances.
- [ ] Add base object properties (`x`, `y`, `speed`, `direction`).
- [ ] Create visible `Run` and `Reset` buttons.
- [ ] Save and load project locally without losing state.

### Should
- [ ] Add UI inspector with clear tooltips for each property.
- [ ] Add mini inspector with smart defaults.

### Could
- [ ] Add simple asset import with friendly validations.

## Cycle 1.2 - Safe iteration (never lose work)

### Must
- [ ] Implement periodic autosave and recovery on editor reopen.
- [ ] Implement reliable undo/redo for main editing actions.
- [ ] Implement short local version history (snapshot checkpoints).
- [ ] Cover safety flows with E2E tests (simulated crash, recovery, undo).
- [ ] Show clear save status in UI (`Saved`, `Saving`, `Error`).

### Should
- [ ] Add keyboard shortcut for undo/redo.
- [ ] Add confirmation before destructive changes.

### Could
- [ ] Add version recovery by timestamp.

## MVP 1 Exit KPIs
- [ ] 0 data loss in test sessions.
- [ ] >90% of common actions resolved in <= 3 clicks.
- [ ] reduction in initial frustration during playtests (qualitative + short survey).
