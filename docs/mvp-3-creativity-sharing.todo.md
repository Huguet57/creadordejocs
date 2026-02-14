# MVP 3 - Creativity and Sharing TODO

Objective: close the social and creative loop "create -> publish -> share -> remix -> republish".

## Cycle 3.1 - Publishing and distribution

### Must
- [ ] Implement one-click web publishing.
- [ ] Generate a stable shareable URL.
- [ ] Define basic permissions and validations before publishing.
- [ ] Create a simple published game page (play-only).
- [ ] Add E2E test: publish and open shared URL.

### Should
- [ ] Add project metadata (title, description, thumbnail).
- [ ] Add project size warnings and basic optimization tips.

### Could
- [ ] Add simple offline export (playable web zip).

## Cycle 3.2 - Remix and versions

### Must
- [ ] Implement "Remix this game" action from the play-only page.
- [ ] Clone project with automatic credit to the original creator.
- [ ] Store short version history per published project.
- [ ] Allow republishing a remix as a new version.
- [ ] Measure `publishRate` and `remixRate`.

### Should
- [ ] Add improvement recommendations before publishing.
- [ ] Add "remix starter" challenge templates.

### Could
- [ ] Add internal showcase of featured projects.

## MVP 3 Exit KPIs
- [ ] >40% of projects are published and playable via URL.
- [ ] >25% of published projects receive at least 1 remix.
- [ ] publish time p95 < 30s.
