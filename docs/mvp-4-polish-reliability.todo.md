# MVP 4 - Polish, Reliability and Delight TODO

Objective: make the experience smooth, reliable, and enjoyable for continued use.

## Cycle 4.1 - Simple debugging and actionable errors

### Must
- [ ] Implement basic debugging: pause, step, and essential watch expressions.
- [ ] Improve runtime errors with cause -> impact -> how to fix format.
- [ ] Add detection of frequent errors with automatic suggestions.
- [ ] Add "safe fallback" when an invalid action could break the session.
- [ ] Cover critical flows with regression E2E tests.

### Should
- [ ] Add simplified mini console for beginners.
- [ ] Add debugging guides for popular templates.

### Could
- [ ] Add optional collision visualizer.

## Cycle 4.2 - Performance and stability

### Must
- [ ] Define reference benchmarks (arcade and platformer type scenes).
- [ ] Set frame time budget and validate it in CI.
- [ ] Reduce editor load time and publish time.
- [ ] Improve save/load robustness for medium-sized projects.
- [ ] Implement error monitoring and performance regression tracking.

### Should
- [ ] Add smart preloading of used assets.
- [ ] Add 2D render optimizations for heavy scenes.

### Could
- [ ] Add automatic performance recommendations within the editor.

## MVP 4 Exit KPIs
- [ ] reduction of `stuckRate` for frequent errors.
- [ ] stable frame time in reference scenes.
- [ ] improvement in retention between consecutive sessions.
