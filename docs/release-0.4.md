# Alder Crossing 0.4: 12 October 2026

This release adds the two building tools the slice was missing and a second chapter that carries the campaign into its second year.

## Roads and demolition

Roads are laid from the toolbar, one click per point, and each stretch continues from the end of the last. A stretch costs one stone per five metres, may run up to 40 metres, and refuses the river and buildings. The pathfinder treats a road cell as half a step and workers walk roads half again as fast, so a road between the granary and a busy workshop shortens every delivery. Right-click picks a new starting point, which matters because a mistaken first click otherwise left every later stretch failing with no way to move the start. Lifting a road returns half its stone.

Finished buildings can now be demolished from the inspector for half their materials, after a confirming second press. Workers keep whatever they are carrying and take it to the granary, and residents of a demolished cottage move into the remaining homes. The granary cannot be demolished, nor a yard while its levy is in the field, nor a cottage whose loss would leave someone homeless.

## Traders with finite stock

Every good now has a limited stock on the caravan's books. Buying drains it and raises the price, selling floods it and lowers what the next load fetches, and stock drifts a tenth of the way back to its usual level each day. The trade list shows the live buy price, sell price and quantity on offer.

## Chapter II: the Iron Road

Securing the crossing opens Iron Ridge. The player surveys it, buys its charter, mines ore there and smelts it at a bloomery in the valley. Twelve raiders arrive at the start of the first winter at least a season after the claim, camp for two days, and then march on the granary. The chapter is won by breaking them and smelting 10 iron.

Writing a legal scripted playthrough of the chapter exposed several real problems, and each one was fixed in the game rather than worked around in the script:

1. The first raid timing landed four days after the claim, in the same winter as the chapter I battle. It now waits for the first winter at least a season later.
2. In winter every adult held a post that had nothing to do, so construction never started. Workers whose post is out of season now help on building sites.
3. Militia provisions are edible, so a hungry village eats them. The scripted player keeps a second bakehouse on provisions with a stock target, which is the intended answer.

## Validation

Sixteen scenario checks pass, including seven new ones for roads, road speed, demolition, traders, Iron Ridge gating and loading saves from before this release. The complete playthrough plays both chapters from the starting village with no injected goods or coin. Chapter I is won on day 17 with byte-identical numbers to 0.3, which shows the new systems change nothing for a village that does not use them. Chapter II is won on day 47 with 23 adults and 38 iron smelted.

Saves from 0.3 load unchanged; the new fields default on load.
