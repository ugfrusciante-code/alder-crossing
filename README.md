# Cozy Village · Alder Crossing

A playable desktop development slice: build a settlement, sustain a seasonal economy, muster its workers, fight for a crossing, and supply your new territory.

## Play

Open **Alder Crossing.app** beside this folder. The app runs offline. Choose **Begin your charter**, or **Continue saved settlement**. The game pauses when its window loses focus.

For development, run `npm install`, `npm run dev`, then open the local address shown. Browser and desktop saves are separate; use the menu's Export / Import controls to move them.

## Controls

| Action | Control |
| --- | --- |
| Pan | Drag empty ground; WASD or arrow keys |
| Zoom toward the pointer | Mouse wheel / trackpad scroll |
| Rotate camera | Q / E or the visible rotation buttons |
| Return to the village | F or the home button |
| Select | Click a building or formation |
| Build | B or Build; choose a category and building, then click open land |
| Rotate a planned building | R or Rotate while placing |
| Cancel / back | Escape; right-click cancels placement |
| Pause | Space; speed buttons also provide 1× / 2× / 4× |
| March | Select a formation and right-click ground, or use its inspector commands |
| Save | Command-S / Ctrl-S, or the game menu |

The current objective links directly to food buildings. The build catalogue closes during placement. The minimap moves the camera in wider windows. Settings include camera key bindings and ambient sound. Manual saves and automatic saves retain previous copies in local application storage; exporting creates a portable JSON save.

## Your first charter

Start with 16 working adults and four children. Workers carry inputs and outputs between workshops and the granary. Reduce a workshop's worker slots when construction needs available hands. A mill consumes grain; a bakehouse makes bread or preserves roots as militia provisions. Grain arrives in autumn, so gathering and fishing matter during the opening.

Build two cottages before welcoming eight newcomers. Increase timber production and gathering to support them. Use a sawpit for planks and set its granary stock target: it competes with construction and fuel for timber. The smith can make spears, shields or tools. Stock targets stop new batches when stored and incoming goods reach the target; reduce worker slots to release those workers.

A formation requires eight healthy adults, eight spears, eight shields and 36 provisions. Scout the crossing, gather the militia, advance across the bridge and drive off the occupiers. Buy the charter, return surviving soldiers to civilian work, then build an eastern outpost and staff it with two workers. Two supplied days secure the charter. Occupiers begin their attack during the first winter if left alone.

## Implemented

- Four seasons, field growth and harvest, food use and spoilage, winter heating, housing and immigration.
- Quarter-turn building placement with rotated entrances, cancellation with material refunds, workshop stock targets and adjustable staffing; physical worker cargo; 14 goods and 14 building types, including the starter granary.
- Delayed import/export contracts, treasury and household taxes.
- A stock ledger separating available, carried and construction-reserved goods, plus winter food and firewood planning.
- Eight-person militia, real workforce removal, gear and provisions, movement, fatigue, morale, casualties, wounded recovery and demobilization.
- Scouting, battle at the crossing, a purchased charter and a staffed/supplied outpost win condition; starvation and occupation losses.
- Pausing, speeds, save/load/import/export, outcome screens, controls and a chronicle.
- Fully rotatable 3D scene with textured timber/plaster/stone/thatch, roof dormers, garden plots, foliage cards, curved feathered roads, water animation, carried sacks and troop banners.

## Validation

`npm test` runs ten invariant/scenario checks and an additional complete charter playthrough. These verify production and cargo accounting across four seasons, deterministic mid-haul and mid-battle saves, construction costs, trade escrow, recruitment/demobilization corrupt-save rejection, rotated placement, construction refunds, production targets and winter reserves. The full playthrough uses no injected resources or money and wins on day 17 with 24 surviving adults, 110 food and 215 coin.

`npm run build` type-checks and produces `dist`. `npm run package:mac` packages that build with the locally installed Electron runtime and applies a local ad-hoc signature. This package is for this Mac architecture; Windows has not been tested.

## Project structure

```text
src/sim/       authoritative simulation, content and terrain/navigation rules
src/render/    Three.js presentation, modular building models and landscape
src/ui/        interface, descriptions and command dispatch
src/main.ts    fixed-step loop, input, saves and sound
public/        local generated materials and the two reference concept sheets
desktop/       sandboxed offline desktop shell and macOS packaging
tests/         resource conservation and full-charter scenarios
docs/          implementation scope and asset provenance
```

The simulation owns game state. The view consumes it; interface actions issue commands. The original `/Users/oscarrapin/Cozy Village/` project remains separate from this build.

## Current limits

This is the first playable slice, not completion of the whole production roadmap. It uses the blueprint's TypeScript fallback. The visual treatment is closer to the production kit but does not yet reproduce the concept paintings' bespoke models, dense composition or lighting quality. Terrain/roads are authored; construction does not yet support free-angle building rotation, completed-building demolition, player roads or terrain editing. There is one authored enemy force and one claimable territory. Iron Ridge remains scenery. Mining, trade-route blockades, finite trader inventory, household distribution, storage capacities, deeper progression, an expanded campaign and authored audio remain future work. Economic values need broader human playtesting.

The current material/foliage images are generated assets. They are embedded in the offline build; see `docs/assets.md` for provenance.
