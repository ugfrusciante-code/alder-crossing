import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {random} from '../sim/terrain';
import type {Kind} from '../sim/content';

export const palette={timber:0x594438,plaster:0xded5bd,thatch:0xaa8d59,stone:0x888779,rust:0x92513f,wood:0x8c7151,iron:0x555b59,red:0x793e3d,cloth:0xd4c7a0,dark:0x322f27};
function texture(type:'wood'|'plaster'|'roof'|'stone',seed=7){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d')!,r=random(seed);
 c.fillStyle={wood:'#9b8466',plaster:'#e3ddcd',roof:'#b39762',stone:'#99978a'}[type];c.fillRect(0,0,256,256);
 for(let i=0;i<3200;i++){const v=Math.floor(100+r()*110);c.fillStyle=`rgba(${v},${v-8},${v-22},${.04+r()*.1})`;const x=r()*256,y=r()*256;c.fillRect(x,y,type==='wood'?1+r()*2:1+r()*7,type==='roof'?8+r()*20:type==='wood'?10+r()*65:1+r()*8)}
 if(type==='roof'){for(let y=0;y<256;y+=32){c.fillStyle='rgba(54,38,20,.17)';c.fillRect(0,y,256,2);for(let x=0;x<256;x+=24){c.fillStyle='rgba(247,228,171,.1)';c.fillRect(x+(y%64?12:0),y+4,18,24)}}}
 if(type==='wood'){for(let x=0;x<256;x+=42){c.fillStyle='rgba(42,29,16,.25)';c.fillRect(x,0,2,256)}}
 if(type==='stone'){for(let y=0;y<256;y+=48){c.fillStyle='rgba(44,42,36,.3)';c.fillRect(0,y,256,3);for(let x=(y%96?0:35);x<256;x+=70)c.fillRect(x,y,3,48)}}
 const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;return t;
}
export function materials(){
 const atlas=new T.TextureLoader().load('./textures/material-atlas.png');atlas.colorSpace=T.SRGBColorSpace;atlas.anisotropy=16;
 const tile=(x:number,y:number)=>{const t=atlas.clone();t.offset.set(x*.5+.001,y*.5+.001);t.repeat.set(.498,.498);t.needsUpdate=true;return t};
 const roof=tile(0,1),plaster=tile(1,1),wood=tile(0,0),stone=tile(1,0);
 const mat=(color:number,map?:T.Texture)=>new T.MeshStandardMaterial({color,roughness:.95,map,bumpMap:map,bumpScale:.035});
 return {timber:mat(0xb5a990,wood),plaster:mat(0xeee8d7,plaster),thatch:mat(0xe1d9ae,roof),strawLight:mat(0xe7d8a7,roof),strawDark:mat(0xc3b589,roof),stone:mat(0xd6d3c6,stone),rust:mat(0x9b8b74,roof),wood:mat(0xe0ceb0,wood),iron:mat(palette.iron),red:mat(palette.red),cloth:mat(palette.cloth),dark:mat(palette.dark),soil:mat(0x716044),green:mat(0x7e8851)};
}
export type Mats=ReturnType<typeof materials>;type Mat=keyof Mats;
export class Kit{
 parts=new Map<Mat,T.BufferGeometry[]>();
 push(g:T.BufferGeometry,m:Mat,x=0,y=0,z=0,rx=0,ry=0,rz=0){g.rotateX(rx);g.rotateY(ry);g.rotateZ(rz);g.translate(x,y,z);if(!g.getAttribute('uv'))g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count*2),2));if(!g.index)g=g.toNonIndexed();let a=this.parts.get(m);if(!a)this.parts.set(m,a=[]);a.push(g.index?g.toNonIndexed():g)}
 box(x:number,y:number,z:number,w:number,h:number,d:number,m:Mat,rx=0,ry=0,rz=0){this.push(new T.BoxGeometry(w,h,d),m,x,y,z,rx,ry,rz)}
 cylinder(x:number,y:number,z:number,r:number,h:number,m:Mat,rx=0,rz=0){this.push(new T.CylinderGeometry(r*.9,r,h,8),m,x,y,z,rx,0,rz)}
 beam(a:T.Vector3,b:T.Vector3,width:number,m:Mat='timber'){const d=b.clone().sub(a);const g=new T.BoxGeometry(width,d.length(),width);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));const p=a.clone().add(b).multiplyScalar(.5);this.push(g,m,p.x,p.y,p.z)}
 roof(w:number,d:number,y:number,rise:number,mat:Mat='thatch'){
  const slope=Math.atan2(rise,w/2),length=Math.hypot(w/2,rise),rng=random(Math.floor(w*100+d*3));
  this.box(-w/4,y+rise/2,0,length+.3,.22,d,mat,0,0,slope);this.box(w/4,y+rise/2,0,length+.3,.22,d,mat,0,0,-slope);
  this.box(0,y+rise+.05,0,.38,.26,d+.18,mat);
  for(const side of[-1,1])for(let row=0;row<6;row++)for(let col=0;col<Math.ceil(d/.32);col++){
   const t=(row+.5)/6,xx=side*w*.5*t,yy=y+rise*(1-t)+.16,zz=-d/2+col*.32+.16+(row%2)*.03;
   const tint=mat==='thatch'?(rng()>.68?'strawLight':rng()>.68?'strawDark':mat):mat;this.box(xx+(rng()-.5)*.06,yy+(rng()-.5)*.04,zz,length/6+.06+rng()*.12,.1+rng()*.07,.26+rng()*.055,tint,0,(rng()-.5)*.025,-side*slope);
  }
  for(const z of [-d/2,d/2]){this.beam(new T.Vector3(-w/2,y,z),new T.Vector3(0,y+rise,z),.18);this.beam(new T.Vector3(0,y+rise,z),new T.Vector3(w/2,y,z),.18)}
 }
 finish(mats:Mats){const group=new T.Group();for(const [m,parts]of this.parts){const merged=mergeGeometries(parts,false);if(!merged)continue;const mesh=new T.Mesh(merged,mats[m]);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);for(const p of parts)p.dispose()}return group}
}
function barrel(k:Kit,x:number,z:number,y=0){k.cylinder(x,y+.46,z,.35,.9,'wood');k.cylinder(x,y+.13,z,.36,.06,'iron');k.cylinder(x,y+.75,z,.34,.06,'iron')}
function crate(k:Kit,x:number,z:number,y=0){k.box(x,y+.35,z,.7,.7,.7,'wood');k.box(x,y+.35,z+.36,.09,.7,.05,'timber');k.box(x,y+.35,z-.36,.09,.7,.05,'timber')}
function chimney(k:Kit,x:number,z:number,y=3){k.box(x,y,z,.85,2.6,.8,'stone');k.box(x,y+1.32,z,1.02,.2,.95,'stone');k.box(x,y+1.44,z,.57,.08,.52,'dark')}
function house(k:Kit,w:number,d:number,h:number,seed:number,raised=false){
 const base=raised?1:.25;
 if(raised){for(const x of[-w/2+.4,w/2-.4])for(const z of[-d/2+.4,d/2-.4]){k.box(x,.5,z,.45,1,.45,'timber');k.box(x,.1,z,.65,.2,.65,'stone')}}else k.box(0,.18,0,w+.2,.36,d+.2,'stone');
 k.box(0,base+h/2,0,w,h,d,raised?'wood':'plaster');
 for(const x of[-w/2+.04,0,w/2-.04])for(const z of[-d/2-.03,d/2+.03])k.box(x,base+h/2,z,.18,h,.16,'timber');
 for(const yy of[base+.1,base+h*.58,base+h])k.box(0,yy,d/2+.04,w,.16,.18,'timber');
 for(const x of[-w/2-.04,w/2+.04]){k.box(x,base+h*.56,0,.14,.16,d,'timber');k.box(x,base+h,0,.14,.17,d,'timber')}
 for(const x of[-w/2+.12,w/2-.12]){const inward=x>0?-1:1;k.beam(new T.Vector3(x,base+.2,d/2+.08),new T.Vector3(x+inward*w*.26,base+h*.56,d/2+.08),.12)}
 for(let i=0;i<Math.ceil(w/.65);i++)k.box(-w/2+i*.65,base-.13,d/2+.06,.58,.23,.24,'stone');
 const front=d/2+.09;k.box(0,base+.9,front,1.04,1.8,.08,'dark');k.box(.05,base+.86,front+.04,.88,1.65,.07,'wood');k.box(.3,base+.92,front+.1,.12,.06,.07,'iron');
 for(const x of[-w*.3,w*.3]){k.box(x,base+h*.57,front,.66,.84,.08,'dark');k.box(x,base+h*.57,front+.04,.05,.8,.04,'wood');k.box(x,base+h*.57,front+.05,.6,.05,.04,'wood');k.box(x,base+h*.57-.47,front+.12,.9,.12,.3,'timber');for(const side of[-1,1])k.box(x+side*.43,base+h*.57,front+.08,.18,.83,.07,'wood',0,side*.2)}
 for(const z of[-d/2-.04,d/2+.04]){k.box(0,base+h+.75,z,.16,1.5,.12,'timber');for(const x of[-w*.22,w*.22])k.beam(new T.Vector3(x,base+h,z),new T.Vector3(0,base+h+1.5,z),.10)}
 const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(0,2.5);shape.lineTo(w/2,0);shape.closePath();
 k.push(new T.ShapeGeometry(shape),'plaster',0,base+h,d/2);k.push(new T.ShapeGeometry(shape),'plaster',0,base+h,-d/2,0,Math.PI);
 k.roof(w+.85,d+1,base+h,2.5,seed%4===1?'rust':'thatch');
 if(!raised){
  chimney(k,w*.32,-d*.18,base+h+1);
  const dk=new Kit();dk.box(0,.42,0,1,.84,1.2,'plaster');dk.box(0,.45,.615,.65,.65,.055,'dark');dk.box(0,.45,.65,.045,.66,.045,'wood');dk.box(0,.45,.65,.66,.045,.045,'wood');for(const x of[-.5,.5])dk.box(x,.45,.65,.09,.9,.1,'timber');dk.roof(1.35,1.5,.9,.65);
  for(const [material,parts]of dk.parts)for(const geo of parts){geo.rotateY(-Math.PI/2);geo.translate(-w*.27,base+h+1.05,0);k.push(geo,material)}
  k.box(-1.3,.64,d/2+.8,1.5,.14,.45,'wood');for(const x of[-1.8,-.8])k.box(x,.33,d/2+.8,.14,.65,.35,'timber');
 }
 for(let i=0;i<(raised?5:2);i++)k.box(0,.12+i*.18,d/2+.2+(raised?4-i:1-i)*.32,1.35,.24+i*.15,.4,'stone');
}
export function buildingModel(kind:Kind,m:Mats,seed=1){
 const k=new Kit();let sails:T.Group|undefined;
 if(kind==='cottage'){house(k,4.5,3.8,2.7,seed);barrel(k,2.9,1.2);k.box(-2.8,.24,1.7,.7,.48,1.1,'wood');k.box(-2.8,.52,1.7,.6,.1,1,'green');
  for(const z of[-2.3,3])for(let i=-3;i<=2;i++)k.cylinder(i,.6,z,.055,1.2,'wood');for(const z of[-2.3,3])k.box(-.5,.7,z,5.2,.1,.12,'wood');
 }else if(kind==='depot'){house(k,5.6,4.8,2.5,2,true);for(let i=0;i<3;i++)barrel(k,3.2+i*.8,-1);crate(k,-3.5,1);crate(k,-3.5,2);for(const x of[-2,2])k.cylinder(x,1.4,4,.07,2.8,'wood');k.box(0,2.75,4,4.8,.12,2.4,'cloth',.12);k.box(0,1.05,4,4,.15,1.1,'wood');for(let i=0;i<5;i++)crate(k,-1.5+i*.75,4,1.1);
 }else if(kind==='mill'){k.cylinder(0,2.9,0,1.7,5.8,'plaster');k.cylinder(0,.2,0,1.85,.4,'stone');k.push(new T.ConeGeometry(2.2,2.7,12),'thatch',0,7,0);k.box(0,1,1.7,.85,2,.15,'wood');sails=new T.Group();sails.position.set(0,5.5,2);const s=new Kit();for(let i=0;i<4;i++){const a=i*Math.PI/2;s.box(Math.sin(a)*2.1,Math.cos(a)*2.1,0,.16,4.2,.18,'timber',0,0,-a);s.box(Math.sin(a)*2.5+Math.cos(a)*.45,Math.cos(a)*2.5-Math.sin(a)*.45,.07,.85,2.8,.07,'cloth',0,0,-a)}sails.add(s.finish(m));
 }else if(kind==='smith'){k.box(0,.18,0,5.2,.36,4.5,'stone');k.box(0,1.6,-1.8,5,2.8,.25,'plaster');for(const x of[-2.2,2.2])for(const z of[-1.8,1.9])k.box(x,1.6,z,.24,3,.24,'timber');k.roof(5.7,5,3.1,1.7);chimney(k,1.7,-1.3,3.4);k.box(1.5,1,-1.1,1.4,1.6,1.3,'stone');k.box(1.5,1.45,-.4,.7,.45,.1,'dark');k.box(-.8,.6,.8,.6,1.2,.6,'wood');k.box(-.8,1.3,.8,1.1,.24,.4,'iron');barrel(k,-2.8,1.3);crate(k,2.8,.4);
 }else if(kind==='tower'){for(const x of[-1.3,1.3])for(const z of[-1.3,1.3])k.box(x,3,z,.25,6,.25,'timber');k.box(0,5.2,0,3.3,.24,3.3,'wood');for(const x of[-1.6,1.6])k.box(x,5.7,0,.12,.8,3.4,'wood');k.box(0,5.7,-1.6,3.3,.8,.12,'wood');k.roof(3.9,3.9,6.7,1.3);for(let i=0;i<15;i++)k.box(.7,.4+i*.34,1.65,.7,.08,.08,'wood');
 }else if(kind==='yard'){for(const x of[-2.5,2.5])for(const z of[-2.3,2.3])k.cylinder(x,.6,z,.09,1.2,'wood');for(const z of[-2.3,2.3])k.box(0,.7,z,5,.13,.13,'timber');for(let i=0;i<5;i++){k.cylinder(-2+i*.3,1.35,-2,.035,2.7,'wood');k.push(new T.ConeGeometry(.08,.35,4),'iron',-2+i*.3,2.8,-2)}k.box(1.3,.6,-1.8,1.4,1.2,.8,'wood');
 }else if(kind==='outpost'){house(k,4.2,3.5,2.4,1);crate(k,2.7,1);barrel(k,2.7,-1);
 }else if(kind==='field'){k.box(0,-.05,0,12,.1,10,'soil');for(let z=-4.5;z<5;z+=.65)k.box(0,.06,z,11.5,.13,.18,'soil');for(const x of[-6,6])for(let z=-5;z<=5;z+=2)k.cylinder(x,.5,z,.055,1,'wood');
 }else if(kind==='bakery'){house(k,4.8,3.8,2.5,1);k.push(new T.SphereGeometry(1.1,10,7),'stone',3,1,0);k.box(3,.45,.9,.65,.8,.1,'dark');barrel(k,-3,1.6);
 }else{
  const w=kind==='logging'?4.7:3.7,d=3.3;for(const x of[-w/2,w/2])for(const z of[-d/2,d/2])k.box(x,1.2,z,.17,2.4,.17,'timber');k.box(0,1.1,-d/2,w,2.2,.15,'wood');k.roof(w+.7,d+.8,2.4,1.3);
  if(kind==='logging'||kind==='splitter'||kind==='sawmill'){for(let i=0;i<8;i++)k.cylinder(-1.3+(i%4)*.65,.4+Math.floor(i/4)*.5,0,.27,2.4,'wood',Math.PI/2);k.cylinder(2.4,.4,1.5,.45,.8,'wood');if(kind==='sawmill'){k.box(0,.75,2.4,3,.16,.75,'timber');k.box(0,1.5,2.4,2.5,.09,.05,'iron')}}else{barrel(k,-1,0);barrel(k,0,-.3);crate(k,1,0)}
  if(kind==='fishery'){for(let i=0;i<8;i++)k.box(3.5,0,i*.4-1.4,3,.12,.32,'wood');k.box(2.1,1,0,.1,1.8,3,'wood');for(let i=0;i<8;i++)k.box(2.16,.9,-1.4+i*.4,.02,1.2,.03,'cloth')}
 }
 const root=k.finish(m);if(sails){root.add(sails);root.userData.sails=sails}return root;
}
export function character(m:Mats,soldier=false,enemy=false,index=0){
 const group=new T.Group(),body=new Kit();body.cylinder(0,1,0,.2,.65,soldier?'red':index%3?'cloth':'wood');body.box(0,.78,0,.45,.22,.3,'timber');body.cylinder(0,1.53,0,.16,.28,'cloth');body.push(new T.SphereGeometry(.18,7,5),soldier?'iron':'timber',0,1.67,0);body.box(0,1.52,.15,.17,.16,.1,'wood');
 const torso=body.finish(m);if(enemy)torso.traverse(o=>{if(o instanceof T.Mesh&&o.material===m.red)o.material=m.dark});group.add(torso);
 const legs:T.Group[]=[];for(const x of[-.13,.13]){const k=new Kit();k.box(0,-.29,0,.17,.58,.2,'timber');k.box(0,-.58,.08,.2,.12,.35,'dark');const leg=k.finish(m);leg.position.set(x,.72,0);group.add(leg);legs.push(leg)}
 const arms:T.Group[]=[];for(const x of[-.3,.3]){const k=new Kit();k.box(0,-.22,0,.13,.44,.16,soldier?'red':'cloth');k.box(0,-.46,0,.12,.12,.14,'wood');const arm=k.finish(m);arm.position.set(x,1.25,0);group.add(arm);arms.push(arm)}
 if(soldier){const k=new Kit();k.cylinder(.38,1.5,.1,.025,2.9,'wood');k.push(new T.ConeGeometry(.06,.3,4),'iron',.38,3.1,.1);k.push(new T.CylinderGeometry(.32,.32,.08,12),'wood',-.34,1,.12,Math.PI/2);k.push(new T.SphereGeometry(.1,6,4),'iron',-.34,1,.19);group.add(k.finish(m))}
 const sack=new T.Mesh(new T.SphereGeometry(.26,7,5),m.cloth);sack.scale.set(1,1.4,.85);sack.position.set(0,1,-.25);sack.visible=false;group.add(sack);group.userData={legs,arms,sack};return group;
}
export function banner(m:Mats,enemy=false){const g=new T.Group(),k=new Kit();k.cylinder(0,2.1,0,.04,4.2,'wood');k.push(new T.ConeGeometry(.09,.3,4),'iron',0,4.3,0);g.add(k.finish(m));const cloth=new T.Mesh(new T.PlaneGeometry(1.15,1.6,6,7),new T.MeshStandardMaterial({color:enemy?0x3d4650:palette.red,roughness:1,side:T.DoubleSide}));cloth.position.set(.58,3.1,0);g.add(cloth);const mark=new T.Mesh(new T.PlaneGeometry(.08,.7),m.cloth);mark.position.set(.55,3.1,.025);g.add(mark);g.userData.cloth=cloth;return g}
