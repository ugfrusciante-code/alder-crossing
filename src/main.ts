import './ui/style.css';
import { Game, type Command } from './sim/game';
import { TICK } from './sim/content';
import { View } from './render/view';
import { UI } from './ui/ui';

const SAVE = 'alder-manual-v2',
  AUTO = 'alder-auto-v2';
let game = new Game(),
  speed = 0,
  previousSpeed = 1,
  accumulator = 0,
  keyPending: string | null = null;
let binds: Record<string, string> = {
  Forward: 'w',
  Backward: 's',
  Left: 'a',
  Right: 'd',
  'Rotate left': 'q',
  'Rotate right': 'e',
};
try {
  binds = { ...binds, ...JSON.parse(localStorage.getItem('alder-keybinds') ?? '{}') };
  document.documentElement.style.setProperty('--ui-scale', localStorage.getItem('alder-ui-scale') ?? '1');
} catch {}
const canvas = document.querySelector<HTMLCanvasElement>('#world')!,
  view = new View(canvas, game);
let audio: AudioContext | null = null,
  ambient: GainNode | null = null,
  audioOn = false;
function sound() {
  if (!audio) {
    audio = new AudioContext();
    const noise = audio.createBuffer(1, audio.sampleRate * 4, audio.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
    const source = audio.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 650;
    ambient = audio.createGain();
    ambient.gain.value = 0;
    source.connect(filter).connect(ambient).connect(audio.destination);
    source.start();
  }
  audioOn = !audioOn;
  void audio.resume();
  ambient!.gain.setTargetAtTime(audioOn ? 0.13 : 0, audio.currentTime, 0.2);
}
function changeSpeed(value: number) {
  if (value > 0) previousSpeed = value;
  speed = value;
  accumulator = 0;
}
function save(auto = false) {
  try {
    const k = auto ? AUTO : SAVE,
      old = localStorage.getItem(k);
    if (old) localStorage.setItem(k + '-previous', old);
    localStorage.setItem(k, game.serialize());
    if (!auto) ui.toast('Settlement saved.');
  } catch {
    ui.toast('The save could not be written. Export a save file from the menu.', true);
  }
}
function adopt(next: Game) {
  game = next;
  view.reset(next);
  ui.game = next;
  ui.started = true;
  ui.cancel();
  changeSpeed(0);
  ui.render();
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE) ?? localStorage.getItem(AUTO);
    if (!raw) {
      ui.toast('No saved settlement yet.', true);
      return;
    }
    adopt(Game.load(raw));
    ui.toast('Settlement restored and paused.');
  } catch (e) {
    ui.toast((e as Error).message, true);
  }
}
function command(c: Command) {
  const result = game.command(c);
  ui.toast(result.message, !result.ok);
  if (result.ok && c.type === 'build') {
    ui.buildKind = null;
    view.setGhost(null);
    ui.select('building', result.id!);
  }
  if (result.ok && c.type === 'cancelBuild') ui.cancel();
  if (result.ok && c.type === 'muster') ui.select('formation', result.id!);
  ui.render();
}
const ui = new UI(document.querySelector('#app')!, game, view, {
  command,
  speed: changeSpeed,
  getSpeed: () => speed,
  save: () => save(),
  load,
  newGame: () => {
    try {
      localStorage.setItem('alder-recovery', game.serialize());
    } catch {}
    location.reload();
  },
  export: () => {
    const blob = new Blob([game.serialize()], { type: 'application/json' }),
      url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = `Alder-Y${game.year}-day${game.day + 1}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  import: async (file) => {
    try {
      adopt(Game.load(await file.text()));
      ui.toast('Imported settlement restored and paused.');
    } catch (e) {
      ui.toast((e as Error).message, true);
    }
  },
  audio: sound,
  isAudio: () => audioOn,
  start: () => changeSpeed(1),
  setKey: (a) => (keyPending = a),
  keys: () => binds,
});
const keys = new Set<string>();
window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    save();
    return;
  }
  if ((e.target as HTMLElement).matches('input,select,textarea')) return;
  const key = e.key.toLowerCase();
  if (keyPending) {
    if (key !== 'escape' && key !== ' ') {
      const duplicate = Object.entries(binds).find(([a, k]) => k === key && a !== keyPending);
      if (duplicate) binds[duplicate[0]] = binds[keyPending];
      binds[keyPending] = key;
      localStorage.setItem('alder-keybinds', JSON.stringify(binds));
    }
    keyPending = null;
    ui.renderModal();
    e.preventDefault();
    return;
  }
  keys.add(key);
  if (key === ' ') {
    e.preventDefault();
    if (!ui.modal) {
      changeSpeed(speed ? 0 : previousSpeed);
      ui.render();
    }
  }
  if (key === 'escape') {
    ui.cancel();
    ui.render();
  }
  if (key === 'f' && !ui.modal) {
    view.focus(game.depot);
    view.zoom = 91;
  }
  if (key.startsWith('arrow')) e.preventDefault();
  if (key === 'r' && !ui.modal && ui.buildKind) {
    view.rotatePlacement();
    ui.render();
  }
  if (key === 'b' && !ui.modal) {
    ui.panel = 'build';
    ui.render();
  }
  if ((e.metaKey || e.ctrlKey) && key === 's') {
    e.preventDefault();
    save();
  }
  if (['1', '2', '3', '4'].includes(key) && !ui.modal) {
    changeSpeed([0, 1, 2, 4][Number(key) - 1]);
    ui.render();
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => {
  keys.clear();
  changeSpeed(0);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    changeSpeed(0);
    save(true);
  }
});
let down: { x: number; y: number; button: number; drag: boolean } | null = null;
canvas.addEventListener('pointerdown', (e) => {
  down = { x: e.clientX, y: e.clientY, button: e.button, drag: false };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  const p = view.hit(e.clientX, e.clientY);
  if (p && ui.buildKind) view.moveGhost(p);
  if (p && ui.roadMode) ui.roadHover(p);
  if (
    down &&
    (down.button === 1 || (down.button === 0 && !ui.buildKind) || (down.button === 2 && !ui.formation))
  ) {
    const dx = e.clientX - down.x,
      dy = e.clientY - down.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) down.drag = true;
    if (!down.drag) return;
    view.pan((-dx * view.zoom) / 900, (-dy * view.zoom) / 700);
    down.x = e.clientX;
    down.y = e.clientY;
  }
});
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  const { button, drag } = down;
  down = null;
  if (drag) return;
  const p = view.hit(e.clientX, e.clientY);
  if (!p) return;
  if (button === 2) {
    if (ui.roadMode === 'lay') {
      ui.roadRestart();
      return;
    }
    if (ui.formation) command({ type: 'move', id: ui.formation, ...p });
    else ui.cancel();
    return;
  }
  if (button !== 0) return;
  if (ui.buildKind) {
    command({ type: 'build', kind: ui.buildKind, ...p, rotation: view.placementRotation });
    return;
  }
  if (ui.roadMode) {
    ui.roadClick(p);
    return;
  }
  const picked = view.pick(e.clientX, e.clientY);
  if (picked) ui.select(picked.type, picked.id);
  else ui.cancel();
});
canvas.addEventListener('pointercancel', () => (down = null));
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    view.zoomAt(e.deltaY * 0.045, e.clientX, e.clientY);
  },
  { passive: false },
);
let last = performance.now(),
  uiClock = 0,
  autosave = 0;
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!ui.modal) {
    const s = dt * view.zoom * 0.23;
    view.pan(
      (keys.has(binds.Right) || keys.has('arrowright') ? s : 0) -
        (keys.has(binds.Left) || keys.has('arrowleft') ? s : 0),
      (keys.has(binds.Backward) || keys.has('arrowdown') ? s : 0) -
        (keys.has(binds.Forward) || keys.has('arrowup') ? s : 0),
    );
    view.yaw +=
      ((keys.has(binds['Rotate right']) ? 1 : 0) - (keys.has(binds['Rotate left']) ? 1 : 0)) * dt * 0.8;
    accumulator += dt * speed;
    let count = 0;
    while (accumulator >= TICK && count++ < 12) {
      game.step();
      accumulator -= TICK;
    }
  }
  view.update(dt, now / 1000);
  uiClock += dt;
  autosave += dt;
  if (uiClock > 0.5) {
    ui.render();
    uiClock = 0;
  }
  if (autosave > 30 && ui.started) {
    save(true);
    autosave = 0;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.addEventListener('beforeunload', () => {
  if (ui.started) save(true);
});
