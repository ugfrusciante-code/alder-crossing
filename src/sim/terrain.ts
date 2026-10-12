export interface Point{x:number;z:number}
export const riverX=(z:number)=>35+Math.sin(z*.035)*5;
export function height(x:number,z:number){
 const d=Math.abs(x-riverX(z));
 const base=.8+Math.sin(x*.034)*1.2+Math.cos(z*.039)*.6;
 const hill=Math.max(0,x-52)*.085 + Math.max(0,-z-40)*.045;
 return (base+hill)*Math.min(1,Math.max(0,(d-3)/8)) - Math.max(0,1-d/5)*1.8;
}
export function water(x:number,z:number){return Math.abs(x-riverX(z))<5.8}
export function bridge(x:number,z:number){return Math.abs(z-12)<3.1 && Math.abs(x-riverX(12))<12}
export function walkable(x:number,z:number){return Math.abs(x)<98&&Math.abs(z)<98&&(!water(x,z)||bridge(x,z))}
export function ground(x:number,z:number){return bridge(x,z)?1.6:height(x,z)}
export function dist(a:Point,b:Point){return Math.hypot(a.x-b.x,a.z-b.z)}
export function region(x:number){return x<riverX(12)+6?0:x<69?1:2}
export function random(seed:number){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296}}
