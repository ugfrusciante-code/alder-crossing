import {
  BUILDINGS,
  RECIPES,
  DAY_SECONDS,
  SEASON_DAYS,
  TICK,
  NAMES,
  EDIBLE,
  PRICES,
  GOODS,
  type Stock,
  type Good,
  type Kind,
  type RecipeId,
} from './content';
import { dist, water, riverX, bridge, region, walkable, type Point } from './terrain';

export interface Building extends Point {
  id: number;
  kind: Kind;
  rotation: number;
  progress: number;
  slots: number;
  recipe?: RecipeId;
  stockTarget?: number;
  crop: number;
  harvest: number;
  work: number;
  status: string;
  delivered: Stock;
}
export interface Person extends Point {
  id: number;
  name: string;
  home: number;
  job: number | null;
  formation: number | null;
  task: 'idle' | 'toWork' | 'work' | 'toDepot' | 'build' | 'muster' | 'military';
  path: Point[];
  cargo: Stock;
  work: number;
  alive: boolean;
  woundedUntil: number;
  target: number | null;
  tripRecipe?: RecipeId;
}
export interface Formation extends Point {
  id: number;
  members: number[];
  target: Point;
  morale: number;
  fatigue: number;
  provisions: number;
  spears: number;
  shields: number;
  state: 'gathering' | 'ready' | 'moving' | 'fighting' | 'routing' | 'returning';
  damage: number;
}
export interface Enemy extends Point {
  count: number;
  morale: number;
  damage: number;
  target: Point;
  routed: boolean;
}
export interface Event {
  day: number;
  text: string;
  kind: 'info' | 'good' | 'bad';
}
export interface Trade {
  good: Good;
  qty: number;
  buy: boolean;
  time: number;
  price: number;
}
export interface State {
  version: 2;
  seed: number;
  tick: number;
  nextId: number;
  stock: Stock;
  coin: number;
  people: Person[];
  buildings: Building[];
  formations: Formation[];
  enemy: Enemy;
  trades: Trade[];
  events: Event[];
  children: number;
  wellbeing: number;
  hunger: number;
  scouting: number;
  scouted: boolean;
  claimed: boolean;
  holdDays: number;
  won: boolean;
  lost: boolean;
  immigrated: boolean;
  outpostSupply: boolean;
  lastTax: number;
  lastConsumption: number;
  produced: Stock;
  consumed: Stock;
  losses: Stock;
  imports: Stock;
  exports: Stock;
  initial: Stock;
  history: { day: number; food: number; coin: number; population: number }[];
  objectives: string[];
  rng: number;
}
export type Command =
  | { type: 'build'; kind: Kind; x: number; z: number; rotation?: number }
  | { type: 'workers'; id: number; slots: number }
  | { type: 'recipe'; id: number; recipe: RecipeId }
  | { type: 'cancelBuild'; id: number }
  | { type: 'stockTarget'; id: number; amount: number | null }
  | { type: 'muster' }
  | { type: 'move'; id: number; x: number; z: number }
  | { type: 'demobilize'; id: number }
  | { type: 'trade'; good: Good; qty: number; buy: boolean }
  | { type: 'scout' }
  | { type: 'claim' }
  | { type: 'immigrate' };
export interface Result {
  ok: boolean;
  message: string;
  id?: number;
}
const blank = (): Stock => Object.fromEntries(GOODS.map((g) => [g, 0]));
const sum = (s: Stock) => Object.values(s).reduce((a, b) => a + (b ?? 0), 0);
const has = (s: Stock, cost: Stock) =>
  Object.entries(cost).every(([g, n]) => (s[g as Good] ?? 0) + 1e-7 >= (n ?? 0));
const add = (s: Stock, goods: Stock, factor = 1) => {
  for (const [g, n] of Object.entries(goods))
    s[g as Good] = Math.max(0, (s[g as Good] ?? 0) + (n ?? 0) * factor);
};
const ok = (message: string, id?: number): Result => ({ ok: true, message, id });
const no = (message: string): Result => ({ ok: false, message });

export class Game {
  s: State;
  private routeCache = new Map<string, Point[]>();
  constructor(saved?: State) {
    if (saved) {
      this.s = saved;
      return;
    }
    const initial: Stock = {
      logs: 44,
      planks: 24,
      stone: 24,
      firewood: 60,
      grain: 0,
      flour: 0,
      bread: 80,
      roots: 100,
      fish: 20,
      provisions: 0,
      tools: 8,
      iron: 12,
      spears: 0,
      shields: 0,
    };
    this.s = {
      version: 2,
      seed: 1701,
      tick: 0,
      nextId: 1,
      stock: { ...blank(), ...initial },
      coin: 160,
      people: [],
      buildings: [],
      formations: [],
      enemy: { x: 58, z: 12, count: 8, morale: 85, damage: 0, target: { x: 58, z: 12 }, routed: false },
      trades: [],
      events: [],
      children: 4,
      wellbeing: 80,
      hunger: 0,
      scouting: 0,
      scouted: false,
      claimed: false,
      holdDays: 0,
      won: false,
      lost: false,
      immigrated: false,
      outpostSupply: false,
      lastTax: 0,
      lastConsumption: 0,
      produced: blank(),
      consumed: blank(),
      losses: blank(),
      imports: blank(),
      exports: blank(),
      initial,
      history: [],
      objectives: [],
      rng: 1701,
    };
    this.place('depot', -17, 5, true);
    const homes = [
      [-31, -9],
      [-42, 0],
      [-38, 15],
      [-27, 23],
      [-13, 22],
    ].map(([x, z]) => this.place('cottage', x, z, true));
    this.place('logging', -47, -23, true, 2);
    this.place('forager', -48, 29, true, 2);
    this.place('fishery', 25, 23, true, 2);
    this.place('splitter', -28, -24, true, 1);
    this.place('field', -6, -19, true, 4);
    for (let i = 0; i < 16; i++) this.spawn(homes[i % homes.length].id);
    this.log(
      'Your charter begins at Alder Crossing. Feed the village, equip its militia, and secure the eastern road.',
      'good',
    );
    this.assign();
  }
  get time() {
    return this.s.tick * TICK;
  }
  get day() {
    return Math.floor(this.time / DAY_SECONDS);
  }
  get season() {
    return Math.floor(this.day / SEASON_DAYS) % 4;
  }
  get year() {
    return Math.floor(this.day / 24) + 1;
  }
  get adults() {
    return this.s.people.filter((p) => p.alive).length;
  }
  get soldiers() {
    return this.s.formations.reduce((n, f) => n + f.members.length, 0);
  }
  get population() {
    return this.adults + this.s.children;
  }
  get food() {
    return EDIBLE.reduce((n, g) => n + (this.s.stock[g] ?? 0), 0);
  }
  get demand() {
    return this.adults - this.soldiers + this.s.children * 0.5 + this.soldiers * 1.5;
  }
  get runway() {
    return this.food / Math.max(1, this.adults - this.soldiers + this.s.children * 0.5);
  }
  get housing() {
    return this.s.buildings.filter((b) => b.kind === 'cottage' && b.progress >= 1).length * 4;
  }
  get depot() {
    return this.s.buildings.find((b) => b.kind === 'depot')!;
  }
  get idle() {
    return this.s.people.filter((p) => p.alive && !p.formation && !p.job && p.woundedUntil <= this.day)
      .length;
  }
  get enemyDefeated() {
    return this.s.enemy.count === 0 || this.s.enemy.routed;
  }
  stock(g: Good) {
    return this.s.stock[g] ?? 0;
  }
  rand() {
    this.s.rng = (Math.imul(this.s.rng, 1664525) + 1013904223) | 0;
    return (this.s.rng >>> 0) / 4294967296;
  }
  log(text: string, kind: Event['kind'] = 'info') {
    this.s.events.push({ day: this.day, text, kind });
    if (this.s.events.length > 60) this.s.events.shift();
  }
  building(id: number) {
    return this.s.buildings.find((b) => b.id === id);
  }
  workers(id: number) {
    return this.s.people.filter((p) => p.alive && p.job === id && !p.formation && p.woundedUntil <= this.day);
  }
  footprint(kind: Kind, rotation = 0): [number, number] {
    const [w, d] = BUILDINGS[kind].size;
    return Math.round(rotation / (Math.PI / 2)) % 2 ? [d, w] : [w, d];
  }
  entrance(b: Pick<Building, 'x' | 'z' | 'kind' | 'rotation'>): Point {
    const distance = BUILDINGS[b.kind].size[1] / 2 + 1.2;
    return { x: b.x + Math.sin(b.rotation) * distance, z: b.z + Math.cos(b.rotation) * distance };
  }
  carried(g: Good) {
    return this.s.people.reduce((total, p) => total + (p.cargo[g] ?? 0), 0);
  }
  reserved(g: Good) {
    return this.s.buildings.reduce((total, b) => total + (b.delivered[g] ?? 0), 0);
  }
  private pipeline(g: Good) {
    return (
      this.carried(g) +
      this.s.people.reduce(
        (total, p) =>
          total +
          (p.alive && p.tripRecipe && (p.task === 'work' || p.task === 'toWork')
            ? (RECIPES[p.tripRecipe].output[g] ?? 0)
            : 0),
        0,
      )
    );
  }
  get winterReserve() {
    const homes = this.s.buildings.filter((b) => b.kind === 'cottage' && b.progress >= 1).length;
    const days = this.season === 3 ? 24 - (this.day % 24) : 6;
    const civilian = this.adults - this.soldiers + this.s.children * 0.5;
    return {
      days,
      startsIn: this.season === 3 ? 0 : 18 - (this.day % 24),
      fuel: homes * 2 * days,
      food: civilian * days,
      military: this.soldiers * 1.5 * days,
      fuelGap: Math.max(0, homes * 2 * days - this.stock('firewood')),
      foodGap: Math.max(0, civilian * days - this.food),
    };
  }
  spawn(home: number) {
    const id = this.s.nextId++;
    this.s.people.push({
      id,
      name: NAMES[this.adults % NAMES.length],
      home,
      job: null,
      formation: null,
      x: this.depot.x + (this.rand() - 0.5) * 6,
      z: this.depot.z + 6 + this.rand() * 3,
      task: 'idle',
      path: [],
      cargo: {},
      work: 0,
      alive: true,
      woundedUntil: 0,
      target: null,
    });
  }
  private place(kind: Kind, x: number, z: number, ready = false, slots?: number) {
    const b: Building = {
      id: this.s.nextId++,
      kind,
      x,
      z,
      rotation: 0,
      progress: ready ? 1 : 0,
      slots: slots ?? BUILDINGS[kind].jobs,
      recipe: BUILDINGS[kind].recipe,
      crop: 0,
      harvest: 0,
      work: 0,
      status: ready ? 'Ready' : 'Awaiting builders',
      delivered: {},
    };
    this.s.buildings.push(b);
    this.routeCache.clear();
    return b;
  }
  validatePlacement(kind: Kind, x: number, z: number, rotation = 0) {
    const def = BUILDINGS[kind];
    if (!def || !Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(rotation))
      return 'Invalid building location.';
    const [w, d] = this.footprint(kind, rotation);
    if (Math.abs(x) + w / 2 > 80 || Math.abs(z) + d / 2 > 75) return 'Stay inside the surveyed valley.';
    if (kind === 'outpost') {
      if (!this.s.claimed) return 'Scout, defeat the occupiers, and purchase the crossing charter first.';
      if (region(x) !== 1) return 'The outpost belongs on the eastern crossing.';
    } else if (region(x) > 0 && !this.s.claimed) return 'This land is not under your charter.';
    if (water(x, z) || Math.abs(x - riverX(z)) < w / 2 + 6) return 'Keep the footprint on dry land.';
    if (kind === 'fishery' && Math.abs(x - riverX(z)) > 19)
      return 'A fishing hut needs to be close to the river.';
    if (bridge(x, z) || (Math.abs(z - 12) < 4 && x > 16 && x < 59))
      return 'Keep the bridge and eastern road clear.';
    for (const dx of [-w / 2, w / 2])
      for (const dz of [-d / 2, d / 2])
        if (water(x + dx, z + dz)) return 'Keep the whole footprint on dry land.';
    const entry = this.entrance({ kind, x, z, rotation });
    if (!walkable(entry.x, entry.z)) return 'Turn the entrance toward reachable ground.';
    for (const b of this.s.buildings) {
      const [bw, bd] = this.footprint(b.kind, b.rotation);
      if (Math.abs(x - b.x) < (w + bw) / 2 + 2 && Math.abs(z - b.z) < (d + bd) / 2 + 2)
        return 'Leave room around the neighboring building.';
    }
    return '';
  }
  command(c: Command): Result {
    if (this.s.lost) return no('This charter has ended. Start a new settlement from the menu.');
    switch (c.type) {
      case 'build': {
        const rotation = ((((Math.round((c.rotation ?? 0) / (Math.PI / 2)) % 4) + 4) % 4) * Math.PI) / 2;
        const why = this.validatePlacement(c.kind, c.x, c.z, rotation);
        if (why) return no(why);
        const def = BUILDINGS[c.kind];
        if (!has(this.s.stock, def.cost)) return no('Not enough materials in the granary.');
        add(this.s.stock, def.cost, -1);
        const b = this.place(c.kind, c.x, c.z);
        b.rotation = rotation;
        b.delivered = { ...def.cost };
        this.assign();
        return ok(`${def.name} planned. Materials reserved; available workers will build it.`, b.id);
      }
      case 'cancelBuild': {
        const b = this.building(c.id);
        if (!b || b.progress >= 1) return no('Only unfinished construction can be cancelled.');
        add(this.s.stock, b.delivered);
        b.delivered = {};
        this.s.buildings = this.s.buildings.filter((a) => a.id !== b.id);
        this.routeCache.clear();
        for (const p of this.s.people) {
          if (p.target === b.id || p.job === b.id) {
            p.target = null;
            p.job = null;
            p.work = 0;
            p.path = [];
            p.task = 'idle';
            p.tripRecipe = undefined;
          }
        }
        this.assign();
        this.log(`${BUILDINGS[b.kind].name} cancelled. Reserved materials returned.`);
        return ok('Construction cancelled. All reserved materials returned.');
      }
      case 'stockTarget': {
        const b = this.building(c.id);
        if (!b?.recipe || b.kind === 'field') return no('Select a producing workshop.');
        if (c.amount !== null && (!Number.isFinite(c.amount) || c.amount < 0 || c.amount > 9999))
          return no('Choose a target between 0 and 9999, or leave it empty.');
        if (c.amount === null) delete b.stockTarget;
        else b.stockTarget = Math.floor(c.amount);
        return ok(
          c.amount === null
            ? 'Workshop will produce continuously.'
            : 'Stock target updated. Existing batches finish first.',
        );
      }
      case 'workers': {
        const b = this.building(c.id);
        if (!b) return no('Building not found.');
        if (!Number.isFinite(c.slots)) return no('Invalid worker count.');
        b.slots = Math.max(0, Math.min(BUILDINGS[b.kind].jobs, Math.floor(c.slots)));
        this.assign();
        return ok('Worker priority updated.');
      }
      case 'recipe': {
        const b = this.building(c.id);
        if (!b || !BUILDINGS[b.kind].recipes?.includes(c.recipe))
          return no('This workshop cannot make that.');
        b.recipe = c.recipe;
        return ok('Recipe updated. Existing batches finish first.');
      }
      case 'muster':
        return this.muster();
      case 'move': {
        const f = this.s.formations.find((f) => f.id === c.id);
        if (!f) return no('Select a formation.');
        if (f.state === 'gathering') return no('Your militia is still gathering.');
        if (!walkable(c.x, c.z)) return no('Choose reachable ground or the bridge.');
        f.target = { x: Math.max(-80, Math.min(85, c.x)), z: Math.max(-75, Math.min(75, c.z)) };
        f.state = 'moving';
        return ok('March order received.');
      }
      case 'demobilize': {
        const f = this.s.formations.find((f) => f.id === c.id);
        if (!f) return no('Formation not found.');
        f.state = 'returning';
        f.target = this.entrance(this.depot);
        return ok('Returning to the granary. Gear and remaining provisions will be recovered.');
      }
      case 'trade': {
        if (!GOODS.includes(c.good) || !Number.isFinite(c.qty) || c.qty < 1 || c.qty > 40)
          return no('Trade between 1 and 40 units at a time.');
        if (this.s.trades.length >= 2) return no('Both caravan slots are in use.');
        const qty = Math.floor(c.qty);
        const price = PRICES[c.good] * qty * (c.buy ? 1.2 : 0.7);
        if (c.buy) {
          if (this.s.coin < price) return no('Not enough coin.');
          this.s.coin -= price;
        } else {
          if (this.stock(c.good) < qty) return no('Not enough uncommitted stock.');
          this.s.stock[c.good] = this.stock(c.good) - qty;
        }
        this.s.trades.push({ good: c.good, qty, buy: c.buy, time: 0, price });
        return ok('Caravan contracted. Delivery in one game day.');
      }
      case 'scout':
        if (this.s.scouted || this.s.scouting > 0)
          return no('The crossing is already surveyed or being scouted.');
        if (this.s.coin < 10) return no('The scout needs 10 coin for the journey.');
        this.s.coin -= 10;
        this.s.scouting = 1;
        this.log('A scout takes the eastern road. Return expected in one minute.');
        return ok('Scout dispatched.');
      case 'claim':
        if (!this.s.scouted) return no('Scout the crossing first.');
        if (!this.enemyDefeated) return no('Drive off the occupying militia first.');
        if (this.s.claimed) return no('The crossing charter is already yours.');
        if (this.s.coin < 40) return no('The crossing charter costs 40 coin.');
        this.s.coin -= 40;
        this.s.claimed = true;
        this.log(
          'The crossing charter is yours. Build and staff an eastern outpost, then supply it for two days.',
          'good',
        );
        return ok('Eastern land is open for construction.');
      case 'immigrate':
        if (this.s.immigrated) return no('The newcomers have already joined.');
        if (this.housing < this.population + 8)
          return no('Build enough cottages for eight more people first.');
        if (this.food < 80) return no('Keep at least 80 food portions before accepting newcomers.');
        for (let i = 0; i < 8; i++)
          this.spawn(
            this.s.buildings.filter((b) => b.kind === 'cottage')[
              i % this.s.buildings.filter((b) => b.kind === 'cottage').length
            ].id,
          );
        this.s.immigrated = true;
        this.assign();
        this.log('Eight new workers join Alder. Their food and housing needs are now yours.', 'good');
        return ok('The newcomers have settled in.');
    }
  }
  private muster() {
    const yard = this.s.buildings.find((b) => b.kind === 'yard' && b.progress >= 1);
    if (!yard) return no('Build a mustering yard first.');
    if (this.s.formations.length >= 2) return no('This charter supports two formations.');
    const candidates = this.s.people
      .filter((p) => p.alive && !p.formation && p.woundedUntil <= this.day && sum(p.cargo) < 0.001)
      .sort((a, b) => (a.job ? 1 : 0) - (b.job ? 1 : 0));
    if (candidates.length < 8)
      return no('Eight healthy workers must finish their deliveries before mustering.');
    if (this.stock('spears') < 8 || this.stock('shields') < 8 || this.stock('provisions') < 36)
      return no('Need 8 spears, 8 shields and 36 provisions in the granary.');
    const gear = { spears: 8, shields: 8, provisions: 36 };
    add(this.s.stock, gear, -1);
    const id = this.s.nextId++;
    const rally = this.entrance(yard);
    const f: Formation = {
      id,
      members: candidates.slice(0, 8).map((p) => p.id),
      ...rally,
      target: { ...rally },
      morale: this.s.wellbeing,
      fatigue: 0,
      provisions: 36,
      spears: 8,
      shields: 8,
      state: 'gathering',
      damage: 0,
    };
    this.s.formations.push(f);
    for (const p of candidates.slice(0, 8)) {
      p.job = null;
      p.formation = id;
      p.task = 'muster';
      p.work = 0;
      p.tripRecipe = undefined;
      p.path = this.path(p, f);
    }
    this.assign();
    this.log(
      'Eight workers take up arms. Their workshops need replacements; militia consumes 12 provisions per day.',
      'info',
    );
    return ok('Militia gathering at the yard.', id);
  }
  private assign() {
    for (const p of this.s.people) {
      if (p.job) {
        const b = this.building(p.job);
        if (!b || p.formation || !p.alive || p.woundedUntil > this.day) p.job = null;
      }
    }
    for (const b of this.s.buildings) {
      const crew = this.workers(b.id);
      for (const p of crew.slice(b.slots)) {
        p.job = null;
        if (sum(p.cargo) < 0.001) {
          p.task = 'idle';
          p.path = [];
          p.work = 0;
          p.tripRecipe = undefined;
        }
      }
    }
    const available = () =>
      this.s.people.filter((p) => p.alive && !p.formation && !p.job && p.woundedUntil <= this.day);
    for (const b of this.s.buildings.filter((b) => b.progress >= 1 && b.slots > 0)) {
      let need = b.slots - this.workers(b.id).length;
      for (const p of available()) {
        if (need-- <= 0) break;
        p.job = b.id;
      }
    }
  }
  path(from: Point, to: Point): Point[] {
    // Authoritative two-metre grid. Paths respect the river crossing and building footprints.
    const cell = (v: number) => Math.max(1, Math.min(98, Math.round((v + 100) / 2)));
    const sx = cell(from.x),
      sz = cell(from.z),
      tx = cell(to.x),
      tz = cell(to.z);
    const key = `${sx},${sz},${tx},${tz}`;
    const cached = this.routeCache.get(key);
    if (cached) return cached.map((p) => ({ ...p }));
    const start = sz * 100 + sx,
      end = tz * 100 + tx;
    const open: number[] = [start],
      parent = new Map<number, number>(),
      g = new Map([[start, 0]]),
      closed = new Set<number>();
    const blocked = (x: number, z: number) =>
      !walkable(x, z) ||
      this.s.buildings.some((b) => {
        const [w, d] = this.footprint(b.kind, b.rotation);
        return b.kind !== 'field' && Math.abs(x - b.x) < w / 2 + 0.3 && Math.abs(z - b.z) < d / 2 + 0.3;
      });
    let found = false;
    while (open.length && closed.size < 9000) {
      let bi = 0,
        best = 1e9;
      for (let i = 0; i < open.length; i++) {
        const id = open[i],
          v = g.get(id)! + Math.abs((id % 100) - tx) + Math.abs(Math.floor(id / 100) - tz);
        if (v < best) {
          bi = i;
          best = v;
        }
      }
      const current = open.splice(bi, 1)[0];
      if (current === end) {
        found = true;
        break;
      }
      closed.add(current);
      const x = current % 100,
        z = Math.floor(current / 100);
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx,
          nz = z + dz,
          id = nz * 100 + nx;
        if (nx < 1 || nz < 1 || nx > 98 || nz > 98 || closed.has(id)) continue;
        if (id !== end && blocked(nx * 2 - 100, nz * 2 - 100)) continue;
        const cost = g.get(current)! + 1;
        if (cost < (g.get(id) ?? 1e9)) {
          g.set(id, cost);
          parent.set(id, current);
          if (!open.includes(id)) open.push(id);
        }
      }
    }
    if (!found) return [];
    const result: Point[] = [];
    let cur = end;
    while (cur !== start) {
      result.push({ x: (cur % 100) * 2 - 100, z: Math.floor(cur / 100) * 2 - 100 });
      cur = parent.get(cur)!;
    }
    result.reverse();
    result.push({ ...to });
    if (this.routeCache.size > 1500) this.routeCache.clear();
    this.routeCache.set(key, result);
    return result.map((p) => ({ ...p }));
  }
  private move(p: Person, speed = 2.4) {
    if (!p.path.length) return true;
    let budget = speed * TICK;
    while (p.path.length && budget > 0) {
      const q = p.path[0],
        d = dist(p, q);
      if (d <= budget) {
        p.x = q.x;
        p.z = q.z;
        budget -= d;
        p.path.shift();
      } else {
        p.x += ((q.x - p.x) / d) * budget;
        p.z += ((q.z - p.z) / d) * budget;
        budget = 0;
      }
    }
    return !p.path.length;
  }
  private travel(p: Person, to: Point, task: Person['task']) {
    p.path = this.path(p, to);
    p.task = task;
    return p.path.length > 0 || dist(p, to) < 2;
  }
  private returnCargo(p: Person) {
    add(this.s.stock, p.cargo);
    p.cargo = {};
    p.tripRecipe = undefined;
    p.task = 'idle';
    p.work = 0;
  }
  private worker(p: Person) {
    if (!p.alive || p.formation) return;
    if (p.woundedUntil > this.day) {
      p.job = null;
      if (sum(p.cargo) > 0 && p.task !== 'toDepot') this.travel(p, this.entrance(this.depot), 'toDepot');
      if (p.task === 'toDepot' && this.move(p, 1.3)) this.returnCargo(p);
      return;
    }
    if (p.task === 'toDepot') {
      if (this.move(p)) this.returnCargo(p);
      return;
    }
    if (p.task === 'build') {
      const b = this.building(p.target ?? 0);
      if (!b || b.progress >= 1) {
        p.task = 'idle';
        p.target = null;
        return;
      }
      if (p.path.length) {
        this.move(p);
        return;
      }
      if (dist(p, this.entrance(b)) > 3) {
        b.status = 'Entrance unreachable';
        return;
      }
      b.progress = Math.min(1, b.progress + TICK / BUILDINGS[b.kind].work);
      b.status = 'Building';
      if (b.progress >= 1) {
        add(this.s.consumed, b.delivered);
        b.delivered = {};
        this.log(`${BUILDINGS[b.kind].name} completed.`, 'good');
        this.assign();
      }
      return;
    }
    const b = p.job ? this.building(p.job) : undefined;
    if (p.task === 'toWork') {
      if (this.move(p)) {
        if (b && dist(p, this.entrance(b)) < 3) {
          p.task = 'work';
          p.work = 0;
        } else if (sum(p.cargo) > 0) this.travel(p, this.entrance(this.depot), 'toDepot');
        else p.task = 'idle';
      }
      return;
    }
    if (p.task === 'work') {
      if (!b) {
        if (sum(p.cargo) > 0) this.travel(p, this.entrance(this.depot), 'toDepot');
        else p.task = 'idle';
        return;
      }
      if (b.kind === 'outpost') {
        b.status = 'Holding the crossing';
        return;
      }
      if (b.kind === 'field') {
        if (this.season === 0 || this.season === 1) {
          b.crop = Math.min(1, b.crop + TICK / 1300);
          b.status = this.season === 0 ? 'Sowing & tending' : 'Tending grain';
          return;
        }
        if (this.season === 3 || b.harvest <= 0) {
          b.status = this.season === 3 ? 'Winter fallow' : 'Harvest complete';
          return;
        }
      }
      const rid = p.tripRecipe ?? b.recipe;
      if (!rid) return;
      const r = RECIPES[rid];
      if (r.seasonal && this.season === 3) {
        b.status = 'Ground frozen';
        p.task = 'idle';
        return;
      }
      p.work += TICK * (this.s.wellbeing < 30 ? 0.7 : 1);
      b.status = 'Working';
      if (p.work >= r.work) {
        add(this.s.consumed, p.cargo);
        p.cargo = {};
        let output = { ...r.output };
        if (b.kind === 'field') {
          const q = Math.min(8, b.harvest);
          output = { grain: q };
          b.harvest -= q;
        }
        add(this.s.produced, output);
        p.cargo = output;
        p.work = 0;
        this.travel(p, this.entrance(this.depot), 'toDepot');
      }
      return;
    }
    if (sum(p.cargo) > 0) {
      this.travel(p, this.entrance(this.depot), 'toDepot');
      return;
    }
    if (!b) {
      const site = this.s.buildings.find((b) => b.progress < 1);
      if (site) {
        p.target = site.id;
        this.travel(p, this.entrance(site), 'build');
      }
      return;
    }
    if (b.kind === 'outpost') {
      this.travel(p, this.entrance(b), 'toWork');
      return;
    }
    if (b.kind === 'field') {
      if (this.season === 3 || (this.season === 2 && b.harvest <= 0)) {
        b.status = 'Field resting';
        return;
      }
      p.tripRecipe = 'grain';
      this.travel(p, this.entrance(b), 'toWork');
      return;
    }
    const r = RECIPES[b.recipe!];
    if (!r) return;
    if (r.seasonal && this.season === 3) {
      b.status = 'Ground frozen';
      return;
    }
    if (
      b.stockTarget !== undefined &&
      Object.keys(r.output).every((g) => this.stock(g as Good) + this.pipeline(g as Good) >= b.stockTarget!)
    ) {
      b.status = 'Stock target reached';
      return;
    }
    if (sum(r.input) > 0) {
      if (dist(p, this.entrance(this.depot)) > 3) {
        this.travel(p, this.entrance(this.depot), 'toDepot');
        return;
      }
      if (!has(this.s.stock, r.input)) {
        b.status = `Needs ${Object.keys(r.input)
          .filter((g) => this.stock(g as Good) < (r.input[g as Good] ?? 0))
          .join(' & ')}`;
        return;
      }
      add(this.s.stock, r.input, -1);
      p.cargo = { ...r.input };
    }
    p.tripRecipe = b.recipe;
    this.travel(p, this.entrance(b), 'toWork');
  }
  step() {
    if (this.s.lost) return;
    const before = this.day;
    this.s.tick++;
    if (this.s.tick % 20 === 0) this.assign();
    for (const p of this.s.people) this.worker(p);
    this.military();
    if (this.s.scouting > 0) {
      this.s.scouting += TICK;
      if (this.s.scouting >= 60) {
        this.s.scouting = 0;
        this.s.scouted = true;
        this.log(
          'The scout found eight occupiers beyond the bridge. The crossing controls access to the iron road.',
          'good',
        );
      }
    }
    for (const t of this.s.trades) t.time = Math.round((t.time + TICK) * 20) / 20;
    for (const t of this.s.trades.filter((t) => t.time >= DAY_SECONDS)) {
      if (t.buy) {
        add(this.s.stock, { [t.good]: t.qty });
        add(this.s.imports, { [t.good]: t.qty });
      } else {
        this.s.coin += t.price;
        add(this.s.exports, { [t.good]: t.qty });
      }
      this.log(`Caravan arrived: ${t.buy ? 'delivered' : 'sold'} ${t.qty} ${t.good}.`, 'good');
    }
    this.s.trades = this.s.trades.filter((t) => t.time < DAY_SECONDS);
    if (this.day !== before) this.daily(before);
  }
  advance(seconds: number) {
    for (let i = 0; i < Math.round(seconds / TICK); i++) this.step();
  }
  private consumeFood(amount: number) {
    let remaining = amount;
    for (const g of ['fish', 'bread', 'roots', 'provisions'] as Good[]) {
      const q = Math.min(this.stock(g), remaining);
      add(this.s.stock, { [g]: q }, -1);
      add(this.s.consumed, { [g]: q });
      remaining -= q;
    }
    return remaining;
  }
  private daily(previous: number) {
    if (this.season !== Math.floor(previous / 6) % 4) {
      this.log(
        `${['Spring', 'Summer', 'Autumn', 'Winter'][this.season]} begins. ${this.season === 3 ? 'Fuel demand rises and the fields rest.' : this.season === 2 ? 'Bring the grain in before winter.' : 'Plan the season ahead.'}`,
      );
      for (const b of this.s.buildings.filter((b) => b.kind === 'field')) {
        if (this.season === 2) {
          b.harvest = Math.round(240 * b.crop);
          this.log(`A field is ready with ${b.harvest} grain.`, 'good');
        }
        if (this.season === 0) {
          b.crop = 0;
          b.harvest = 0;
        }
        if (this.season === 3) {
          b.harvest = 0;
        }
      }
    }
    const need = this.adults - this.soldiers + this.s.children * 0.5;
    const missing = this.consumeFood(need);
    this.s.lastConsumption = need - missing;
    this.s.hunger = missing > 0 ? this.s.hunger + 1 : Math.max(0, this.s.hunger - 1);
    let fuelNeed =
      this.s.buildings.filter((b) => b.kind === 'cottage' && b.progress >= 1).length *
      (this.season === 3 ? 2 : 0.5);
    const fuel = Math.min(fuelNeed, this.stock('firewood'));
    add(this.s.stock, { firewood: fuel }, -1);
    add(this.s.consumed, { firewood: fuel });
    for (const f of this.s.formations) {
      const demand = f.members.length * 1.5;
      if (dist(f, this.depot) < 30 && f.provisions < demand * 3) {
        const q = Math.min(demand * 3 - f.provisions, this.stock('provisions'));
        this.s.stock.provisions = this.stock('provisions') - q;
        f.provisions += q;
      }
      const q = Math.min(f.provisions, demand);
      f.provisions -= q;
      add(this.s.consumed, { provisions: q });
      if (q < demand) f.morale = Math.max(0, f.morale - 20);
      this.s.coin = Math.max(0, this.s.coin - f.members.length * 0.25);
    }
    for (const g of ['fish', 'bread', 'roots'] as Good[]) {
      const rate = g === 'fish' ? 0.025 : g === 'bread' ? 0.008 : 0.003;
      const q = this.stock(g) * rate * (this.season === 3 ? 0.5 : 1);
      add(this.s.stock, { [g]: q }, -1);
      add(this.s.losses, { [g]: q });
    }
    this.s.wellbeing = Math.max(
      0,
      Math.min(
        100,
        this.s.wellbeing +
          (missing > 0 ? -12 : 3) +
          (fuel < fuelNeed ? -6 : 0) +
          (this.population > this.housing ? -3 : 0),
      ),
    );
    const tax =
      this.s.buildings.filter((b) => b.kind === 'cottage' && b.progress >= 1).length *
      (this.s.wellbeing / 100);
    this.s.coin += tax;
    this.s.lastTax = tax;
    if (this.s.hunger >= 5) {
      this.s.lost = true;
      this.log('Five days without enough food have ended the settlement’s charter.', 'bad');
    }
    if (this.day === 16)
      this.log(
        'Smoke rises beyond the bridge. The occupiers intend to move on Alder in two days. Prepare a defense.',
        'bad',
      );
    const post = this.s.buildings.find((b) => b.kind === 'outpost' && b.progress >= 1);
    this.s.outpostSupply = false;
    if (
      post &&
      this.s.claimed &&
      this.enemyDefeated &&
      this.workers(post.id).filter((p) => dist(p, this.entrance(post)) < 4).length >= 2 &&
      this.food >= 10
    ) {
      this.consumeFood(4);
      this.s.outpostSupply = true;
      this.s.holdDays++;
    } else this.s.holdDays = Math.max(0, this.s.holdDays - 1);
    if (this.s.holdDays >= 2 && !this.s.won) {
      this.s.won = true;
      this.log(
        'The eastern crossing holds. Your charter is secured. Continue building, or begin a new settlement.',
        'good',
      );
    }
    this.s.history.push({ day: this.day, food: this.food, coin: this.s.coin, population: this.population });
    if (this.s.history.length > 100) this.s.history.shift();
  }
  private military() {
    const e = this.s.enemy;
    if (!this.enemyDefeated) {
      const threat = this.s.formations.find((f) => dist(f, e) < 24 && f.state !== 'gathering');
      if (threat) {
        e.target = { x: threat.x, z: threat.z };
      } else if (this.day >= 18) e.target = this.entrance(this.depot);
      const route = this.path(e, e.target);
      if (route.length && dist(e, e.target) > 4) {
        const p = route.find((p) => dist(p, e) > 0.4) ?? e.target;
        const d = dist(e, p);
        if (d > 0) {
          e.x += ((p.x - e.x) / d) * TICK * 1.25;
          e.z += ((p.z - e.z) / d) * TICK * 1.25;
        }
      }
      if (dist(e, this.depot) < 9) {
        this.s.wellbeing = Math.max(0, this.s.wellbeing - TICK * 0.4);
        if (this.s.wellbeing <= 0) {
          this.s.lost = true;
          this.log('The occupiers seized the granary. The charter is lost.', 'bad');
        }
      }
    } else if (e.routed) {
      e.x = Math.min(100, e.x + TICK * 2);
    }
    for (const f of [...this.s.formations]) {
      f.members = f.members.filter((id) =>
        this.s.people.some((p) => p.id === id && p.alive && p.formation === f.id),
      );
      if (!f.members.length) {
        add(this.s.losses, { provisions: f.provisions, spears: f.spears, shields: f.shields });
        this.s.formations = this.s.formations.filter((a) => a.id !== f.id);
        continue;
      }
      if (f.state === 'gathering') {
        let arrived = 0;
        for (const id of f.members) {
          const p = this.s.people.find((p) => p.id === id)!;
          if (this.move(p) && dist(p, f) < 4) arrived++;
        }
        if (arrived === f.members.length) {
          f.state = 'ready';
          this.log('The militia is equipped and ready. Select its banner to issue orders.', 'good');
        }
        continue;
      }
      const fighting =
        !this.enemyDefeated && dist(f, e) < 9 && f.state !== 'returning' && f.state !== 'routing';
      if (fighting) {
        f.state = 'fighting';
        f.fatigue = Math.min(1, f.fatigue + TICK * 0.0025);
        const tower = this.s.buildings.some((b) => b.kind === 'tower' && b.progress >= 1 && dist(b, f) < 12);
        const attack = f.members.length * 0.014 * (f.provisions > 0 ? 1 : 0.55) * (1 - f.fatigue * 0.4);
        const counter = e.count * 0.008 * (tower ? 0.55 : 1);
        e.damage += attack * TICK;
        f.damage += counter * TICK;
        e.morale -= attack * TICK * 2;
        f.morale -= counter * TICK * 1.4;
        while (e.damage >= 1 && e.count > 0) {
          e.damage--;
          e.count--;
          e.morale -= 9;
        }
        while (f.damage >= 1 && f.members.length) {
          f.damage--;
          this.casualty(f);
          f.morale -= 8;
        }
        if (e.count <= 2 || e.morale < 22) {
          e.routed = true;
          this.log('The occupiers break and retreat. The crossing can now be claimed.', 'good');
        }
      } else {
        if (f.state === 'fighting') f.state = 'ready';
        if (dist(f, f.target) > 1.5) {
          const route = this.path(f, f.target);
          const p = route.find((p) => dist(p, f) > 0.6);
          if (p) {
            const d = dist(f, p);
            const speed = f.state === 'routing' ? 2.3 : 1.8;
            f.x += ((p.x - f.x) / d) * TICK * speed;
            f.z += ((p.z - f.z) / d) * TICK * speed;
            f.fatigue = Math.min(1, f.fatigue + TICK * 0.0005);
          }
        } else {
          if (f.state === 'returning' || f.state === 'routing') {
            this.disband(f);
            continue;
          }
          f.state = 'ready';
          f.fatigue = Math.max(0, f.fatigue - TICK * 0.005);
          if (f.provisions > 0) f.morale = Math.min(100, f.morale + TICK * 0.15);
        }
      }
      if (f.morale < 22 && f.state !== 'returning') {
        f.state = 'routing';
        f.target = this.entrance(this.depot);
      }
      const narrow = Math.abs(f.x - riverX(f.z)) < 12;
      for (let i = 0; i < f.members.length; i++) {
        const p = this.s.people.find((p) => p.id === f.members[i])!;
        const columns = narrow ? 2 : 4;
        const tx = f.x + ((i % columns) - (columns - 1) / 2) * 1.3,
          tz = f.z + Math.floor(i / columns) * 1.45;
        const target = { x: tx, z: tz };
        const d = dist(p, target);
        if (d > 0) {
          const q = Math.min(1, (TICK * 4) / d);
          p.x += (tx - p.x) * q;
          p.z += (tz - p.z) * q;
        }
        p.task = 'military';
      }
    }
  }
  private casualty(f: Formation) {
    const id = f.members.pop();
    if (!id) return;
    const p = this.s.people.find((p) => p.id === id)!;
    p.formation = null;
    p.job = null;
    p.path = [];
    p.task = 'idle';
    f.spears = Math.max(0, f.spears - 1);
    f.shields = Math.max(0, f.shields - 1);
    add(this.s.losses, { spears: 1, shields: 1 });
    if (this.rand() < 0.3) {
      p.alive = false;
      this.s.wellbeing = Math.max(0, this.s.wellbeing - 4);
      this.log(`${p.name} fell at the crossing.`, 'bad');
    } else {
      p.woundedUntil = this.day + 3;
      this.log(`${p.name} is wounded and cannot work for three days.`, 'bad');
      p.path = this.path(p, this.entrance(this.depot));
      p.task = 'toDepot';
    }
  }
  private disband(f: Formation) {
    add(this.s.stock, { spears: f.spears, shields: f.shields, provisions: f.provisions });
    for (const id of f.members) {
      const p = this.s.people.find((p) => p.id === id)!;
      p.formation = null;
      p.task = 'idle';
      p.path = [];
      p.job = null;
      p.tripRecipe = undefined;
    }
    this.s.formations = this.s.formations.filter((a) => a.id !== f.id);
    this.assign();
    this.log(
      'Survivors return to civilian life. Equipment and unused provisions are back in storage.',
      'good',
    );
  }
  serialize() {
    return JSON.stringify(this.s);
  }
  static load(raw: string) {
    if (raw.length > 5_000_000) throw new Error('Save is too large.');
    const s = JSON.parse(raw) as State;
    if (
      s.version !== 2 ||
      !Array.isArray(s.people) ||
      !Array.isArray(s.buildings) ||
      !Array.isArray(s.formations) ||
      !s.stock ||
      !s.enemy
    )
      throw new Error('This is not a supported Borderland save.');
    const finite = (x: unknown) => typeof x === 'number' && Number.isFinite(x);
    if (
      !finite(s.tick) ||
      s.tick < 0 ||
      !finite(s.coin) ||
      s.coin < 0 ||
      !finite(s.nextId) ||
      s.people.length > 400 ||
      s.buildings.length > 250
    )
      throw new Error('Save values are invalid.');
    for (const g of GOODS)
      if (!finite(s.stock[g]) || s.stock[g]! < 0) throw new Error('Invalid stock in save.');
    const ids = new Set<number>();
    for (const b of s.buildings) {
      if (
        !finite(b.rotation) ||
        Math.abs(b.rotation / (Math.PI / 2) - Math.round(b.rotation / (Math.PI / 2))) > 0.0001 ||
        (b.stockTarget !== undefined && (!finite(b.stockTarget) || b.stockTarget < 0 || b.stockTarget > 9999))
      )
        throw new Error('Invalid building settings in save.');
      if (!BUILDINGS[b.kind] || !finite(b.x) || !finite(b.z) || !finite(b.progress) || ids.has(b.id))
        throw new Error('Invalid building in save.');
      ids.add(b.id);
    }
    for (const p of s.people) {
      if (!finite(p.x) || !finite(p.z) || !Array.isArray(p.path) || ids.has(p.id))
        throw new Error('Invalid citizen in save.');
      ids.add(p.id);
    }
    for (const f of s.formations) {
      if (
        !finite(f.provisions) ||
        f.provisions < 0 ||
        !Array.isArray(f.members) ||
        f.members.some((id) => !s.people.some((p) => p.id === id && p.formation === f.id))
      )
        throw new Error('Invalid formation in save.');
    }
    const game = new Game(s);
    const errors = game.audit();
    if (errors.length) throw new Error(errors[0]);
    return game;
  }
  audit() {
    const problems: string[] = [];
    for (const g of GOODS) {
      let total = this.stock(g);
      for (const p of this.s.people) total += p.cargo[g] ?? 0;
      for (const b of this.s.buildings) total += b.delivered[g] ?? 0;
      for (const f of this.s.formations)
        total +=
          g === 'provisions' ? f.provisions : g === 'spears' ? f.spears : g === 'shields' ? f.shields : 0;
      for (const t of this.s.trades) if (!t.buy && t.good === g) total += t.qty;
      const expected =
        (this.s.initial[g] ?? 0) +
        (this.s.produced[g] ?? 0) +
        (this.s.imports[g] ?? 0) -
        (this.s.consumed[g] ?? 0) -
        (this.s.exports[g] ?? 0) -
        (this.s.losses[g] ?? 0);
      if (!Number.isFinite(total) || total < -0.001 || Math.abs(total - expected) > 0.01)
        problems.push(`${g} conservation mismatch: ${total} / ${expected}`);
    }
    const members = new Set<number>();
    for (const f of this.s.formations)
      for (const id of f.members) {
        if (members.has(id)) problems.push('A worker belongs to two formations.');
        members.add(id);
        const p = this.s.people.find((p) => p.id === id);
        if (!p?.alive || p.job !== null) problems.push('A soldier is also working or is not alive.');
      }
    return problems;
  }
}
