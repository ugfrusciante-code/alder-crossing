import { Game, type Command } from '../sim/game';
import {
  BUILDINGS,
  GOODS,
  LABELS,
  PRICES,
  RECIPES,
  SEASONS,
  type Good,
  type Kind,
  type Stock,
} from '../sim/content';
import { View } from '../render/view';
import { dist, type Point } from '../sim/terrain';

export const icon = (name: string, size = 20) => {
  const shapes: Record<string, string> = {
    home: '<path d="m3 11 9-8 9 8M6 10v11h12V10M10 21v-7h4v7"/>',
    wood: '<path d="m12 2 6 8h-3l5 7H4l5-7H6zM12 17v5"/>',
    food: '<path d="M12 22V3M12 8C3 9 4 2 4 2c7 0 8 6 8 6Zm0 7c-9 1-8-6-8-6 7 0 8 6 8 6Zm0-4c9 1 8-6 8-6-7 0-8 6-8 6Zm0 7c9 1 8-6 8-6-7 0-8 6-8 6Z"/>',
    coin: '<circle cx="12" cy="12" r="8"/><path d="M14 8h-3a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-3M12 6v12"/>',
    people:
      '<circle cx="9" cy="7" r="3"/><path d="M3 21v-5a6 6 0 0 1 12 0v5M17 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5v2"/>',
    shield: '<path d="m12 2 8 4v7c0 5-8 9-8 9S4 18 4 13V6zM12 7v10M8 12h8"/>',
    flag: '<path d="M5 22V3m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0"/>',
    hammer: '<path d="m4 21 10-11M9 5l5-3 7 7-4 4z"/>',
    map: '<path d="m2 5 7-3 6 3 7-3v17l-7 3-6-3-7 3zM9 2v17m6-14v17"/>',
    book: '<path d="M3 3h7l2 2 2-2h7v17h-7l-2 2-2-2H3zM12 5v17"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    fire: '<path d="M12 2c1 7 8 8 8 14a8 8 0 0 1-16 0c0-4 4-6 4-10 1 2 2 3 2 5 3-3 2-6 2-9Z"/>',
    chevron: '<path d="m8 4 8 8-8 8"/>',
    close: '<path d="m5 5 14 14M5 19 19 5"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    road: '<path d="M8 2 4 22M16 2l4 20M12 3v3m0 4v3m0 4v3"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] ?? shapes.hammer}</svg>`;
};
const n = (v: number) => Math.floor(v).toLocaleString();
const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const cost = (s: Stock) =>
  Object.entries(s)
    .map(([g, q]) => `${Math.round(q!)} ${LABELS[g as Good]}`)
    .join(' · ');
type Panel = 'build' | 'economy' | 'people' | 'army' | 'territory' | 'journal' | null;
export interface Hooks {
  command(c: Command): void;
  speed(n: number): void;
  getSpeed(): number;
  save(): void;
  load(): void;
  newGame(): void;
  export(): void;
  import(file: File): void;
  audio(): void;
  isAudio(): boolean;
  start(): void;
  setKey(action: string): void;
  keys(): Record<string, string>;
}
export class UI {
  private rendered = new WeakMap<Element, string>();
  private put(el: Element, content: string) {
    if (this.rendered.get(el) === content) return;
    const scroll = el.scrollTop;
    el.innerHTML = content;
    el.scrollTop = scroll;
    this.rendered.set(el, content);
  }

  panel: Panel = null;
  modal: string | null = null;
  buildKind: Kind | null = null;
  /** Road tool: 'lay' draws stretches click to click, 'lift' removes them. */
  roadMode: 'lay' | 'lift' | null = null;
  roadStart: Point | null = null;
  /** Building whose demolish button has been pressed once and awaits confirmation. */
  private demolishArmed: number | null = null;
  selected: number | null = null;
  formation: number | null = null;
  category = 'All';
  started = false;
  charterExpanded = false;
  private toastTimer = 0;
  private toastText = '';
  private toastBad = false;
  constructor(
    readonly root: HTMLElement,
    public game: Game,
    readonly view: View,
    readonly hooks: Hooks,
  ) {
    this.put(
      root,
      `<header id="hud"><div class="brand"><span class="crest">${icon('shield', 28)}</span><div><small>THE BORDERLANDS</small><strong>Alder Crossing</strong></div></div><div id="stats"></div><button class="icon-button" data-action="menu" aria-label="Open game menu">${icon('menu')}</button></header><aside id="mission"></aside><div id="place-hint"></div><aside id="inspector"></aside><section id="panel"></section><div id="toast" role="status" aria-live="polite"></div><div id="map-wrap"><div class="map-title">ALDER VALLEY <button data-action="overlay" aria-label="Toggle territory overlay">${icon('map', 15)}</button></div><canvas id="minimap" width="180" height="130" aria-label="Click the map to move the camera"></canvas></div><div id="clock"></div><div id="camera-controls"><button data-action="home" title="Return to village" aria-label="Center the camera on the village">${icon('home', 17)}</button><button data-action="zoom" data-delta="-12" aria-label="Zoom in">+</button><button data-action="zoom" data-delta="12" aria-label="Zoom out">−</button><button data-action="rotate" data-delta="-.26" aria-label="Rotate camera left">↶</button><button data-action="rotate" data-delta=".26" aria-label="Rotate camera right">↷</button><span>Drag · Scroll · Q / E</span></div><nav id="toolbar"></nav><div id="modal"></div><input id="save-import" type="file" accept=".json" hidden>`,
    );
    root.addEventListener('click', (e) => {
      const button = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (button) this.action(button.dataset.action!, button.dataset);
    });
    root.addEventListener('change', (e) => {
      const el = e.target as HTMLSelectElement;
      if (el.id === 'stock-target')
        hooks.command({
          type: 'stockTarget',
          id: this.selected!,
          amount: el.value === '' ? null : Number(el.value),
        });
      if (el.id === 'recipe-select')
        hooks.command({ type: 'recipe', id: this.selected!, recipe: el.value as any });
      if (el.id === 'trade-good') this.renderPanel();
      if (el.id === 'save-import') {
        const f = (el as unknown as HTMLInputElement).files?.[0];
        if (f) hooks.import(f);
        (el as unknown as HTMLInputElement).value = '';
      }
      if (el.id === 'ui-scale') {
        document.documentElement.style.setProperty('--ui-scale', el.value);
        localStorage.setItem('alder-ui-scale', el.value);
      }
    });
    root.querySelector<HTMLCanvasElement>('#minimap')!.addEventListener('click', (e) => {
      const r = (e.target as HTMLElement).getBoundingClientRect();
      view.focus({
        x: ((e.clientX - r.left) / r.width) * 200 - 100,
        z: ((e.clientY - r.top) / r.height) * 200 - 100,
      });
    });
    this.render();
    this.welcome();
  }
  toast(text: string, bad = false) {
    this.toastText = text;
    this.toastBad = bad;
    this.toastTimer = performance.now() + 5000;
    this.renderToast();
  }
  private renderToast() {
    const el = this.root.querySelector('#toast')!;
    el.textContent = this.toastText;
    el.className = `${performance.now() < this.toastTimer ? 'visible' : ''} ${this.toastBad ? 'bad' : ''}`;
  }
  select(type: 'building' | 'formation', id: number) {
    this.selected = type === 'building' ? id : null;
    this.formation = type === 'formation' ? id : null;
    this.view.selected = this.selected;
    this.view.selectedFormation = this.formation;
    this.panel = null;
    this.buildKind = null;
    this.view.setGhost(null);
    this.roadMode = null;
    this.roadStart = null;
    this.view.setRoadPreview(null, null);
    this.demolishArmed = null;
    this.render();
  }
  /** A click on the ground while the road tool is active. */
  roadClick(p: Point) {
    if (this.roadMode === 'lift') {
      this.hooks.command({ type: 'clearRoad', x: p.x, z: p.z });
      return;
    }
    if (!this.roadStart) {
      this.roadStart = { ...p };
      this.render();
      return;
    }
    const before = this.game.s.roads.length;
    this.hooks.command({ type: 'road', a: this.roadStart, b: p });
    // Chain: a laid stretch's end is where the next one starts.
    if (this.game.s.roads.length > before) this.roadStart = { ...p };
    this.view.setRoadPreview(this.roadStart, p);
    this.render();
  }
  /** Right-click while laying: drop the current start and pick a new one. */
  roadRestart() {
    this.roadStart = null;
    this.view.setRoadPreview(null, null);
    this.render();
  }
  roadHover(p: Point) {
    if (this.roadMode === 'lay') this.view.setRoadPreview(this.roadStart, p);
  }
  cancel() {
    if (this.modal) {
      this.modal = null;
      this.renderModal();
      return;
    }
    this.buildKind = null;
    this.view.setGhost(null);
    this.roadMode = null;
    this.roadStart = null;
    this.view.setRoadPreview(null, null);
    this.demolishArmed = null;
    this.panel = null;
    this.selected = null;
    this.formation = null;
    this.view.selected = null;
    this.view.selectedFormation = null;
    this.render();
  }
  private action(action: string, data: DOMStringMap) {
    if (action === 'start') {
      this.started = true;
      this.modal = null;
      this.renderModal();
      this.hooks.start();
      return;
    }
    if (action === 'panel') {
      this.panel = this.panel === data.panel ? null : (data.panel as Panel);
      this.selected = null;
      this.formation = null;
      this.view.selected = this.view.selectedFormation = null;
      this.buildKind = null;
      this.view.setGhost(null);
      this.render();
      return;
    }
    if (action === 'close') {
      this.cancel();
      return;
    }
    if (action === 'menu') {
      this.modal = 'menu';
      this.hooks.speed(0);
      this.renderModal();
      return;
    }
    if (action === 'speed') {
      this.hooks.speed(Number(data.speed));
      this.render();
      return;
    }
    if (action === 'rotate-placement') {
      this.view.rotatePlacement();
      this.render();
      return;
    }
    if (action === 'cancel-placement') {
      this.cancel();
      return;
    }
    if (action === 'road-mode') {
      const mode = data.mode as 'lay' | 'lift';
      const off = this.roadMode === mode;
      this.cancel();
      this.roadMode = off ? null : mode;
      this.render();
      return;
    }
    if (action === 'demolish') {
      const id = Number(data.id);
      if (this.demolishArmed === id) {
        this.demolishArmed = null;
        this.hooks.command({ type: 'demolish', id });
        this.cancel();
      } else {
        this.demolishArmed = id;
        this.render();
      }
      return;
    }
    if (action === 'cancel-build') {
      this.hooks.command({ type: 'cancelBuild', id: Number(data.id) });
      return;
    }
    if (action === 'build') {
      this.buildKind = data.kind as Kind;
      this.panel = null;
      this.view.setGhost(this.buildKind);
      this.render();
      return;
    }
    if (action === 'charter') {
      this.charterExpanded = !this.charterExpanded;
      this.render();
      return;
    }
    if (action === 'home') {
      this.view.focus(this.game.depot);
      this.view.zoom = 91;
      this.render();
      return;
    }
    if (action === 'zoom') {
      this.view.zoom = Math.max(35, Math.min(190, this.view.zoom + Number(data.delta)));
      return;
    }
    if (action === 'rotate') {
      this.view.yaw += Number(data.delta);
      return;
    }
    if (action === 'guide') {
      this.panel = 'build';
      this.category = 'Food';
      this.render();
      return;
    }
    if (action === 'category') {
      this.category = data.category!;
      this.renderPanel();
      return;
    }
    if (action === 'workers') {
      const b = this.game.building(Number(data.id));
      if (b) this.hooks.command({ type: 'workers', id: b.id, slots: b.slots + Number(data.delta) });
    }
    if (action === 'focus') {
      const b = this.game.building(Number(data.id));
      if (b) {
        this.view.focus(b);
        this.select('building', b.id);
      }
    }
    if (action === 'formation') {
      const f = this.game.s.formations.find((f) => f.id === Number(data.id));
      if (f) {
        this.view.focus(f);
        this.select('formation', f.id);
      }
    }
    if (action === 'muster') this.hooks.command({ type: 'muster' });
    if (action === 'advance') this.hooks.command({ type: 'move', id: Number(data.id), x: 55, z: 12 });
    if (action === 'defend') this.hooks.command({ type: 'move', id: Number(data.id), x: 26, z: 12 });
    if (action === 'demobilize') this.hooks.command({ type: 'demobilize', id: Number(data.id) });
    if (action === 'scout') this.hooks.command({ type: 'scout' });
    if (action === 'claim') this.hooks.command({ type: 'claim' });
    if (action === 'scout-ridge') this.hooks.command({ type: 'scoutRidge' });
    if (action === 'claim-ridge') this.hooks.command({ type: 'claimRidge' });
    if (action === 'immigrate') this.hooks.command({ type: 'immigrate' });
    if (action === 'trade') {
      const good = this.root.querySelector<HTMLSelectElement>('#trade-good')!.value as Good;
      const qty = Number(this.root.querySelector<HTMLInputElement>('#trade-qty')!.value);
      this.hooks.command({ type: 'trade', good, qty, buy: data.buy === 'true' });
    }
    if (action === 'overlay') {
      this.view.overlay = !this.view.overlay;
      this.render();
    }
    if (action === 'save') this.hooks.save();
    if (action === 'load') {
      this.hooks.load();
      this.modal = null;
      this.renderModal();
    }
    if (action === 'export') this.hooks.export();
    if (action === 'import') this.root.querySelector<HTMLInputElement>('#save-import')!.click();
    if (action === 'new') {
      this.modal = 'new';
      this.renderModal();
      return;
    }
    if (action === 'confirm-new') this.hooks.newGame();
    if (action === 'audio') {
      this.hooks.audio();
      this.renderModal();
    }
    if (action === 'help') {
      this.modal = 'help';
      this.renderModal();
    }
    if (action === 'settings') {
      this.modal = 'settings';
      this.renderModal();
    }
    if (action === 'key') {
      this.hooks.setKey(data.key!);
      this.toast('Press a letter or arrow key for this control. Escape cancels.');
    }
    this.render();
  }
  render() {
    const g = this.game;
    const stat = (ic: string, label: string, value: string, detail: string, warning = false) =>
      `<div class="stat ${warning ? 'warning' : ''}" title="${escape(detail)}">${icon(ic)}<div><small>${label}</small><strong>${value}</strong></div></div>`;
    this.put(
      this.root.querySelector('#stats')!,
      stat(
        'food',
        'FOOD RESERVE',
        `${g.runway.toFixed(1)} <em>days</em>`,
        'Reachable edible food divided by civilian daily demand. Grain is not counted as food.',
        g.runway < 3,
      ) +
        stat(
          'fire',
          'FIREWOOD',
          n(g.stock('firewood')),
          'Households burn four times as much during winter.',
          g.stock('firewood') < 15,
        ) +
        stat(
          'people',
          'PEOPLE',
          `${g.population} <em>/ ${g.housing}</em>`,
          'People / housing capacity. Militia members remain part of the population.',
          g.population > g.housing,
        ) +
        stat(
          'hammer',
          'AVAILABLE',
          `${g.idle} <em>workers</em>`,
          'Idle healthy adults can build. Reduce workshop staffing to free more builders.',
        ) +
        stat(
          'coin',
          'TREASURY',
          `${n(g.s.coin)} <em>coin</em>`,
          'Trade purchases are paid when the caravan is dispatched.',
        ) +
        stat(
          'shield',
          'MILITIA',
          `${g.soldiers} <em>deployed</em>`,
          'Deployed workers leave civilian jobs and consume provisions.',
        ),
    );
    const chapter1 = [
      {
        name: 'Establish the bread chain',
        done: ['mill', 'bakery'].every((kind) =>
          g.s.buildings.some((b) => b.kind === kind && b.progress >= 1),
        ),
        detail: 'Build a mill and bakehouse.',
      },
      {
        name: 'Equip the village militia',
        done: g.s.formations.length > 0 || g.enemyDefeated,
        detail: '8 spears · 8 shields · 36 provisions',
      },
      {
        name: 'Secure the eastern crossing',
        done: g.enemyDefeated,
        detail: g.s.scouted ? 'Drive off the occupying militia.' : 'Send a scout along the eastern road.',
      },
      {
        name: 'Hold your new territory',
        done: g.s.won,
        detail: `Staff and supply an outpost · ${g.s.holdDays}/2 days`,
      },
    ];
    const chapter2 = [
      {
        name: 'Survey Iron Ridge',
        done: g.s.ridgeScouted,
        detail: 'Open the Territory panel and send a surveyor.',
      },
      { name: 'Claim the ridge', done: g.s.ridgeClaimed, detail: 'The ridge charter costs 60 coin.' },
      {
        name: 'Smelt your own iron',
        done: (g.s.produced.iron ?? 0) >= 10,
        detail: `Mine ore on the ridge, smelt it at a bloomery · ${n(g.s.produced.iron ?? 0)}/10`,
      },
      {
        name: 'Break the winter raiders',
        done: g.s.raidSpawned && g.enemyDefeated,
        detail: g.s.raidSpawned
          ? 'Twelve raiders. Fight beside a watchtower, or raise two levies.'
          : 'They come with the first winter at least a season after the claim.',
      },
    ];
    const objectives = g.s.chapter === 2 ? chapter2 : chapter1;
    this.put(
      this.root.querySelector('#mission')!,
      `<div class="eyebrow">YOUR CHARTER <span>0${objectives.filter((o) => o.done).length} / 04</span></div><button class="charter-toggle" data-action="charter"><h2>${g.s.chapter === 2 ? 'The Iron Road' : 'A road to the east'}</h2><span>${this.charterExpanded ? '−' : '+'}</span></button>${(this.charterExpanded ? objectives : objectives.filter((o) => !o.done).slice(0, 1)).map((o, i) => `<div class="objective ${o.done ? 'done' : ''}"><span>${o.done ? '✓' : `0${i + 1}`}</span><div><strong>${o.name}</strong><small>${o.detail}</small></div></div>`).join('')}${!objectives[0].done ? '<button class="charter-action" data-action="guide">Find food buildings →</button>' : ''}${g.day >= 16 && !g.enemyDefeated ? '<div class="danger-note">Hostile movement on the eastern road. Defend your granary.</div>' : ''}${g.runway < 3 ? '<div class="danger-note">Food is running low. Import supplies or free workers for gathering.</div>' : ''}`,
    );
    this.put(
      this.root.querySelector('#clock')!,
      `<div class="season">${icon('sun', 17)} ${SEASONS[g.season]} <span>DAY ${(g.day % 6) + 1} · YEAR ${g.year}</span></div><div class="speeds">${[0, 1, 2, 4].map((s) => `<button data-action="speed" data-speed="${s}" class="${this.hooks.getSpeed() === s ? 'active' : ''}" aria-label="${s ? `${s} times speed` : 'Pause'}">${s ? s + '×' : 'Ⅱ'}</button>`).join('')}<span>${this.hooks.getSpeed() === 0 ? 'PAUSED' : 'SPACE TO PAUSE'}</span></div>`,
    );
    this.put(
      this.root.querySelector('#toolbar')!,
      [
        ['build', 'home', 'Build'],
        ['economy', 'food', 'Economy'],
        ['people', 'people', 'People'],
        ['army', 'shield', 'Army'],
        ['territory', 'map', 'Territory'],
        ['journal', 'book', 'Chronicle'],
      ]
        .map(
          ([key, ic, label]) =>
            `<button data-action="panel" data-panel="${key}" class="${this.panel === key ? 'active' : ''}">${icon(ic, 22)}<span>${label}</span></button>`,
        )
        .join('') +
        `<button data-action="road-mode" data-mode="lay" class="${this.roadMode === 'lay' ? 'active' : ''}" title="Lay roads: workers walk them half again as fast">${icon('road', 22)}<span>Roads</span></button>`,
    );
    this.put(
      this.root.querySelector('#place-hint')!,
      this.buildKind
        ? `<span>PLACING ${BUILDINGS[this.buildKind].name.toUpperCase()}</span><strong>${cost(BUILDINGS[this.buildKind].cost)}</strong><small class="${this.view.placementIssue ? 'warning' : ''}">${escape(this.view.placementIssue || 'Site ready · click to build')}</small><div class="placement-actions"><button data-action="rotate-placement">Rotate · R</button><button data-action="cancel-placement">Cancel · Esc</button></div>`
        : this.roadMode === 'lift'
          ? '<span>LIFTING ROADS</span><small>Click a road to lift it and recover half its stone</small><div class="placement-actions"><button data-action="cancel-placement">Done · Esc</button></div>'
          : this.roadMode === 'lay'
            ? `<span>LAYING ROAD</span><strong>${this.view.roadCost ? `${this.view.roadCost} stone` : '1 stone / 5 m'}</strong><small class="${this.view.roadIssue ? 'warning' : ''}">${escape(this.roadStart ? this.view.roadIssue || 'Click to lay this stretch · it continues from its end' : 'Click where the road starts')}</small><small>${this.roadStart ? 'Right-click to start somewhere else' : ''}</small><div class="placement-actions"><button data-action="road-mode" data-mode="lift">Lift roads</button><button data-action="cancel-placement">Done · Esc</button></div>`
            : this.formation
              ? '<span>MILITIA SELECTED</span><small>Right-click ground to march · Esc to deselect</small>'
              : '',
    );
    this.root.classList.toggle('inspecting', !!(this.selected || this.formation));
    this.root.classList.toggle('has-panel', !!this.panel);
    this.root.classList.toggle('building', !!this.buildKind || !!this.roadMode);
    this.root.classList.toggle('catalogue', this.panel === 'build');
    this.renderInspector();
    this.renderPanel();
    this.renderMap();
    this.renderToast();
    if (g.s.lost && this.modal !== 'lost') {
      this.modal = 'lost';
      this.hooks.speed(0);
      this.renderModal();
    }
    if (g.s.won2 && !g.s.objectives.includes('victory2-shown')) {
      // The later victory supersedes the earlier one if both are pending.
      g.s.objectives.push('victory2-shown', 'victory-shown');
      this.modal = 'won2';
      this.hooks.speed(0);
      this.renderModal();
    }
    if (g.s.won && !g.s.objectives.includes('victory-shown')) {
      g.s.objectives.push('victory-shown');
      this.modal = 'won';
      this.hooks.speed(0);
      this.renderModal();
    }
  }
  private renderInspector() {
    const el = this.root.querySelector('#inspector')!,
      g = this.game;
    el.classList.toggle('shown', !!(this.selected || this.formation));
    if (this.selected) {
      const b = g.building(this.selected);
      if (!b) return;
      const def = BUILDINGS[b.kind],
        crew = g.workers(b.id);
      const content = `<button class="close" data-action="close" aria-label="Close inspector">${icon('close')}</button><div class="eyebrow">${def.category}</div><h2>${def.name}</h2><p>${def.description}</p><div class="statusline"><span class="status-dot"></span>${b.progress < 1 ? `Construction ${Math.floor(b.progress * 100)}%` : escape(b.status)}</div>${b.progress < 1 ? `<div class="progress"><i style="width:${b.progress * 100}%"></i></div><p class="hint">${g.idle} available builders · ${cost(b.delivered)} reserved.</p><button class="quiet wide" data-action="cancel-build" data-id="${b.id}">Cancel construction & refund</button>` : ''}${def.jobs ? `<div class="section-label">WORKFORCE</div><div class="worker-control"><button data-action="workers" data-id="${b.id}" data-delta="-1" aria-label="Remove worker">−</button><strong>${crew.length}<span> / ${b.slots} assigned slots</span></strong><button data-action="workers" data-id="${b.id}" data-delta="1" aria-label="Add worker">+</button></div><small class="muted">Capacity ${def.jobs}. Empty slots need healthy civilian workers.</small>` : ''}${b.recipe ? `<div class="section-label">PRODUCTION</div>${def.recipes ? `<select id="recipe-select" aria-label="Production recipe">${def.recipes.map((r) => `<option value="${r}" ${r === b.recipe ? 'selected' : ''}>${LABELS[r as Good]}</option>`).join('')}</select>` : ''}<div class="recipe"><span>${cost(RECIPES[b.recipe].input) || 'Local resources'}</span><b>↓</b><strong>${cost(RECIPES[b.recipe].output)}</strong></div>` : ''}${b.recipe && b.kind !== 'field' ? `<div class="target-control"><label for="stock-target">Granary stock target</label><input id="stock-target" type="number" min="0" max="9999" placeholder="Unlimited" value="${b.stockTarget ?? ''}" aria-label="Granary stock target"></div><p class="hint">Stops new batches when stored and incoming ${LABELS[Object.keys(RECIPES[b.recipe].output)[0] as Good].toLowerCase()} reach the target. Restarts when stock falls. Clear for continuous work.</p>` : ''}${b.kind === 'field' ? `<div class="section-label">SEASONAL WORK</div><p>Sown & tended: ${Math.floor(b.crop * 100)}%<br>Unharvested grain: ${n(b.harvest)}</p>` : ''}${b.kind === 'yard' ? '<button class="primary wide" data-action="muster">Muster eight workers</button><p class="hint">Requires 8 spears, 8 shields and 36 provisions. Leaves civilian jobs vacant.</p>' : ''}${b.kind === 'outpost' ? `<p class="hint">Supplied for ${g.s.holdDays}/2 days. Requires two workers, food reserves and a clear crossing.</p>` : ''}${b.progress >= 1 && b.kind !== 'depot' ? `<button class="quiet wide ${this.demolishArmed === b.id ? 'danger' : ''}" data-action="demolish" data-id="${b.id}">${this.demolishArmed === b.id ? `Confirm · salvage ${cost(Object.fromEntries(Object.entries(def.cost).map(([k, v]) => [k, Math.floor((v ?? 0) / 2)])) as Stock) || 'nothing'}` : 'Demolish…'}</button>` : ''}<button class="quiet wide" data-action="focus" data-id="${b.id}">Center on building</button>`;
      if (!['recipe-select', 'stock-target'].includes(document.activeElement?.id ?? ''))
        this.put(el, content);
    } else if (this.formation) {
      const f = g.s.formations.find((f) => f.id === this.formation);
      if (!f) {
        this.formation = null;
        this.put(el, '');
        return;
      }
      this.put(
        el,
        `<button class="close" data-action="close" aria-label="Close inspector">${icon('close')}</button><div class="eyebrow">ALDER MILITIA</div><h2>The village levy</h2><div class="formation-count">${f.members.length}<span>workers under arms</span></div><div class="metric"><span>Morale</span><strong>${n(f.morale)}%</strong></div><div class="progress"><i style="width:${f.morale}%"></i></div><div class="metric"><span>Provisions</span><strong>${(f.provisions / (f.members.length * 1.5)).toFixed(1)} days</strong></div><div class="metric"><span>Fatigue</span><strong>${n(f.fatigue * 100)}%</strong></div><div class="metric"><span>Orders</span><strong>${f.state}</strong></div><button class="primary wide" data-action="advance" data-id="${f.id}">Advance to the crossing</button><button class="quiet wide" data-action="defend" data-id="${f.id}">Defend the western bank</button><button class="quiet wide" data-action="demobilize" data-id="${f.id}">Return to civilian life</button><p class="hint">Right-click reachable ground for a precise march order. Retreat to the granary to return gear and unused supplies.</p>`,
      );
    } else this.put(el, '');
  }
  private renderPanel() {
    const el = this.root.querySelector('#panel')!,
      g = this.game;
    el.className = this.panel ? `shown ${this.panel === 'build' ? 'build-panel' : ''}` : '';
    if (!this.panel) {
      this.put(el, '');
      return;
    }
    const scroll = el.scrollTop;
    const tradeGood = el.querySelector<HTMLSelectElement>('#trade-good')?.value ?? 'provisions',
      tradeQty = el.querySelector<HTMLInputElement>('#trade-qty')?.value ?? '10';
    if (document.activeElement?.tagName === 'SELECT' || document.activeElement?.id === 'trade-qty') return;
    const head = (title: string, subtitle: string) =>
      `<button class="close" data-action="close" aria-label="Close panel">${icon('close')}</button><div class="eyebrow">VILLAGE LEDGER</div><h2>${title}</h2><p class="subtitle">${subtitle}</p>`;
    if (this.panel === 'build') {
      this.put(
        el,
        `<div class="build-head"><h2>Build your settlement</h2><div class="categories">${['All', 'Homes', 'Gathering', 'Food', 'Industry', 'Military'].map((c) => `<button data-action="category" data-category="${c}" class="${this.category === c ? 'active' : ''}">${c}</button>`).join('')}</div><button data-action="close" aria-label="Close build menu">${icon('close')}</button></div><div class="build-cards">${Object.entries(
          BUILDINGS,
        )
          .filter(
            ([kind, d]) => kind !== 'depot' && (this.category === 'All' || d.category === this.category),
          )
          .map(
            ([kind, d]) =>
              `<button class="build-card ${this.buildKind === kind ? 'selected' : ''}" data-action="build" data-kind="${kind}" title="${escape(d.description)}"><div class="building-icon">${icon(d.category === 'Military' ? 'shield' : d.category === 'Food' ? 'food' : d.category === 'Gathering' ? 'wood' : d.category === 'Industry' ? 'hammer' : 'home', 40)}</div><strong>${d.name}</strong><small>${cost(d.cost)}</small><span>${d.jobs ? `${d.jobs} worker capacity` : 'Village infrastructure'}</span></button>`,
          )
          .join('')}</div>`,
      );
      return;
    }
    if (this.panel === 'economy') {
      this.put(
        el,
        head('The economy', 'Every stockpile has a purpose. Keep a reserve before you trade.') +
          `<div class="economy-summary"><strong>${n(g.food)}<small>EDIBLE PORTIONS</small></strong><strong>${g.runway.toFixed(1)}<small>DAYS IN RESERVE</small></strong><strong>${g.demand.toFixed(0)}<small>FOOD / DAY, ALL PEOPLE</small></strong></div><table><thead><tr><th>Resource</th><th>Granary</th><th>Carried</th><th>Reserved</th></tr></thead><tbody>${GOODS.map((r) => `<tr><td>${LABELS[r]}</td><td>${n(g.stock(r))}</td><td>${n(g.carried(r))}</td><td>${n(g.reserved(r))}</td></tr>`).join('')}</tbody></table><p class="hint">Carried includes workshop inputs and goods on their way home. Reserved stock belongs to unfinished construction.</p><section class="winter-reserve"><div class="eyebrow">${g.season === 3 ? 'WINTER IS HERE' : `WINTER IN ${g.winterReserve.startsIn} DAYS`}</div><h3>Keep the hearths burning</h3><div class="metric"><span>Household heat · ${g.winterReserve.days} days</span><strong class="${g.winterReserve.fuelGap ? 'warning' : ''}">${n(g.stock('firewood'))} / ${n(g.winterReserve.fuel)} firewood</strong></div><div class="metric"><span>Civilian food · ${g.winterReserve.days} days</span><strong class="${g.winterReserve.foodGap ? 'warning' : ''}">${n(g.food)} / ${n(g.winterReserve.food)} portions</strong></div>${g.soldiers ? `<div class="metric"><span>Deployed militia needs</span><strong>${n(g.winterReserve.military)} provisions</strong></div>` : ''}<p class="hint">Reserve target for current homes and population. Future production, spoilage, workshop fuel and outpost meals are additional; this is a planning baseline, not a survival guarantee. Root gathering and field work stop in winter.</p></section><h3>Caravan trade</h3><p class="hint">One day to arrive. Two contracts at a time. Traders carry limited stock: buying drains it and raises the price, selling floods it and lowers what you get. Stock drifts back each day.</p><div class="trade-controls"><select id="trade-good" aria-label="Trade resource">${GOODS.map((r) => `<option value="${r}" ${tradeGood === r ? 'selected' : ''}>${LABELS[r]} · buy ${g.price(r, true).toFixed(1)} · sell ${g.price(r, false).toFixed(1)} · ${n(g.s.market[r] ?? 0)} on offer</option>`).join('')}</select><input type="number" min="1" max="40" value="${tradeQty}" id="trade-qty" aria-label="Trade quantity"><button class="primary" data-action="trade" data-buy="true">Import</button><button class="quiet" data-action="trade" data-buy="false">Export</button></div>${g.s.trades.map((t) => `<div class="metric"><span>${t.buy ? 'Importing' : 'Exporting'} ${t.qty} ${LABELS[t.good]}</span><strong>${Math.ceil(90 - t.time)}s</strong></div>`).join('')}`,
      );
    }
    if (this.panel === 'people') {
      this.put(
        el,
        head('People of Alder', 'An army begins with the people who keep this settlement alive.') +
          `<div class="economy-summary"><strong>${g.adults}<small>ADULTS</small></strong><strong>${g.s.children}<small>CHILDREN</small></strong><strong>${n(g.s.wellbeing)}%<small>WELLBEING</small></strong></div><button class="primary" data-action="immigrate" ${g.s.immigrated ? 'disabled' : ''}>${g.s.immigrated ? 'Newcomers settled' : 'Welcome eight newcomers'}</button><p class="hint">Requires eight spare beds and at least 80 food portions.</p><table><thead><tr><th>Name</th><th>Occupation</th><th>Activity</th></tr></thead><tbody>${g.s.people
            .filter((p) => p.alive)
            .map(
              (p) =>
                `<tr><td>${p.name}</td><td>${p.formation ? 'Militia' : p.woundedUntil > g.day ? 'Recovering' : p.job ? BUILDINGS[g.building(p.job)!.kind].name : 'Available'}</td><td>${p.task === 'toDepot' ? 'Carrying / returning' : p.task === 'toWork' ? 'Walking to work' : p.task}</td></tr>`,
            )
            .join('')}</tbody></table>`,
      );
    }
    if (this.panel === 'army') {
      this.put(
        el,
        head('The village levy', 'Military strength carries a civilian cost.') +
          `<div class="economy-summary"><strong>${g.stock('spears').toFixed(0)}<small>SPEARS</small></strong><strong>${g.stock('shields').toFixed(0)}<small>SHIELDS</small></strong><strong>${g.stock('provisions').toFixed(0)}<small>PROVISIONS</small></strong></div><p>Each formation draws <b>eight workers</b> from your village, taking 8 spears, 8 shields and 36 provisions. Deployed troops consume 12 provisions and 2 coin per day.</p><button class="primary" data-action="muster">Muster eight workers</button><p class="hint">Build a mustering yard first. Equip workers through the smithy or import gear with caravans.</p>${g.s.formations.map((f) => `<button class="formation-card" data-action="formation" data-id="${f.id}">${icon('flag', 30)}<div><strong>Alder militia · ${f.members.length} members</strong><small>${f.state} · ${n(f.morale)}% morale · ${(f.provisions / (f.members.length * 1.5)).toFixed(1)} supply days</small></div>${icon('chevron')}</button>`).join('')}<h3>Hold the crossing</h3><p class="hint">Fight near a watchtower for a defensive advantage. Morale breaks armies before every soldier falls. Wounded survivors need three days to recover. Return to the granary to demobilize and replenish your workforce.</p>`,
      );
    }
    if (this.panel === 'territory') {
      this.put(
        el,
        head('Beyond the river', 'Secure a road home before you claim new land.') +
          `<div class="territory-card"><small>01 · YOUR CHARTER</small><h3>Alder Valley</h3><p>Woodland, farmland and a riverside market. The granary is the heart of your settlement.</p></div><div class="territory-card contested"><small>02 · ${g.s.claimed ? 'YOUR NEW HOLDING' : g.enemyDefeated ? 'AVAILABLE TO CLAIM' : 'CONTESTED'}</small><h3>The Crossing</h3><p>${g.s.scouted ? (g.enemyDefeated ? 'The occupiers have withdrawn. A charter and a supplied outpost will secure the road.' : `${g.s.enemy.count} occupiers guard the eastern bank. Their morale is ${n(g.s.enemy.morale)}%.`) : 'Your scout can reveal who holds the eastern bank.'}</p>${!g.s.scouted ? `<button class="primary" data-action="scout" ${g.s.scouting ? 'disabled' : ''}>${g.s.scouting ? 'Scout on the road…' : 'Scout the crossing · 10 coin'}</button>` : !g.s.claimed ? '<button class="primary" data-action="claim">Claim the crossing · 40 coin</button>' : `<p><b>${g.s.holdDays}/2 days supplied</b><br>Build an outpost east of the river and assign two workers.</p>`}</div><div class="territory-card ${g.s.ridgeClaimed ? '' : 'contested'}"><small>03 · ${g.s.ridgeClaimed ? 'YOUR MINING HOLDING' : g.s.won ? 'CHAPTER II' : 'BEYOND THIS CHARTER'}</small><h3>Iron Ridge</h3><p>${!g.s.won ? 'Secure the crossing first. The ridge beyond holds iron, and iron draws trouble.' : !g.s.ridgeScouted ? 'Survey the ridge for ore. Your own iron would end the caravan dependence for spears and tools.' : !g.s.ridgeClaimed ? 'Rich ore seams. Claiming the ridge opens it for mining; raiders will come the following winter.' : `Mine ore here, smelt it at a bloomery. ${n(g.s.produced.iron ?? 0)}/10 iron smelted. ${g.s.raidSpawned ? (g.enemyDefeated ? 'The raiders are broken.' : 'Raiders are at hand.') : 'Raiders will come with the first winter after the claim.'}`}</p>${g.s.won && !g.s.ridgeScouted ? `<button class="primary" data-action="scout-ridge" ${g.s.ridgeScouting ? 'disabled' : ''}>${g.s.ridgeScouting ? 'Surveyor on the road…' : 'Survey Iron Ridge · 15 coin'}</button>` : g.s.ridgeScouted && !g.s.ridgeClaimed ? '<button class="primary" data-action="claim-ridge">Claim Iron Ridge · 60 coin</button>' : ''}</div><button class="quiet wide" data-action="overlay">${this.view.overlay ? 'Hide' : 'Show'} borders in the world</button>`,
      );
    }
    if (this.panel === 'journal') {
      this.put(
        el,
        head('The village chronicle', 'A record of your charter, its choices and their consequences.') +
          g.s.events
            .slice()
            .reverse()
            .map(
              (e) =>
                `<div class="event ${e.kind}"><small>YEAR ${Math.floor(e.day / 24) + 1} · DAY ${(e.day % 24) + 1}</small><p>${escape(e.text)}</p></div>`,
            )
            .join(''),
      );
    }
    el.scrollTop = scroll;
  }
  welcome() {
    this.modal = 'welcome';
    this.renderModal();
  }
  renderModal() {
    const el = this.root.querySelector('#modal')!;
    el.className = this.modal ? 'shown' : '';
    if (!this.modal) {
      this.put(el, '');
      return;
    }
    const close = `<button class="close" data-action="close" aria-label="Close dialog">${icon('close')}</button>`;
    let content = '';
    if (this.modal === 'welcome') {
      content = `<div class="welcome-art"></div><div class="welcome-body"><div class="eyebrow">COZY VILLAGE · BORDERLAND</div><h1>The Alder<br>Crossing</h1><p>Build a village worth defending.</p><p class="muted">A river separates your new settlement from the eastern road. Raise a harvest, prepare for winter, and decide how many working hands you can spare for the militia.</p><div class="welcome-facts"><span>16 workers</span><span>One contested crossing</span><span>Your first charter</span></div><button class="primary large" data-action="start">Begin your charter ${icon('chevron', 18)}</button><button class="quiet" data-action="load">Continue saved settlement</button><small class="hint">WASD pan · Q/E rotate · Scroll zoom · Space pause<br>Playable development slice · 0.4.0</small></div>`;
    }
    if (this.modal === 'menu') {
      content =
        close +
        `<div class="eyebrow">COZY VILLAGE</div><h2>Your settlement</h2><p class="muted">The village is paused.</p><div class="menu-buttons"><button data-action="close" class="primary">Return to the village</button><button data-action="save">Save settlement</button><button data-action="load">Load last manual save</button><button data-action="export">Export save file</button><button data-action="import">Import save file</button><button data-action="settings">Settings & controls</button><button data-action="help">How to play</button><button data-action="new">Start a new charter</button></div><p class="hint">Autosaves every 30 seconds. A separate manual save is kept.</p>`;
    }
    if (this.modal === 'new') {
      content =
        close +
        '<div class="eyebrow">NEW CHARTER</div><h2>Begin again?</h2><p>Your current village is kept in a recovery save. A manual save remains available until you overwrite it.</p><button data-action="confirm-new" class="primary wide">Start a new settlement</button>';
    }
    if (this.modal === 'settings') {
      content =
        close +
        `<div class="eyebrow">PREFERENCES</div><h2>Make yourself at home</h2><div class="metric"><label for="ui-scale">Interface size</label><select id="ui-scale"><option value="1">Standard</option><option value="1.12">Large</option></select></div><button class="quiet wide" data-action="audio">Ambient sound: ${this.hooks.isAudio() ? 'on' : 'off'}</button><h3>Camera controls</h3>${Object.entries(
          this.hooks.keys(),
        )
          .map(
            ([a, k]) =>
              `<div class="metric"><span>${a}</span><button class="key" data-action="key" data-key="${a}">${escape(k.toUpperCase())}</button></div>`,
          )
          .join(
            '',
          )}<p class="hint">Click a key to rebind it. Space pauses; Escape cancels. Scroll zooms toward the pointer. Drag ground to pan. R rotates a building during placement; Escape cancels.</p>`;
    }
    if (this.modal === 'help') {
      content =
        close +
        `<div class="eyebrow">THE FIRST CHARTER</div><h2>A village to build.<br>A border to defend.</h2><ol><li>Your opening village gathers food and timber. Keep food above three days and save fuel for winter.</li><li>Build a sawpit, mill and bakehouse. Set workshop stock targets to protect your timber reserve. Fields sow in spring and yield grain in autumn. The bakehouse makes bread or preserved root provisions.</li><li>Use the economy panel to import iron, gear or emergency food. Caravans take one game day.</li><li>Build cottages before welcoming eight new workers. Reduce worker slots in existing buildings if construction needs hands.</li><li>Build a smithy and mustering yard. Make or buy 8 spears, 8 shields and 36 provisions, then muster eight adults.</li><li>Scout the eastern crossing. Select your militia and right-click ground to march, or use its advance/defend commands.</li><li>Drive off the occupiers, pay for the charter, and build an eastern outpost. Staff it with two workers and keep food available for two days.</li></ol><p class="hint">A year is 36 minutes at 1×. Pause whenever you need. You lose if the granary falls or the village spends five days without enough food. Defeat at the crossing can be recoverable.</p>`;
    }
    if (this.modal === 'won') {
      content =
        close +
        `<div class="eyebrow">CHARTER SECURED</div><h1>The crossing<br>holds.</h1><p>Your settlement has become a lordship. The eastern outpost is staffed and supplied; the road belongs to Alder.</p><p><b>Chapter II begins:</b> beyond the crossing lies Iron Ridge. Survey it from the Territory panel.</p><button class="primary wide" data-action="close">Continue to the Iron Road</button><button class="quiet wide" data-action="save">Save this settlement</button>`;
    }
    if (this.modal === 'won2') {
      content =
        close +
        `<div class="eyebrow">CHAPTER II COMPLETE</div><h1>The Iron Road<br>is yours.</h1><p>Alder mines and smelts its own iron, and the winter raiders are broken. The lordship stands on its own feet.</p><button class="primary wide" data-action="close">Keep building</button><button class="quiet wide" data-action="save">Save this settlement</button>`;
    }
    if (this.modal === 'lost') {
      content = `<div class="eyebrow">CHARTER LOST</div><h1>A season<br>to remember.</h1><p>${escape(this.game.s.events.at(-1)?.text ?? 'The settlement could not sustain its charter.')}</p><button class="primary wide" data-action="load">Return to a manual save</button><button class="quiet wide" data-action="new">Begin a new charter</button>`;
    }
    this.put(
      el,
      `<div class="modal-card ${this.modal === 'welcome' ? 'welcome' : ''}" role="dialog" aria-modal="true" aria-label="${this.modal}">${content}</div>`,
    );
  }
  private renderMap() {
    const c = this.root.querySelector<HTMLCanvasElement>('#minimap')!,
      ctx = c.getContext('2d')!,
      g = this.game;
    ctx.fillStyle = '#737957';
    ctx.fillRect(0, 0, 180, 130);
    ctx.strokeStyle = '#90a9a3';
    ctx.lineWidth = 9;
    ctx.beginPath();
    for (let y = 0; y < 130; y++) {
      const z = (y / 130) * 200 - 100,
        x = ((35 + Math.sin(z * 0.035) * 5 + 100) / 200) * 180;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = '#b6a582';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 72.8);
    ctx.lineTo(180, 72.8);
    ctx.stroke();
    for (const b of g.s.buildings) {
      ctx.fillStyle = b.progress < 1 ? '#c3af70' : '#e0d4ac';
      ctx.fillRect(((b.x + 100) / 200) * 180 - 2, ((b.z + 100) / 200) * 130 - 2, 4, 4);
    }
    for (const f of g.s.formations) {
      ctx.fillStyle = '#ebd487';
      ctx.beginPath();
      ctx.arc(((f.x + 100) / 200) * 180, ((f.z + 100) / 200) * 130, 3, 0, 7);
      ctx.fill();
    }
    if (g.s.scouted && !g.enemyDefeated) {
      ctx.fillStyle = '#a94538';
      ctx.fillRect(((g.s.enemy.x + 100) / 200) * 180 - 2, ((g.s.enemy.z + 100) / 200) * 130 - 2, 5, 5);
    }
    ctx.strokeStyle = '#fff5d7';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      ((this.view.target.x + 100) / 200) * 180 - 18,
      ((this.view.target.z + 100) / 200) * 130 - 13,
      36,
      26,
    );
  }
}
