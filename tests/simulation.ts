import assert from 'node:assert/strict';
import { Game } from '../src/sim/game';
import { BUILDINGS, GOODS, type Kind } from '../src/sim/content';
const check = (g: Game) => assert.deepEqual(g.audit(), []);
function build(g: Game, kind: Kind, x: number, z: number) {
  const r = g.command({ type: 'build', kind, x, z });
  assert.equal(r.ok, true, r.message);
  return r.id!;
}
const results: string[] = [];
function test(name: string, fn: () => void) {
  const start = performance.now();
  fn();
  results.push(`${name}: PASS (${Math.round(performance.now() - start)} ms)`);
  console.log(results.at(-1));
}
test('Production, physical cargo, and four seasons conserve every resource', () => {
  const g = new Game();
  for (let i = 0; i < 24; i++) {
    g.advance(90);
    check(g);
  }
  assert.ok(g.s.produced.logs! > 0);
  assert.ok(g.s.produced.fish! > 0);
});
test('Mid-delivery save resumes deterministically', () => {
  const g = new Game();
  g.advance(87.25);
  assert.ok(g.s.people.some((p) => Object.values(p.cargo).some((v) => v! > 0)));
  const other = Game.load(g.serialize());
  g.advance(500);
  other.advance(500);
  assert.equal(g.serialize(), other.serialize());
  check(g);
});
test('Construction commits materials once and rejects invalid sites', () => {
  const g = new Game();
  const before = g.stock('logs');
  const id = build(g, 'yard', -7, 34);
  assert.equal(g.stock('logs'), before - BUILDINGS.yard.cost.logs!);
  g.advance(90);
  assert.equal(g.building(id)!.progress, 1);
  check(g);
  assert.equal(g.command({ type: 'build', kind: 'cottage', x: g.depot.x, z: g.depot.z }).ok, false);
  assert.equal(g.command({ type: 'build', kind: 'cottage', x: 35, z: 0 }).ok, false);
});
test('Trade rejects negative quantities and conserves escrow/cargo', () => {
  const g = new Game();
  assert.equal(g.command({ type: 'trade', good: 'logs', qty: -5, buy: true }).ok, false);
  assert.equal(g.command({ type: 'trade', good: 'logs', qty: 4, buy: true }).ok, true);
  assert.equal(g.command({ type: 'trade', good: 'planks', qty: 5, buy: false }).ok, true);
  check(g);
  g.advance(90);
  check(g);
  assert.equal(g.s.trades.length, 0);
});
test('Muster, battle, saved combat and demobilization preserve identity and equipment', () => {
  const g = new Game();
  build(g, 'yard', -7, 34);
  g.advance(90);
  for (const [good, qty] of [
    ['spears', 8],
    ['shields', 8],
    ['provisions', 40],
  ] as const) {
    g.s.coin += 600;
    assert.equal(g.command({ type: 'trade', good, qty, buy: true }).ok, true);
    g.advance(90);
  }
  const r = g.command({ type: 'muster' });
  assert.equal(r.ok, true, r.message);
  check(g);
  g.advance(120);
  assert.notEqual(g.s.formations[0].state, 'gathering');
  assert.equal(g.soldiers, 8);
  assert.ok(g.s.people.filter((p) => p.formation).every((p) => p.job === null));
  assert.equal(g.command({ type: 'scout' }).ok, true);
  g.advance(60);
  assert.equal(g.command({ type: 'move', id: r.id!, x: 55, z: 12 }).ok, true);
  g.advance(140);
  const restored = Game.load(g.serialize());
  g.advance(150);
  restored.advance(150);
  assert.equal(g.serialize(), restored.serialize());
  check(g);
  assert.equal(g.enemyDefeated, true);
  if (g.s.formations.length) {
    assert.equal(g.command({ type: 'demobilize', id: r.id! }).ok, true);
    g.advance(150);
  }
  assert.equal(g.soldiers, 0);
  check(g);
});
test('Corrupt and future saves fail without altering the current settlement', () => {
  const g = new Game(),
    before = g.serialize();
  assert.throws(() => Game.load('{bad'));
  const s = JSON.parse(before);
  s.version = 999;
  assert.throws(() => Game.load(JSON.stringify(s)));
  s.version = 2;
  s.stock.logs = -1;
  assert.throws(() => Game.load(JSON.stringify(s)));
  assert.equal(g.serialize(), before);
});

test('Quarter-turn placement rotates entrances, routes and saved geometry', () => {
  const g = new Game();
  const r = g.command({ type: 'build', kind: 'yard', x: -7, z: 34, rotation: Math.PI / 2 });
  assert.ok(r.ok, r.message);
  const b = g.building(r.id!)!;
  assert.deepEqual(g.footprint('yard', b.rotation), [6, 7]);
  const entrance = g.entrance(b);
  assert.ok(entrance.x > b.x + 4);
  assert.ok(Math.abs(entrance.z - b.z) < 0.001);
  assert.ok(g.path(g.entrance(g.depot), entrance).length);
  g.advance(90);
  assert.equal(b.progress, 1);
  assert.equal(Game.load(g.serialize()).building(b.id)!.rotation, Math.PI / 2);
  assert.equal(g.command({ type: 'build', kind: 'field', x: 0, z: 45, rotation: NaN }).ok, false);
  check(g);
});
test('Cancelling active construction refunds exactly once and releases builders', () => {
  const g = new Game();
  for (const b of g.s.buildings) g.command({ type: 'workers', id: b.id, slots: 0 });
  const id = build(g, 'yard', -7, 34);
  const b = g.building(id)!;
  for (let i = 0; i < 2000 && b.progress === 0; i++) g.step();
  assert.ok(b.progress > 0 && b.progress < 1);
  const logs = g.stock('logs');
  assert.ok(g.command({ type: 'cancelBuild', id }).ok);
  assert.equal(g.stock('logs'), logs + BUILDINGS.yard.cost.logs!);
  assert.equal(g.building(id), undefined);
  assert.ok(g.s.people.every((p) => p.target !== id));
  assert.equal(g.command({ type: 'cancelBuild', id }).ok, false);
  assert.equal(g.command({ type: 'cancelBuild', id: g.depot.id }).ok, false);
  g.advance(30);
  check(g);
  assert.doesNotThrow(() => Game.load(g.serialize()));
});
test('Stock targets count committed batches and restart after spending', () => {
  const g = new Game();
  for (const b of g.s.buildings) g.command({ type: 'workers', id: b.id, slots: 0 });
  const camp = g.s.buildings.find((b) => b.kind === 'logging')!;
  g.command({ type: 'workers', id: camp.id, slots: 2 });
  assert.ok(g.command({ type: 'stockTarget', id: camp.id, amount: 47 }).ok);
  g.advance(300);
  assert.equal(g.stock('logs'), 48);
  const produced = g.s.produced.logs;
  g.advance(90);
  assert.equal(g.s.produced.logs, produced);
  assert.equal(camp.status, 'Stock target reached');
  build(g, 'cottage', -7, 34);
  g.advance(300);
  assert.equal(g.stock('logs'), 48);
  assert.equal(Game.load(g.serialize()).building(camp.id)!.stockTarget, 47);
  assert.equal(g.command({ type: 'stockTarget', id: camp.id, amount: -1 }).ok, false);
  assert.ok(g.command({ type: 'stockTarget', id: camp.id, amount: null }).ok);
  check(g);
});
test('Winter baseline reflects housing, current season and military separation', () => {
  const g = new Game();
  assert.equal(g.winterReserve.days, 6);
  assert.equal(g.winterReserve.fuel, 60);
  assert.equal(g.winterReserve.food, 108);
  g.advance(18 * 90);
  assert.equal(g.season, 3);
  assert.equal(g.winterReserve.startsIn, 0);
  assert.equal(g.winterReserve.days, 6);
  check(g);
});
test('Roads cost stone, refuse the river, speed workers, and survive a save', () => {
  const g = new Game();
  const stone = g.stock('stone');
  // The river and buildings are hard limits.
  assert.equal(g.command({ type: 'road', a: { x: 20, z: 30 }, b: { x: 45, z: 30 } }).ok, false);
  assert.equal(
    g.command({
      type: 'road',
      a: { x: g.depot.x - 10, z: g.depot.z },
      b: { x: g.depot.x + 10, z: g.depot.z },
    }).ok,
    false,
  );
  assert.equal(g.command({ type: 'road', a: { x: 0, z: 40 }, b: { x: 0.5, z: 40 } }).ok, false);
  // A legal stretch costs one stone per five metres, rounded up.
  const r = g.command({ type: 'road', a: { x: -40, z: 40 }, b: { x: -10, z: 40 } });
  assert.equal(r.ok, true, r.message);
  assert.equal(g.stock('stone'), stone - 6);
  assert.ok(g.onRoad({ x: -25, z: 40 }));
  assert.ok(!g.onRoad({ x: -25, z: 30 }));
  check(g);
  // Routes prefer the road: a trip along it is no longer, and is walked faster.
  const along = g.path({ x: -40, z: 40 }, { x: -10, z: 40 });
  assert.ok(along.every((p) => Math.abs(p.z - 40) < 3));
  const restored = Game.load(g.serialize());
  assert.equal(restored.s.roads.length, 1);
  assert.ok(restored.onRoad({ x: -25, z: 40 }));
  // Lifting it returns half the stone, recorded as salvage, and conservation still holds.
  assert.equal(g.command({ type: 'clearRoad', x: -25, z: 40.5 }).ok, true);
  assert.equal(g.stock('stone'), stone - 3);
  assert.equal(g.s.roads.length, 0);
  assert.equal(g.command({ type: 'clearRoad', x: -25, z: 40 }).ok, false);
  g.advance(90);
  check(g);
});
test('Workers walk a road half again as fast', () => {
  const walk = (withRoad: boolean) => {
    const g = new Game();
    if (withRoad) assert.ok(g.command({ type: 'road', a: { x: -40, z: 46 }, b: { x: -5, z: 46 } }).ok);
    const p = g.s.people[0];
    p.x = -40;
    p.z = 46;
    p.job = null;
    p.task = 'toDepot';
    p.path = g.path(p, { x: -5, z: 46 });
    p.cargo = {};
    let ticks = 0;
    // Drive this one walker directly; the rest of the village is irrelevant here.
    while (p.path.length && ticks < 5000) {
      (g as unknown as { move(p: unknown): boolean }).move(p);
      ticks++;
    }
    return ticks;
  };
  const off = walk(false),
    on = walk(true);
  assert.ok(on < off * 0.75, `road ${on} ticks vs field ${off}`);
});
test('Demolition salvages half, releases workers, and keeps every resource accounted for', () => {
  const g = new Game();
  const camp = g.s.buildings.find((b) => b.kind === 'logging')!;
  g.advance(40); // workers are out, some carrying timber
  const logs = g.stock('logs');
  assert.equal(g.command({ type: 'demolish', id: camp.id }).ok, true);
  assert.equal(g.building(camp.id), undefined);
  assert.equal(g.stock('logs'), logs + Math.floor(BUILDINGS.logging.cost.logs! / 2));
  assert.ok(g.s.people.every((p) => p.job !== camp.id));
  check(g);
  g.advance(60);
  check(g);
  // What cannot come down.
  assert.equal(g.command({ type: 'demolish', id: g.depot.id }).ok, false);
  const site = build(g, 'yard', -7, 34);
  assert.equal(
    g.command({ type: 'demolish', id: site }).ok,
    false,
    'unfinished sites are cancelled, not demolished',
  );
  // 5 cottages house 20 and the village has 20 people: no home can go.
  const home = g.s.buildings.find((b) => b.kind === 'cottage')!;
  assert.equal(g.command({ type: 'demolish', id: home.id }).ok, false);
  assert.doesNotThrow(() => Game.load(g.serialize()));
});
test('Traders hold finite stock, raise prices as it drains, and restock over time', () => {
  const g = new Game();
  g.s.coin = 5000;
  const cheap = g.price('iron', true);
  assert.ok(g.command({ type: 'trade', good: 'iron', qty: 20, buy: true }).ok);
  assert.ok(g.price('iron', true) > cheap * 1.5, 'scarcity raises the price');
  // Only 4 left: a second big order fails, a small one succeeds.
  assert.equal(g.command({ type: 'trade', good: 'iron', qty: 10, buy: true }).ok, false);
  assert.ok(g.command({ type: 'trade', good: 'iron', qty: 4, buy: true }).ok);
  g.advance(90 * 15);
  assert.ok((g.s.market.iron ?? 0) > 15, 'traders restock toward their usual levels');
  check(g);
  // Selling floods the market, so the next load fetches less.
  const before = g.price('planks', false);
  assert.ok(g.command({ type: 'trade', good: 'planks', qty: 20, buy: false }).ok);
  g.advance(90);
  assert.ok(g.price('planks', false) < before, 'a flooded market pays less');
  check(g);
});
test('Iron Ridge stays closed until the crossing holds, and mines only fit on the ridge', () => {
  const g = new Game();
  assert.equal(g.command({ type: 'scoutRidge' }).ok, false);
  assert.match(g.validatePlacement('mine', 74, 24), /beyond this charter/);
  assert.match(g.validatePlacement('mine', -40, 40), /Iron Ridge/);
  g.s.won = true;
  g.advance(90);
  assert.equal(g.s.chapter, 2, 'winning the crossing opens chapter II');
  g.s.coin = 200;
  assert.equal(g.command({ type: 'claimRidge' }).ok, false, 'survey first');
  assert.ok(g.command({ type: 'scoutRidge' }).ok);
  g.advance(61);
  assert.ok(g.s.ridgeScouted);
  assert.ok(g.command({ type: 'claimRidge' }).ok);
  assert.equal(g.validatePlacement('mine', 74, 24), '');
  check(g);
});
test('Saves from before roads, markets and chapter II still load', () => {
  const g = new Game();
  g.advance(200);
  const old = JSON.parse(g.serialize());
  for (const k of [
    'roads',
    'salvaged',
    'market',
    'chapter',
    'ridgeScouting',
    'ridgeScouted',
    'ridgeClaimed',
    'ridgeClaimedDay',
    'raidSpawned',
    'won2',
  ])
    delete old[k];
  for (const k of ['stock', 'produced', 'consumed', 'losses', 'imports', 'exports', 'initial'])
    delete old[k].ore;
  const restored = Game.load(JSON.stringify(old));
  assert.equal(restored.s.roads.length, 0);
  assert.equal(restored.s.chapter, 1);
  assert.equal(restored.stock('ore'), 0);
  check(restored);
  restored.advance(200);
  check(restored);
});
console.log(`${results.length} scenario checks passed.`);
