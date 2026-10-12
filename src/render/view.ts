import * as T from 'three';
import {Game,type Building} from '../sim/game';
import {BUILDINGS,type Kind} from '../sim/content';
import {height,ground,riverX,water,bridge,random,dist,type Point} from '../sim/terrain';
import {materials,buildingModel,character,banner,Kit} from './models';
import {countryRoad,earthPatch,woodland,courtyard,marketDetails} from './landscape';

export class View{
 renderer:T.WebGLRenderer;scene=new T.Scene();camera=new T.PerspectiveCamera(35,1,.3,850);m=materials();
 target=new T.Vector3(-20,0,4);yaw=-.42;zoom=91;pitch=.65;
 terrain!:T.Mesh;river!:T.Mesh;selection:T.Mesh;ghost:T.Group|null=null;ghostKind:Kind|null=null;placementRotation=0;placementIssue='';private ghostPoint:Point|null=null;
 buildings=new Map<number,T.Group>();actors=new Map<number,T.Group>();flags=new Map<number,T.Group>();enemies:T.Group[]=[];
 ray=new T.Raycaster();pointer=new T.Vector2();private season=-1;private leaves:T.InstancedMesh[]=[];private grass!:T.InstancedMesh;private sun:T.DirectionalLight;
 selected:number|null=null;selectedFormation:number|null=null;overlay=false;private overlayMesh:T.Group;private cropMeshes=new Map<number,T.Group>();private waterTime={value:0};private forest!:ReturnType<typeof woodland>;private clearedCount=-1;
 constructor(readonly canvas:HTMLCanvasElement,public game:Game){
  this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.02;
  const skyCanvas=document.createElement('canvas');skyCanvas.width=512;skyCanvas.height=256;const skyCtx=skyCanvas.getContext('2d')!,sky=skyCtx.createLinearGradient(0,0,0,256);sky.addColorStop(0,'#91acbf');sky.addColorStop(.46,'#dce3df');sky.addColorStop(.55,'#bcb596');sky.addColorStop(1,'#5c6040');skyCtx.fillStyle=sky;skyCtx.fillRect(0,0,512,256);const env=new T.CanvasTexture(skyCanvas);env.mapping=T.EquirectangularReflectionMapping;env.colorSpace=T.SRGBColorSpace;this.scene.environment=env;this.scene.environmentIntensity=.35;
  this.scene.background=new T.Color(0xb8c0b5);this.scene.fog=new T.FogExp2(0xb8c0b5,.0024);this.scene.add(new T.HemisphereLight(0xdde7e7,0x8e8166,1.8));
  this.sun=new T.DirectionalLight(0xffe8c4,2.8);this.sun.position.set(-65,90,65);this.sun.castShadow=true;this.sun.shadow.mapSize.set(4096,4096);Object.assign(this.sun.shadow.camera,{left:-105,right:105,top:100,bottom:-100,near:1,far:260});this.sun.shadow.bias=-.00035;this.sun.shadow.normalBias=.06;this.scene.add(this.sun);
  this.makeTerrain();this.makeRiver();this.makeRoads();this.makeNature();this.makeBridge();this.makeLandmarks();this.scene.add(marketDetails(this.m));
  this.selection=new T.Mesh(new T.RingGeometry(3.9,4.03,64),new T.MeshBasicMaterial({color:0xf2db95,transparent:true,opacity:.9,depthWrite:false,side:T.DoubleSide}));this.selection.rotation.x=-Math.PI/2;this.selection.visible=false;this.scene.add(this.selection);
  this.overlayMesh=this.makeOverlay();this.scene.add(this.overlayMesh);this.overlayMesh.visible=false;
  for(let i=0;i<8;i++){const c=character(this.m,true,true,i);this.scene.add(c);this.enemies.push(c)}
  const enemyFlag=banner(this.m,true);this.flags.set(-1,enemyFlag);this.scene.add(enemyFlag);
  this.resize();window.addEventListener('resize',()=>this.resize());this.update(0,0);
 }
 reset(game:Game){
  const dispose=(o:T.Object3D)=>{this.scene.remove(o);o.traverse(c=>{if(c instanceof T.Mesh)c.geometry.dispose()})};
  for(const b of this.buildings.values()){if(b.userData.patch)dispose(b.userData.patch);dispose(b)}
  for(const c of this.cropMeshes.values())dispose(c);for(const a of this.actors.values())dispose(a);
  for(const [id,f]of this.flags)if(id!==-1){dispose(f);this.flags.delete(id)}
  this.buildings.clear();this.actors.clear();this.cropMeshes.clear();this.game=game;this.season=-1;this.clearedCount=-1;this.selected=this.selectedFormation=null;this.setGhost(null);this.focus(game.depot);
 }
 syncCamera(){this.camera.position.set(this.target.x+Math.sin(this.yaw)*Math.cos(this.pitch)*this.zoom,Math.sin(this.pitch)*this.zoom,this.target.z+Math.cos(this.yaw)*Math.cos(this.pitch)*this.zoom);this.camera.lookAt(this.target.x,0,this.target.z);this.camera.updateMatrixWorld()}
 zoomAt(delta:number,x:number,y:number){const before=this.hit(x,y);this.zoom=Math.max(35,Math.min(190,this.zoom+delta));this.syncCamera();const after=this.hit(x,y);if(before&&after){this.target.x+=before.x-after.x;this.target.z+=before.z-after.z;this.pan(0,0)}this.syncCamera()}
 resize(){this.renderer.setSize(innerWidth,innerHeight);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix()}
 private makeTerrain(){
  const geo=new T.PlaneGeometry(420,420,220,220);geo.rotateX(-Math.PI/2);const pos=geo.attributes.position,colors=new Float32Array(pos.count*3);const r=random(42),green=new T.Color();
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),h=height(x,z);pos.setY(i,h);const d=Math.abs(x-riverX(z));const v=Math.sin(x*.09)*Math.cos(z*.07)*.06+r()*.015;green.setHSL(.22+v*.12,.22,.73+v);if(d<10)green.setHSL(.16,.19,.63+v);if(h>8)green.lerp(new T.Color(0x73776b),Math.min(.5,(h-8)/20));green.toArray(colors,i*3)}geo.setAttribute('color',new T.BufferAttribute(colors,3));geo.computeVertexNormals();
  const tex=new T.TextureLoader().load('./textures/meadow.png');tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(32,32);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=16;
  const material=new T.MeshStandardMaterial({map:tex,bumpMap:tex,bumpScale:.12,vertexColors:true,roughness:1});
  material.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.22,.28,.105),.30);')};
  this.terrain=new T.Mesh(geo,material);this.terrain.receiveShadow=true;this.scene.add(this.terrain);
 }
 private makeRiver(){
  const pts:number[]=[],uv:number[]=[],indices:number[]=[];for(let i=0;i<=200;i++){const z=i*2.1-210,x=riverX(z);pts.push(x-6,-.28,z,x+6,-.28,z);uv.push(0,i/8,1,i/8);if(i<200){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3)}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  const mat=new T.MeshStandardMaterial({color:0x698683,metalness:.48,roughness:.22,transparent:true,opacity:.96});
  mat.onBeforeCompile=s=>{s.uniforms.waterTime=this.waterTime;s.vertexShader='varying vec2 waterXZ;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n waterXZ=position.xz;');s.fragmentShader='varying vec2 waterXZ;uniform float waterTime;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
   float wave=sin(waterXZ.x*7.+sin(waterXZ.y*4.-waterTime)*1.5+waterTime*.5); float smallWave=sin(waterXZ.y*12.-waterTime*1.2+sin(waterXZ.x*3.)); normal=normalize(normal+vec3(wave*.11,smallWave*.14,0.));`);s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float ripple=sin(waterXZ.x*3.7+sin(waterXZ.y*1.5-waterTime*.3))*sin(waterXZ.y*6.-waterTime*.7);diffuseColor.rgb*=.8+smoothstep(.3,.9,ripple)*.55;
   `)};this.river=new T.Mesh(g,mat);this.river.receiveShadow=true;this.scene.add(this.river);
  const r=random(90);const line=new Kit();for(let i=0;i<220;i++){const z=r()*220-110,x=riverX(z)+(r()-.5)*10;line.box(x,-.2,z,.3+r()*1.2,.012,.025,'cloth')}const ripples=line.finish(this.m);ripples.children.forEach(o=>{if(o instanceof T.Mesh){o.material=new T.MeshBasicMaterial({color:0xb8cac2,transparent:true,opacity:.23});o.castShadow=false}});this.scene.add(ripples);
 }
 private road(points:Point[],width=2.1){this.scene.add(countryRoad(points,width))}
 private makeRoads(){this.road([{x:-100,z:3},{x:-61,z:5},{x:-43,z:9},{x:-18,z:12},{x:17,z:12},{x:57,z:12},{x:100,z:5}],3.2);this.road([{x:-43,z:9},{x:-43,z:-12},{x:-48,z:-21}],1.6);this.road([{x:-37,z:8},{x:-33,z:18},{x:-19,z:27},{x:-8,z:25}],1.8);this.road([{x:-16,z:12},{x:-17,z:-5},{x:-28,z:-19}],1.8);this.road([{x:-18,z:12},{x:-35,z:30},{x:-48,z:33}],1.5);this.road([{x:15,z:12},{x:22,z:21},{x:25,z:27}],1.5)}
 private makeNature(){
  const r=random(991),temp=new T.Object3D();this.forest=woodland(this.scene,this.m,this.game.s.buildings);this.leaves=this.forest.leaves;
  const rockGeo=new T.IcosahedronGeometry(1,0);const rocks=new T.InstancedMesh(rockGeo,new T.MeshStandardMaterial({color:0x898b7b,roughness:1,flatShading:true}),320);rocks.castShadow=true;rocks.receiveShadow=true;
  for(let i=0;i<320;i++){const z=(r()-.5)*260,x=i<200?riverX(z)+(r()>.5?1:-1)*(7+r()*2):(r()-.5)*260;temp.position.set(x,height(x,z)+.1,z);temp.scale.set(.2+r()*.7,.15+r()*.7,.25+r()*.8);temp.rotation.set(r(),r()*6,r());temp.updateMatrix();rocks.setMatrixAt(i,temp.matrix)}this.scene.add(rocks);
  const grassGeo=new T.BufferGeometry();grassGeo.setAttribute('position',new T.Float32BufferAttribute([-.15,0,0,0,.55,0,.15,0,0,0,0,-.15,0,.45,0,0,0,.15],3));grassGeo.computeVertexNormals();this.grass=new T.InstancedMesh(grassGeo,new T.MeshStandardMaterial({color:0x8c8c58,side:T.DoubleSide,roughness:1}),3400);
  for(let i=0;i<3400;i++){const x=(r()-.5)*200,z=(r()-.5)*200;const blank=water(x,z)||Math.abs(z-12)<4||this.game.s.buildings.some(b=>dist(b,{x,z})<7);temp.position.set(x,height(x,z),z);temp.scale.setScalar(blank?0:.4+r()*.7);temp.rotation.set(0,r()*6,0);temp.updateMatrix();this.grass.setMatrixAt(i,temp.matrix)}this.scene.add(this.grass);
 }
 private makeBridge(){const k=new Kit(),cx=riverX(12);for(let x=cx-10;x<=cx+10;x+=.45)k.box(x,1.5,12,.39,.22,5.3,'wood');for(const z of[9.35,14.65]){for(let x=cx-10;x<=cx+10;x+=2.5){k.box(x,.75,z,.24,4,.24,'timber')}k.box(cx,2.8,z,20,.16,.18,'wood');k.box(cx,2.3,z,20,.13,.15,'wood')}
  for(const x of[cx-7,cx+7])for(const z of[9.4,14.6])k.box(x,.1,z,.65,3,.65,'stone');this.scene.add(k.finish(this.m))}
 private makeLandmarks(){
  const k=new Kit();for(let z=-8;z<33;z+=.5){if(z>8&&z<16)continue;k.cylinder(53,1.5+height(53,z),z,.23,3,'wood');k.push(new T.ConeGeometry(.21,.45,5),'wood',53,3.2+height(53,z),z)}
  for(const z of[7.5,16.5]){for(const x of[51.5,54.5])k.box(x,height(x,z)+2.4,z,.3,4.8,.3,'timber');k.box(53,height(53,z)+4.4,z,4,.22,3.3,'wood');k.box(53,height(53,z)+4.9,z-1.5,4,.8,.12,'wood');}
  this.scene.add(k.finish(this.m));const manor=buildingModel('cottage',this.m,1);manor.position.set(83,height(83,-47),-47);manor.scale.set(1.65,1.5,1.6);this.scene.add(manor);
  for(const [x,z]of[[-7,-44],[9,-43],[-10,43]]){this.scene.add(earthPatch(x,z,15,13,0x7f704f));const furrows=new Kit();for(let row=0;row<14;row++)for(let j=0;j<24;j++){const xx=x-5.5+j*.48,zz=z-4.5+row*.65;furrows.box(xx,height(xx,zz)+.06,zz,.45,.10,.14,'soil')}this.scene.add(furrows.finish(this.m))}

 }
 private makeOverlay(){const g=new T.Group();for(const [x,label,color]of[[-30,'ALDER · YOUR CHARTER',0xc7b781],[56,'THE CROSSING · CONTESTED',0xa6685e],[85,'IRON RIDGE · UNSURVEYED',0x899795]] as [number,string,number][]){
  const c=document.createElement('canvas');c.width=768;c.height=96;const ctx=c.getContext('2d')!;ctx.fillStyle='#1e2825dd';ctx.fillRect(0,0,768,96);ctx.font='26px Georgia';ctx.textAlign='center';ctx.fillStyle='#ede5cc';ctx.fillText(label,384,57);const tex=new T.CanvasTexture(c);const sprite=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:false}));sprite.position.set(x,12,-6);sprite.scale.set(25,3.1,1);g.add(sprite);
  const ring=new T.Mesh(new T.RingGeometry(x===-30?43:15,x===-30?43.3:15.3,80),new T.MeshBasicMaterial({color,transparent:true,opacity:.65,side:T.DoubleSide,depthTest:false}));ring.rotation.x=-Math.PI/2;ring.position.set(x,2,5);g.add(ring)}return g}
 focus(p:Point){this.target.x=p.x;this.target.z=p.z}
 pan(dx:number,dz:number){const s=Math.sin(this.yaw),c=Math.cos(this.yaw);this.target.x=Math.max(-75,Math.min(85,this.target.x+dx*c+dz*s));this.target.z=Math.max(-75,Math.min(75,this.target.z-dx*s+dz*c))}
 hit(clientX:number,clientY:number){const rect=this.canvas.getBoundingClientRect();this.pointer.set((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);const groundHit=this.ray.intersectObject(this.terrain)[0];return groundHit?{x:groundHit.point.x,z:groundHit.point.z}:null}
 pick(x:number,y:number){const p=this.hit(x,y);if(!p)return null;const hits=this.ray.intersectObjects([...this.buildings.values()],true);for(const hit of hits){let obj:T.Object3D|null=hit.object;while(obj){if(obj.userData.buildingId)return {type:'building' as const,id:obj.userData.buildingId as number};obj=obj.parent}}for(const f of this.game.s.formations)if(dist(p,f)<7)return {type:'formation' as const,id:f.id};const candidates=this.game.s.buildings.filter(b=>dist(p,b)<Math.max(...BUILDINGS[b.kind].size)/2+1).sort((a,b)=>dist(a,p)-dist(b,p));return candidates[0]?{type:'building' as const,id:candidates[0].id}:null}
 setGhost(kind:Kind|null){
  if(this.ghost){this.scene.remove(this.ghost);this.ghost.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose()}})}
  this.ghost=null;this.ghostKind=kind;this.ghostPoint=null;this.placementRotation=0;this.placementIssue='Move onto open ground.';
  if(kind){this.ghost=buildingModel(kind,this.m,2);this.ghost.traverse(o=>{if(o instanceof T.Mesh){o.material=(o.material as T.Material).clone();o.material.transparent=true;o.material.opacity=.42;o.castShadow=false}});
   const [w,d]=BUILDINGS[kind].size,points=[new T.Vector3(-w/2,.16,-d/2),new T.Vector3(w/2,.16,-d/2),new T.Vector3(w/2,.16,d/2),new T.Vector3(-w/2,.16,d/2)];
   const line=new T.LineLoop(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0xe8d797,depthTest:false}));this.ghost.add(line);
   const arrow=new T.Mesh(new T.ConeGeometry(.4,1,3),new T.MeshBasicMaterial({color:0xe8d797,depthTest:false}));arrow.rotation.x=Math.PI/2;arrow.position.set(0,.19,d/2+1.1);this.ghost.add(arrow);
   this.ghost.visible=false;this.scene.add(this.ghost)
  }
 }
 rotatePlacement(){this.placementRotation=(this.placementRotation+Math.PI/2)%(Math.PI*2);if(this.ghostPoint)this.moveGhost(this.ghostPoint)}
 moveGhost(p:Point){if(!this.ghost)return;this.ghostPoint={...p};this.ghost.position.set(p.x,height(p.x,p.z),p.z);this.ghost.rotation.y=this.placementRotation;this.ghost.visible=true;
  this.placementIssue=this.game.validatePlacement(this.ghostKind!,p.x,p.z,this.placementRotation);
  if(!this.placementIssue&&Object.entries(BUILDINGS[this.ghostKind!].cost).some(([good,qty])=>this.game.stock(good as import('../sim/content').Good)<qty!))this.placementIssue='Not enough materials in the granary.';
  const valid=!this.placementIssue;this.ghost.traverse(o=>{if(o instanceof T.Mesh&&o.material instanceof T.MeshStandardMaterial)o.material.emissive.setHex(valid?0x243b1c:0x6e1711);if(o instanceof T.Line)(o.material as T.LineBasicMaterial).color.setHex(valid?0xe8d797:0xe58370)})
 }

 update(dt:number,real:number){
  const g=this.game;this.waterTime.value=real;if(this.clearedCount!==g.s.buildings.length){this.forest.clearPlots(g.s.buildings.map(b=>({x:b.x,z:b.z,width:g.footprint(b.kind,b.rotation)[0],depth:g.footprint(b.kind,b.rotation)[1]})));this.clearedCount=g.s.buildings.length;}
  this.camera.position.set(this.target.x+Math.sin(this.yaw)*Math.cos(this.pitch)*this.zoom,Math.sin(this.pitch)*this.zoom,this.target.z+Math.cos(this.yaw)*Math.cos(this.pitch)*this.zoom);this.camera.lookAt(this.target.x,0,this.target.z);this.overlayMesh.visible=this.overlay;
  if(this.season!==g.season){this.season=g.season;const colors=[[0xc0c6a0,0x9faf8b,0xd0bc83],[0xb9c093,0x91a57e,0xc6c494],[0xe9b766,0xd79c55,0xf5c982],[0xc5c9bb,0xb3bcaa,0xd9d4be]][g.season];this.leaves.forEach((l,i)=>(l.material as T.MeshStandardMaterial).color.setHex(colors[i]));(this.terrain.material as T.MeshStandardMaterial).color.setHex(g.season===3?0xd4d8cb:g.season===2?0xede0bb:0xffffff)}
  for(const [id,root]of this.buildings)if(!g.building(id)){this.scene.remove(root);root.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose()});if(root.userData.patch){this.scene.remove(root.userData.patch);root.userData.patch.geometry.dispose();root.userData.patch.material.dispose()}const crop=this.cropMeshes.get(id);if(crop){this.scene.remove(crop);crop.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose()}});this.cropMeshes.delete(id)}this.buildings.delete(id)}
  for(const b of g.s.buildings){let root=this.buildings.get(b.id);if(!root){root=buildingModel(b.kind,this.m,b.id);root.position.set(b.x,height(b.x,b.z),b.z);root.rotation.y=b.rotation;root.userData.buildingId=b.id;if(b.kind==='cottage')root.add(courtyard(this.m,b.id));if(b.kind!=='field'){const patch=earthPatch(b.x,b.z,g.footprint(b.kind,b.rotation)[0]+7,g.footprint(b.kind,b.rotation)[1]+6);root.userData.patch=patch;this.scene.add(patch)}this.buildings.set(b.id,root);this.scene.add(root);if(b.kind==='field')this.makeCrops(b)}
   root.scale.y=b.progress>=1?1:.15+b.progress*.85;if(root.userData.sails){const working=g.workers(b.id).some(p=>p.task==='work');(root.userData.sails as T.Group).rotation.z+=dt*(working?.9:.06)}
   const crop=this.cropMeshes.get(b.id);if(crop){crop.rotation.y=b.rotation;crop.visible=g.season!==3;crop.scale.y=g.season===2?.5+Math.min(1,b.harvest/240)*.5:.12+b.crop*.8;crop.traverse(o=>{if(o instanceof T.Mesh)(o.material as T.MeshStandardMaterial).color.setHex(g.season===2?0xc8ac65:0x89964e)})}
  }
  for(const p of g.s.people){let root=this.actors.get(p.id);const soldier=!!p.formation;if(root&&root.userData.soldier!==soldier){this.scene.remove(root);this.actors.delete(p.id);root=undefined}if(!root){root=character(this.m,soldier,false,p.id);root.userData.soldier=soldier;this.actors.set(p.id,root);this.scene.add(root)}root.visible=p.alive;if(!p.alive)continue;
   const old=root.position.clone();const target=new T.Vector3(p.x,ground(p.x,p.z)+.05,p.z);root.position.lerp(target,Math.min(1,dt*14||1));const motion=target.clone().sub(old);if(motion.length()>.02)root.rotation.y=Math.atan2(motion.x,motion.z);const moving=motion.length()>.03;this.animatePerson(root,real,p.id,moving,p.task==='work');root.userData.sack.visible=Object.values(p.cargo).some(v=>v!>0);
  }
  const e=g.s.enemy;this.enemies.forEach((p,i)=>{p.visible=(g.s.scouted||g.day>=18)&&i<e.count&&e.x<96;p.position.set(e.x+(i%4-1.5)*1.3,ground(e.x,e.z),e.z+Math.floor(i/4)*1.5);p.rotation.y=e.routed?Math.PI/2:-Math.PI/2;this.animatePerson(p,real,i,dist(e,e.target)>4,false)});
  const enemyFlag=this.flags.get(-1)!;enemyFlag.position.set(e.x,ground(e.x,e.z),e.z);enemyFlag.visible=this.enemies.some(e=>e.visible);
  for(const f of g.s.formations){let flag=this.flags.get(f.id);if(!flag){flag=banner(this.m);this.scene.add(flag);this.flags.set(f.id,flag)}flag.position.set(f.x,ground(f.x,f.z),f.z-1)}
  for(const [id,flag]of this.flags){if(id!==-1&&!g.s.formations.some(f=>f.id===id)){this.scene.remove(flag);this.flags.delete(id);continue}const cloth=flag.userData.cloth as T.Mesh;const pos=cloth.geometry.attributes.position;for(let i=0;i<pos.count;i++)pos.setZ(i,Math.sin(real*2+pos.getX(i)*5)*.09*(pos.getX(i)+.6));pos.needsUpdate=true}
  const selected=this.selectedFormation?g.s.formations.find(f=>f.id===this.selectedFormation):this.selected?g.building(this.selected):null;this.selection.visible=!!selected;if(selected){this.selection.position.set(selected.x,ground(selected.x,selected.z)+.18,selected.z);const s=this.selectedFormation?1.3:Math.max(...BUILDINGS[(selected as Building).kind].size)/7;this.selection.scale.setScalar(s)}
  this.renderer.render(this.scene,this.camera);
 }
 private animatePerson(root:T.Group,time:number,id:number,moving:boolean,working:boolean){const legs=root.userData.legs as T.Group[],arms=root.userData.arms as T.Group[];legs.forEach((leg,i)=>leg.rotation.x=moving?Math.sin(time*7+id+i*Math.PI)*.5:0);arms.forEach((arm,i)=>arm.rotation.x=working?-.6+Math.sin(time*4+id)*.5:moving?-Math.sin(time*7+id+i*Math.PI)*.35:0)}
 private makeCrops(b:Building){const r=random(b.id),k=new Kit();for(let x=-5.4;x<5.5;x+=.4)for(let z=-4.5;z<4.6;z+=.65){const xx=x+r()*.15,zz=z+r()*.15;k.cylinder(xx,.36,zz,.018,.7,'green');k.push(new T.ConeGeometry(.085,.27,4),'green',xx,.78,zz)}const root=k.finish(this.m);root.traverse(o=>{if(o instanceof T.Mesh)o.material=(o.material as T.Material).clone()});root.position.set(b.x,height(b.x,b.z)+.1,b.z);this.scene.add(root);this.cropMeshes.set(b.id,root)}
 capture(){return this.renderer.domElement.toDataURL('image/png')}
}
