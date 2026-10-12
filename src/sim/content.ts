export const GOODS = ['logs','planks','stone','firewood','grain','flour','bread','roots','fish','provisions','tools','iron','spears','shields'] as const;
export type Good=typeof GOODS[number];
export type Stock=Partial<Record<Good,number>>;
export const LABELS:Record<Good,string>={logs:'Timber',planks:'Planks',stone:'Stone',firewood:'Firewood',grain:'Grain',flour:'Flour',bread:'Bread',roots:'Roots',fish:'Fish',provisions:'Provisions',tools:'Tools',iron:'Iron',spears:'Spears',shields:'Shields'};
export const PRICES:Record<Good,number>={logs:2,planks:5,stone:3,firewood:2,grain:2,flour:3,bread:3,roots:2,fish:3,provisions:5,tools:12,iron:8,spears:15,shields:9};
export const EDIBLE:Good[]=['bread','roots','fish','provisions'];
export type Kind='cottage'|'depot'|'logging'|'fishery'|'forager'|'field'|'mill'|'bakery'|'splitter'|'sawmill'|'smith'|'yard'|'tower'|'outpost';
export type RecipeId='logs'|'fish'|'roots'|'grain'|'flour'|'bread'|'firewood'|'planks'|'spears'|'shields'|'tools'|'provisions';
export interface Recipe{input:Stock;output:Stock;work:number;seasonal?:boolean}
export const RECIPES:Record<RecipeId,Recipe>={
 logs:{input:{},output:{logs:2},work:24},fish:{input:{},output:{fish:2},work:24},roots:{input:{},output:{roots:2},work:22,seasonal:true},
 grain:{input:{},output:{grain:8},work:25},flour:{input:{grain:2},output:{flour:2},work:12},bread:{input:{flour:2,firewood:.2},output:{bread:4},work:14},
 firewood:{input:{logs:1},output:{firewood:4},work:12},planks:{input:{logs:1},output:{planks:2},work:15},
 spears:{input:{iron:1,logs:1},output:{spears:1},work:24},shields:{input:{planks:1},output:{shields:1},work:18},tools:{input:{iron:1,logs:.5},output:{tools:1},work:24},
 provisions:{input:{roots:2,firewood:.2},output:{provisions:1.8},work:8}
};
export interface Definition{name:string;category:string;description:string;cost:Stock;work:number;size:[number,number];jobs:number;recipe?:RecipeId;recipes?:RecipeId[]}
export const BUILDINGS:Record<Kind,Definition>={
 cottage:{name:'Timber cottage',category:'Homes',description:'A warm home for four people. Adds housing and a modest daily contribution to the treasury.',cost:{logs:8,planks:3},work:35,size:[6,5],jobs:0},
 depot:{name:'Granary & market',category:'Village',description:'The village heart. Workers deliver their goods here; households collect their daily supplies.',cost:{logs:12,planks:6,stone:4},work:50,size:[7,7],jobs:0},
 logging:{name:'Woodcutters’ camp',category:'Gathering',description:'Harvests nearby woodland. Timber can become houses, planks or winter fuel.',cost:{logs:5},work:20,size:[6,5],jobs:3,recipe:'logs'},
 fishery:{name:'Fishing hut',category:'Gathering',description:'A steady food source. Place near the river on the western bank.',cost:{logs:6,planks:2},work:25,size:[5,5],jobs:2,recipe:'fish'},
 forager:{name:'Foragers’ shelter',category:'Gathering',description:'Gathers roots during spring, summer and autumn. The ground is frozen in winter.',cost:{logs:4},work:20,size:[5,4],jobs:2,recipe:'roots'},
 field:{name:'Grain field',category:'Food',description:'Sow in spring, tend in summer, harvest in autumn. Winter ends the harvest window.',cost:{logs:3},work:15,size:[12,10],jobs:4,recipe:'grain'},
 mill:{name:'Windmill',category:'Food',description:'Turns harvested grain into flour. The first step of the bread chain.',cost:{logs:10,planks:6,stone:4},work:50,size:[6,6],jobs:1,recipe:'flour'},
 bakery:{name:'Bakehouse',category:'Food',description:'Flour and a little firewood become bread. Switch to provisions to preserve roots for your militia.',cost:{logs:8,planks:4,stone:4},work:40,size:[6,5],jobs:2,recipe:'bread',recipes:['bread','provisions']},
 splitter:{name:'Firewood yard',category:'Industry',description:'Splits one timber into four firewood. Winter households burn four times as much.',cost:{logs:4},work:15,size:[5,4],jobs:1,recipe:'firewood'},
 sawmill:{name:'Sawpit',category:'Industry',description:'One timber becomes two planks. Planks compete with fuel for your wood supply.',cost:{logs:5},work:20,size:[6,4],jobs:2,recipe:'planks'},
 smith:{name:'Village smithy',category:'Industry',description:'Forge spears or tools from imported iron, or make wooden shields. Choose a recipe in the inspector.',cost:{logs:8,planks:4,stone:6},work:45,size:[6,5],jobs:2,recipe:'spears',recipes:['spears','shields','tools']},
 yard:{name:'Mustering yard',category:'Military',description:'Equip eight adult workers with spears and shields. Their civilian jobs become vacant.',cost:{logs:6,planks:4},work:25,size:[7,6],jobs:0},
 tower:{name:'Watchtower',category:'Military',description:'A defensive landmark. Friendly militia fighting within 12 metres receive a defense advantage.',cost:{logs:10,planks:4,stone:2},work:40,size:[4,4],jobs:0},
 outpost:{name:'Crossing outpost',category:'Military',description:'Claim the eastern crossing after driving off its occupiers. Staff it with two adults and supply it for two days.',cost:{logs:8,planks:4,stone:4},work:40,size:[6,5],jobs:2}
};
export const SEASONS=['Spring','Summer','Autumn','Winter'];
export const DAY_SECONDS=90,SEASON_DAYS=6,TICK=.05;
export const NAMES=['Agnes','Oswin','Marta','Edric','Ada','Hugh','Elsbeth','Rowan','Bran','Ansel','Greta','Willa','Tomas','Hilda','Odo','Mira','Giles','Alma','Soren','Ida','Ulric','Lena','Ralf','Emma'];
