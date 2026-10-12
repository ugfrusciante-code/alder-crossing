import assert from 'node:assert/strict';
import {Game,type Command} from '../src/sim/game';
import type {Kind} from '../src/sim/content';
const g=new Game();
function doCmd(c:Command){const r=g.command(c);assert.ok(r.ok,`${JSON.stringify(c)}: ${r.message}`);return r.id!}
function waitFor(fn:()=>boolean,limit=600){for(let t=0;t<limit&&!fn();t+=5){g.advance(5);assert.ok(!g.s.lost,g.s.events.at(-1)?.text??'Charter lost')}assert.ok(fn(),`Timed out at day ${g.day}: ${JSON.stringify(g.s.stock)}; idle ${g.idle}`);assert.deepEqual(g.audit(),[])}
function build(kind:Kind,x:number,z:number){const id=doCmd({type:'build',kind,x,z});waitFor(()=>g.building(id)!.progress===1);return id}
// A real charter from starting resources; no injected money, goods, or completion flags.
build('cottage',-54,6);build('cottage',-52,18);doCmd({type:'immigrate'});
const logger=g.s.buildings.find(b=>b.kind==='logging')!;doCmd({type:'workers',id:logger.id,slots:3});
build('forager',-21,-17);build('forager',-8,-32);
const mill=build('mill',2,-8);doCmd({type:'workers',id:mill,slots:0});
const bakery=build('bakery',-7,3);doCmd({type:'recipe',id:bakery,recipe:'provisions'});
const saw=build('sawmill',-19,-8);
waitFor(()=>g.stock('planks')>=22);doCmd({type:'workers',id:saw,slots:0});
waitFor(()=>g.stock('provisions')>=40);doCmd({type:'workers',id:bakery,slots:0});
waitFor(()=>g.stock('logs')>=14);
const smith=build('smith',-29,-34);waitFor(()=>g.stock('logs')>=6);build('yard',-7,34);
doCmd({type:'scout'});waitFor(()=>g.stock('spears')>=8,600);doCmd({type:'recipe',id:smith,recipe:'shields'});
waitFor(()=>g.stock('shields')>=8&&g.stock('provisions')>=36,600);
doCmd({type:'workers',id:smith,slots:0});doCmd({type:'workers',id:bakery,slots:0});
let id:number|undefined;waitFor(()=>{if(id)return true;const result=g.command({type:'muster'});if(result.ok)id=result.id;return result.ok},120);
waitFor(()=>g.s.formations[0].state==='ready',160);doCmd({type:'move',id:id!,x:55,z:12});waitFor(()=>g.enemyDefeated,450);
doCmd({type:'claim'});doCmd({type:'demobilize',id:id!});waitFor(()=>!g.s.formations.length,180);
waitFor(()=>g.stock('logs')>=8&&g.stock('planks')>=4);const post=build('outpost',60,30);
// Redirect the remaining workforce to supplies as the new territory is settled.
doCmd({type:'workers',id:saw,slots:0});doCmd({type:'workers',id:post,slots:2});
if(g.food<60){doCmd({type:'trade',good:'roots',qty:40,buy:true});waitFor(()=>g.s.trades.length===0)}
waitFor(()=>g.s.won,360);assert.deepEqual(g.audit(),[]);
console.log(`Complete charter PASS: won on day ${g.day+1}, ${g.adults} surviving adults, ${g.food.toFixed(0)} food, ${g.s.coin.toFixed(0)} coin.`);
