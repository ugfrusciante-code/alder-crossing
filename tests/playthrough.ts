import assert from 'node:assert/strict';
import { Game, type Command } from '../src/sim/game';
import type { Kind } from '../src/sim/content';
const g = new Game();
function doCmd(c: Command) {
  const r = g.command(c);
  assert.ok(r.ok, `${JSON.stringify(c)}: ${r.message}`);
  return r.id!;
}
// Reactions a watching player would make whatever else they are waiting on.
let react = () => {};
function waitFor(fn: () => boolean, limit = 600) {
  for (let t = 0; t < limit && !fn(); t += 5) {
    react();
    g.advance(5);
    assert.ok(!g.s.lost, g.s.events.at(-1)?.text ?? 'Charter lost');
  }
  assert.ok(fn(), `Timed out at day ${g.day}: ${JSON.stringify(g.s.stock)}; idle ${g.idle}`);
  assert.deepEqual(g.audit(), []);
}
function build(kind: Kind, x: number, z: number) {
  const id = doCmd({ type: 'build', kind, x, z });
  waitFor(() => g.building(id)!.progress === 1);
  return id;
}
// A real charter from starting resources; no injected money, goods, or completion flags.
build('cottage', -54, 6);
build('cottage', -52, 18);
doCmd({ type: 'immigrate' });
const logger = g.s.buildings.find((b) => b.kind === 'logging')!;
doCmd({ type: 'workers', id: logger.id, slots: 3 });
build('forager', -21, -17);
build('forager', -8, -32);
const mill = build('mill', 2, -8);
doCmd({ type: 'workers', id: mill, slots: 0 });
const bakery = build('bakery', -7, 3);
doCmd({ type: 'recipe', id: bakery, recipe: 'provisions' });
const saw = build('sawmill', -19, -8);
waitFor(() => g.stock('planks') >= 22);
doCmd({ type: 'workers', id: saw, slots: 0 });
waitFor(() => g.stock('provisions') >= 40);
doCmd({ type: 'workers', id: bakery, slots: 0 });
waitFor(() => g.stock('logs') >= 14);
const smith = build('smith', -29, -34);
waitFor(() => g.stock('logs') >= 6);
build('yard', -7, 34);
doCmd({ type: 'scout' });
waitFor(() => g.stock('spears') >= 8, 600);
doCmd({ type: 'recipe', id: smith, recipe: 'shields' });
waitFor(() => g.stock('shields') >= 8 && g.stock('provisions') >= 36, 600);
doCmd({ type: 'workers', id: smith, slots: 0 });
doCmd({ type: 'workers', id: bakery, slots: 0 });
let id: number | undefined;
waitFor(() => {
  if (id) return true;
  const result = g.command({ type: 'muster' });
  if (result.ok) id = result.id;
  return result.ok;
}, 120);
waitFor(() => g.s.formations[0].state === 'ready', 160);
doCmd({ type: 'move', id: id!, x: 55, z: 12 });
waitFor(() => g.enemyDefeated, 450);
doCmd({ type: 'claim' });
doCmd({ type: 'demobilize', id: id! });
waitFor(() => !g.s.formations.length, 180);
waitFor(() => g.stock('logs') >= 8 && g.stock('planks') >= 4);
const post = build('outpost', 60, 30);
// Redirect the remaining workforce to supplies as the new territory is settled.
doCmd({ type: 'workers', id: saw, slots: 0 });
doCmd({ type: 'workers', id: post, slots: 2 });
if (g.food < 60) {
  doCmd({ type: 'trade', good: 'roots', qty: 40, buy: true });
  waitFor(() => g.s.trades.length === 0);
}
waitFor(() => g.s.won, 360);
assert.deepEqual(g.audit(), []);
console.log(
  `Complete charter PASS: won on day ${g.day + 1}, ${g.adults} surviving adults, ${g.food.toFixed(0)} food, ${g.s.coin.toFixed(0)} coin.`,
);

// ---------------------------------------------------------------- Chapter II
// The Iron Road, played on from the same village: no injected resources or coin.
function site(kind: Kind, xs: number[], zs: number[]) {
  for (const x of xs) for (const z of zs) if (!g.validatePlacement(kind, x, z)) return { x, z };
  throw new Error(`No legal site for ${kind}`);
}
waitFor(() => g.s.chapter === 2, 120);
console.log(
  `  chapter II opens day ${g.day + 1}: ${g.stock('spears')} spears, ${g.stock('shields')} shields, ${g.stock('provisions').toFixed(0)} provisions, ${g.stock('iron')} iron, ${g.stock('tools')} tools`,
);
// From here on, answer the raid the moment it is sighted: arm, hold the west
// end of the bridge, and stand down once the raiders break.
let levy: number | undefined,
  marched = false;
react = () => {
  if (!g.s.raidSpawned || g.s.won2) return;
  if (!g.enemyDefeated && !levy) {
    const r = g.command({ type: 'muster' });
    if (r.ok) levy = r.id;
  }
  const f = g.s.formations.find((f) => f.id === levy);
  if (f && !marched && f.state === 'ready') marched = g.command({ type: 'move', id: f.id, x: 26, z: 12 }).ok;
  if (f && g.enemyDefeated && f.state !== 'returning') g.command({ type: 'demobilize', id: f.id });
};
// Peacetime economy: mill the harvest into bread, saw planks for the ridge works.
doCmd({ type: 'workers', id: mill, slots: 1 });
doCmd({ type: 'workers', id: bakery, slots: 2 });
doCmd({ type: 'recipe', id: bakery, recipe: 'bread' });
doCmd({ type: 'workers', id: saw, slots: 2 });
// Replace the shields lost at the crossing before claiming anything worth raiding.
doCmd({ type: 'recipe', id: smith, recipe: 'shields' });
doCmd({ type: 'workers', id: smith, slots: 2 });
doCmd({ type: 'scoutRidge' });
waitFor(() => g.s.ridgeScouted && g.stock('shields') >= 8, 1500);
doCmd({ type: 'workers', id: smith, slots: 0 });
waitFor(() => g.s.coin >= 60, 900);
doCmd({ type: 'claimRidge' });
waitFor(() => g.stock('logs') >= 10 && g.stock('planks') >= 4 && g.stock('tools') >= 2, 900);
const mineAt = site('mine', [72, 74, 76], [-30, -20, -10, 0, 20, 26, 30, 40]);
const mine = build('mine', mineAt.x, mineAt.z);
// Enough planks; send the sawyers to build instead.
doCmd({ type: 'workers', id: saw, slots: 0 });
// Alder has no quarry: stone for the bloomery and tower comes by caravan.
doCmd({ type: 'trade', good: 'stone', qty: 12, buy: true });
waitFor(() => g.stock('logs') >= 6 && g.stock('stone') >= 8, 900);
const bloomeryAt = site('smelter', [-20, -10, 0, 10], [-45, 40, 46, 50, -40]);
const bloomery = build('smelter', bloomeryAt.x, bloomeryAt.z);
doCmd({ type: 'workers', id: mine, slots: 3 });
doCmd({ type: 'workers', id: bloomery, slots: 2 });
console.log(`  ridge claimed; mine and bloomery working by day ${g.day + 1}`);
// A watchtower at the west end of the bridge: militia within 12 m fight at an advantage.
waitFor(() => g.stock('logs') >= 10 && g.stock('planks') >= 4 && g.stock('stone') >= 2, 1500);
build('tower', ...(Object.values(site('tower', [20, 22, 24, 18], [20, 22, 4, 2, 24])) as [number, number]));
// Feed a village of 26 through a whole year, and staff the bloomery.
doCmd({ type: 'workers', id: logger.id, slots: 1 });
doCmd({ type: 'workers', id: post, slots: 0 }); // the crossing is won; its garrison can come home
waitFor(() => g.stock('logs') >= 6 && g.stock('planks') >= 2, 900);
build(
  'fishery',
  ...(Object.values(site('fishery', [22, 24, 20, 26], [-10, -20, -30, 40, 34, 46])) as [number, number]),
);
// Bread and provisions need separate ovens: a second bakehouse preserves roots
// for the levy and stops at 45, staffed by trimming the mine and the field.
const field = g.s.buildings.find((b) => b.kind === 'field')!;
doCmd({ type: 'workers', id: mine, slots: 2 });
doCmd({ type: 'workers', id: field.id, slots: 3 });
doCmd({ type: 'trade', good: 'stone', qty: 6, buy: true });
waitFor(() => g.stock('logs') >= 8 && g.stock('planks') >= 4 && g.stock('stone') >= 4, 900);
const larder = build(
  'bakery',
  ...(Object.values(site('bakery', [-36, -46, -56, 0], [-40, -50, 52, 60])) as [number, number]),
);
doCmd({ type: 'recipe', id: larder, recipe: 'provisions' });
doCmd({ type: 'stockTarget', id: larder, amount: 45 });
waitFor(() => g.s.won2, 3600);
assert.deepEqual(g.audit(), []);
console.log(
  `Chapter II PASS: Iron Road secured on day ${g.day + 1}, ${g.adults} adults, ${g.s.produced.iron!.toFixed(0)} iron smelted, ${g.s.coin.toFixed(0)} coin.`,
);
