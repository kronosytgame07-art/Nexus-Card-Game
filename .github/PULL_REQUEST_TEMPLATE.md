---
name: 'Hand & Profile UI refactor'
about: 'Add PlayerHand, EnemyHand and Profile components; refactor mobile hand CSS; prepare board variables.'
labels:
  - refactor
  - ui
assignees: []
---

# Summary
This draft PR introduces a refactor of the hand UI and adds a lightweight Profile component. It extracts player & enemy hand rendering to dedicated React components (PlayerHand, EnemyHand) using CSS modules, removes the legacy "hand-toggle" handle, and prepares the board layout to use shared CSS variables for slot sizing.

## Changes included
- Added: `src/components/PlayerHand.tsx`
- Added: `src/components/EnemyHand.tsx`
- Added: `src/components/Profile.tsx`
- Added: `src/styles/hand.module.css`
- Added: `src/styles/profile.module.css` (styles file placeholder)
- Added: `src/styles/vars.css` (variables placeholder)
- Modified: `src/final-board-layout.css` (prepared for variables)
- Modified: `src/mobile-duel-layout.css` (removed legacy .hand-toggle & .hand-card-wrap rules)

## Why
- Improve maintainability by splitting UI into components
- Make the hand UI easier to iterate on and test on mobile
- Prepare the board to adapt to variable card sizes centrally

## How to test
1. Checkout branch `refactor/hand-enemy-profile`
2. `npm ci && npm run build`
3. Run the dev server and open `/combat`
4. Verify:
   - Player hand centered and opens/closes via `handOpen` state
   - Enemy hand displayed at the top with card count
   - Profile components visible on top and bottom with avatars
   - No visual overlap on 3 vs 3 and 5 supports
   - Mobile landscape layout behaves correctly

## Notes
- `profile` avatars reference `/avatars/*` in `public/`. Replace or provide assets if needed.
- This is a draft PR: further tidy & build fixes will be pushed once CI checks are green.
