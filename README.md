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
| Lay roads | Roads in the toolbar; click where the road starts, then click each next point. Right-click starts somewhere else |
| Lift roads | Lift roads from the road tool's hint bar, then click a road |
| Demolish | Select a finished building, press Demolish, then confirm |
| Save | Command-S / Ctrl-S, or the game menu |

The current objective links directly to food buildings. The build catalogue closes during placement. The minimap moves the camera in wider windows. Settings include camera key bindings and ambient sound. Manual saves and automatic saves retain previous copies in local application storage; exporting creates a portable JSON save.

## Your first charter

Start with 16 working adults and four children. Workers carry inputs and outputs between workshops and the granary. Reduce a workshop's worker slots when construction needs available hands. A mill consumes grain; a bakehouse makes bread or preserves roots as militia provisions. Grain arrives in autumn, so gathering and fishing matter during the opening.

Build two cottages before welcoming eight newcomers. Increase timber production and gathering to support them. Use a sawpit for planks and set its granary stock target: it competes with construction and fuel for timber. The smith can make spears, shields or tools. Stock targets stop new batches when stored and incoming goods reach the target; reduce worker slots to release those workers.

A formation requires eight healthy adults, eight spears, eight shields and 36 provisions. Scout the crossing, gather the militia, advance across the bridge and drive off the occupiers. Buy the charter, return surviving soldiers to civilian work, then build an eastern outpost and staff it with two workers. Two supplied days secure the charter. Occupiers begin their attack during the first winter if left alone.

## Chapter II: the Iron Road

Securing the crossing opens a second chapter. Survey Iron Ridge from the Territory panel, then buy its charter for 60 coin. A mine on the ridge digs ore, and a bloomery in the valley smelts it with firewood into iron, which ends the village's dependence on caravans for spears and tools.

The ridge's wealth draws raiders. Twelve of them make camp beyond the ridge at the start of the first winter that falls at least a season after the claim, and they march on the granary two days later. Eight spears alone may not hold them, so fight beside a watchtower or raise a second levy. The chapter is won when the raiders are broken and Alder has smelted 10 iron of its own.

## Implemented

- Four seasons, field growth and harvest, food use and spoilage, winter heating, housing and immigration.
- Quarter-turn building placement with rotated entrances, cancellation with material refunds, workshop stock targets and adjustable staffing; physical worker cargo; 14 goods and 14 building types, including the starter granary.
- Delayed import/export contracts, treasury and household taxes.
- A stock ledger separating available, carried and construction-reserved goods, plus winter food and firewood planning.
- Eight-person militia, real workforce removal, gear and provisions, movement, fatigue, morale, casualties, wounded recovery and demobilization.
- Scouting, battle at the crossing, a purchased charter and a staffed/supplied outpost win condition; starvation and occupation losses.
- Pausing, speeds, save/load/import/export, outcome screens, controls and a chronicle.
- Player-laid roads at one stone per five metres: routes prefer them and workers walk them half again as fast. Lifting a road returns half its stone.
- Demolition of finished buildings for half their materials, with workers released, residents rehomed and every salvaged unit recorded in the conservation audit.
- Finite trader stock per good: buying drains it and raises the price, selling floods it and lowers the price, and stock drifts back each day.
- Chapter II: Iron Ridge survey and charter, mining, a bloomery, and a winter raid with two days' warning.
- Workers whose post is out of season (frozen foragers, field hands in winter) help on building sites instead of standing idle.
- Fully rotatable 3D scene with textured timber/plaster/stone/thatch, roof dormers, garden plots, foliage cards, curved feathered roads, water animation, carried sacks and troop banners.

## Validation

`npm test` runs sixteen invariant/scenario checks and a complete two-chapter playthrough. These verify production and cargo accounting across four seasons, deterministic mid-haul and mid-battle saves, construction costs, trade escrow, recruitment/demobilization corrupt-save rejection, rotated placement, construction refunds, production targets and winter reserves. The full playthrough uses no injected resources or money. It wins chapter I on day 17 with 24 surviving adults, 110 food and 215 coin, then plays on to secure the Iron Road on day 47 with 23 adults and 38 iron smelted.

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

This is a playable development slice, not the whole production roadmap. The visual treatment is closer to the production kit but does not yet reproduce the concept paintings' bespoke models, dense composition or lighting quality. Several systems remain future work:

1. free-angle building rotation and terrain editing,
2. a quarry (stone comes only from the starting stock and caravans),
3. trade-route blockades, household distribution and storage capacities,
4. a campaign beyond the Iron Road, and authored audio.

Economic values need broader human playtesting; the year-two economy in particular is tight, and the scripted playthrough has to run a second bakehouse and a second fishery to feed 26 people through winter.

The current material and foliage images are generated assets. They are embedded in the offline build; see `docs/assets.md` for provenance.
