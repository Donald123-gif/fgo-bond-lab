const assert=require('node:assert/strict');const {solve,matches,masterCost,gain}=require('./dist/solver.js');require('./dist/data.js');
assert.equal(masterCost(1),56);assert.equal(masterCost(90),100);assert.equal(masterCost(92),101);assert.equal(masterCost(111),107);assert.equal(masterCost(170),115);assert.equal(masterCost(190),117);
assert.equal(matches([300],{clauses:[[300,303]]}),false);assert.equal(matches([300,303],{clauses:[[300,303]]}),true);assert.equal(matches([304],{clauses:[[203],[304]]}),true);
let ce={id:1,name:'兽科',cost:3,effects:[{mlb:true,rate:20,flat:0,supportRate:20,clauses:[[2821]]}]};
let o={count:3,front:2,cost:22,reserveSlots:0,reserveCost:0,base:915,tea:1,extra:0,support:0,supportMlb:true,objective:'team',forms:{},costumes:false,maxed:[],locked:[],owned:[],ces:{1:{enabled:true,mlb:true,required:false}}};
function brute(data,o){let best=-1;const ces=[[],[data.ces[0]]];for(const cs of ces){if(o.ces[1].required&&!cs.length)continue;const cost=cs.reduce((a,c)=>a+c.cost,0)+o.reserveCost;for(let mask=0;mask<1<<data.servants.length;mask++){let ss=data.servants.filter((s,i)=>mask&(1<<i));if(ss.length!==o.count||o.locked.some(id=>!ss.some(s=>s.id===id)))continue;for(let f=0;f<1<<ss.length;f++){if(f.toString(2).replace(/0/g,'').length!==o.front)continue;let c=cost,total=0;for(let i=0;i<ss.length;i++){let s=ss[i];c+=s.cost;total+=gain({...s,maxed:o.maxed.includes(s.id)},s.variants[0],cs.map(c=>({...c,e:c.effects[0]})),null,{...o,guides:ss.filter(member=>o.bond15?.includes(member.id)).length},!!(f&(1<<i))).value}if(c<=o.cost)best=Math.max(best,total)}}}return best}
for(let seed=0;seed<40;seed++){let servants=Array.from({length:7},(_,i)=>({id:i+1,no:i+1,cost:2+(i*7+seed*3)%11,traits:(i+seed)%3?[2821]:[],variants:[]}));for(const s of servants)s.variants=[{key:'base',traits:s.traits,cost:s.cost}];const data={servants,ces:[ce]};o={...o,cost:14+seed%18,front:seed%4,owned:servants.map(s=>s.id),locked:seed%2?[1]:[],maxed:seed%3?[3]:[]};let b=brute(data,o),r;try{r=solve(data,o)}catch(e){assert.equal(b,-1);continue}assert.equal(r.total,b,`seed ${seed}`);assert.equal(new Set(r.team.map(s=>s.id)).size,3);assert.ok(r.cost<=o.cost)}
let d=FGO_DATA,opts={...o,count:5,front:2,cost:115,locked:[],maxed:[],owned:d.servants.filter(s=>!s.mash).map(s=>s.id),ces:Object.fromEntries(d.ces.map(c=>[c.id,{enabled:[1949,2020,2052,2124,2142,2209,2233,2437,330,910,99].includes(c.id),mlb:true,required:false}]))};
console.time('full CN search');let r=solve(d,opts);console.timeEnd('full CN search');assert.equal(r.team.length,5);assert.ok(r.cost<=115);console.log('CN result',r.total,r.cost,r.checked,r.team.map(s=>d.servants.find(x=>x.id===s.id).name));
assert.throws(()=>solve(d,{...opts,locked:[1,2,3,4,5,6]}));
console.log('All tests passed: trait logic, master costs, 40 brute-force comparisons, full CN search, infeasible constraints.');

const make=(id,cost,traits)=>({id,no:id,cost,traits,variants:[{key:'base',traits,cost}]});
const tiny={servants:[make(1,10,[]),make(2,1,[2821]),make(3,1,[])],ces:[ce]};
let cfg={...opts,count:2,front:0,cost:14,owned:[1,2,3],locked:[1],ces:{1:{enabled:true,mlb:true,required:true}},forms:{},support:0};
let rr=solve(tiny,cfg);assert.ok(rr.ces.includes(1));assert.ok(rr.team.some(s=>s.id===1));assert.equal(rr.cost,14);
tiny.servants[0].variants.push({key:'ascension3',traits:[2821],cost:10});rr=solve(tiny,cfg);assert.equal(rr.team.find(s=>s.id===1).variant,'ascension3');
rr=solve(tiny,{...cfg,forms:{1:'base'}});assert.equal(rr.team.find(s=>s.id===1).variant,'base');
const teaCE=d.ces.find(c=>c.id===910),sv=make(1,1,[]);let gg=gain(sv,sv.variants[0],[],{...teaCE,e:teaCE.effects.find(e=>e.mlb)},{...cfg,base:1000,tea:1,extra:0},false);assert.equal(gg.value,1150);
assert.ok(d.servants.every(s=>s.no>0));assert.equal(new Set(d.servants.map(s=>s.no)).size,d.servants.length);
console.log('Additional tests passed: required CE/servant, shape selection and locking, support tea +15%, playable roster IDs.');
// Crown slots: one reward CE is free, the personal bond CE slot is never a
// second generic bonus slot. Crown identity and class constraints are mandatory.
const crownData={servants:[{...make(1,16,[300,303]),class:'saber'},{...make(2,3,[300,303]),class:'saber'},{...make(3,3,[300,303]),class:'caster'}],ces:[{id:1,name:'A',cost:12,effects:[{mlb:true,rate:10,supportRate:10,flat:0,clauses:[]}]},{id:2,name:'B',cost:5,effects:[{mlb:true,rate:0,supportRate:0,flat:50,clauses:[]}]}]};
const co={...opts,count:1,front:0,cost:16,base:1000,tea:1,extra:0,owned:[1,2,3],locked:[],maxed:[],ces:{1:{enabled:true,mlb:true,required:false},2:{enabled:true,mlb:true,required:false}},grandMode:'duel',grandGroup:'saber',grandId:1,grandReward:'auto',supportGrand:false,support:0};
let cr=solve(crownData,co);assert.equal(cr.total,1100);assert.equal(cr.cost,16);assert.equal(cr.grandReward,1);assert.equal(cr.ces.length,0);assert.equal(cr.team[0].id,1);
cr=solve(crownData,{...co,cost:21});assert.equal(cr.total,1150);assert.equal(cr.cost,21);assert.equal(cr.grandReward,1);assert.deepEqual(cr.ces,[2]);
cr=solve(crownData,{...co,cost:28,grandReward:'2'});assert.equal(cr.grandReward,2);assert.equal(cr.cost,28);
cr=solve(crownData,{...co,cost:28,grandReward:'0'});assert.equal(cr.grandReward,0);assert.equal(cr.total,1100);
cr=solve(crownData,{...co,count:2,cost:19});assert.ok(cr.team.every(g=>g.id!==3));assert.equal(cr.team.length,2);
assert.throws(()=>solve(crownData,{...co,grandId:3}),/职阶/);assert.throws(()=>solve(crownData,{...co,locked:[3]}),/职阶/);
cr=solve(crownData,{...co,support:1,supportGrand:true,supportReward:2,supportRewardMlb:true});assert.equal(cr.total,1250);
for(const bond of ['none','np','original'])assert.equal(solve(crownData,{...co,grandBond:bond}).total,1100);
const earth=d.servants.find(s=>s.no===351);assert.ok(!earth.variants.some(v=>v.key==='base'));const stage2=earth.variants.find(v=>v.label==='第2阶段'),stage13=earth.variants.find(v=>v.label.includes('第1阶段'));
assert.ok(stage2.traits.includes(302));assert.ok(!stage2.traits.includes(301));assert.ok(stage13.traits.includes(301));assert.ok(!stage13.traits.includes(302));assert.ok(stage2.name.includes('爱尔奎特'));
const mash=d.servants.find(s=>s.no===1);assert.equal(mash.variants.find(v=>v.label.includes('圣骑士')).cost,16);
console.log('Crown and real-data forms tests passed: 0-Cost reward slot, no extra generic bond slot, fixed crown, class filters, support second CE, Archetype Earth, Mash Paladin Cost.');
const momiji=d.servants.find(s=>s.id===703700),nff=d.ces.find(c=>c.id===1949),ne={...nff,e:nff.effects.find(e=>e.mlb)};
const dinosaur=momiji.variants.find(v=>v.label==='第1阶段'),human=momiji.variants.find(v=>v.label.includes('第2阶段'));
assert.equal(gain(momiji,dinosaur,[ne],null,{base:1000,extra:0,tea:1},false).value,1200);assert.equal(gain(momiji,human,[ne],null,{base:1000,extra:0,tea:1},false).value,1000);
console.log('Real trait regression passed: Kijyo Koyo NFF +20% only in stage 1.');
// A CE locked into a normal slot must never be moved into the free crown slot.
cr=solve(crownData,{...co,cost:28,fixedNormalCes:[1],ces:{...co.ces,1:{...co.ces[1],required:true}}});assert.equal(cr.grandReward,2);assert.deepEqual(cr.ces,[1]);assert.equal(cr.cost,28);
assert.throws(()=>solve(crownData,{...co,cost:28,grandReward:'1',fixedNormalCes:[1]}),/普通槽/);
const selection=require('./dist/selection.js'),empty=selection.emptyFilters();
for(const q of ['C呆','c呆','Ｃ呆','术呆','阿尔托莉雅·卡斯特'])assert.ok(selection.filterItems(d.servants,'servant',empty,q).some(s=>s.no===284),q);
for(const [q,id] of [['宝石翁',34],['万华镜',34],['黑杯',48],['黑色圣杯',48],['黑之圣杯',48]])assert.ok(selection.filterItems(d.catalogCes,'ce',empty,q).some(c=>c.id===id),q);
const sf={...empty,classes:['caster'],rarities:[5],npColors:['Arts']},sr=selection.filterItems(d.servants,'servant',sf,'');assert.ok(sr.length>5);assert.ok(sr.every(s=>s.class==='caster'&&s.rarity===5&&s.npColors.includes('Arts')));
const cf={...empty,rarities:[5],effects:['initialNp']},cc=selection.filterItems(d.catalogCes,'ce',cf,'','costDesc');assert.ok(cc.some(c=>c.id===34));assert.ok(!cc.some(c=>c.id===48));assert.ok(cc.every((c,i)=>!i||cc[i-1].cost>=c.cost));
assert.equal(selection.filterItems(d.catalogCes,'ce',empty,'','levelDesc',{48:80})[0].id,48);assert.equal(selection.filterItems(d.catalogCes,'ce',empty,'not-a-real-ce').length,0);
assert.ok(d.servants.every(s=>Array.isArray(s.aliases)));assert.ok(d.catalogCes.every(c=>Array.isArray(c.aliases)));
console.log('Selection tests passed: real aliases, Unicode/case, multi-axis filtering, NP/effect data, actual level sorting, fixed crown CE constraints.');
// A locked back-row servant must stay in the back even when promoting it gives
// more bond. Compare the constrained result to exhaustive front assignments.
for(let seed=0;seed<20;seed++){
 const data={servants:Array.from({length:5},(_,i)=>make(i+1,1+i,(i+seed)%2?[2821]:[])),ces:[ce]};
 const q={...opts,owned:[1,2,3,4,5],locked:[1],count:3,front:1,cost:18,base:1000,support:0,forms:{},maxed:[],ces:{1:{enabled:true,required:true,mlb:true}},lockedFront:{1:!!(seed%2)}};
 const actual=solve(data,q);let exhaustive=-1;
 for(let j=2;j<=5;j++)for(let k=j+1;k<=5;k++)for(const f of [1,j,k]){if((f===1)!==q.lockedFront[1])continue;const group=[1,j,k].map(id=>data.servants.find(s=>s.id===id));if(group.reduce((n,s)=>n+s.cost,ce.cost)>q.cost)continue;const val=group.reduce((n,s)=>n+gain(s,s.variants[0],[{...ce,e:ce.effects[0]}],null,q,s.id===f).value,0);exhaustive=Math.max(exhaustive,val)}
 assert.equal(actual.total,exhaustive);assert.equal(actual.team.find(g=>g.id===1).front,q.lockedFront[1]);
}
const {place}=require('./dist/placement.js');
const fixedOpts={count:3,order:[0,5,1,2,3,4],locked:[1],reserveSlots:0,manualCombatSlots:[],manualSlots:[{servantId:0,ceId:99,ceLocked:true},{servantId:0,ceId:0},{servantId:1,servantLocked:true,ceId:0},{},{}]};
const placed=place({team:[{id:2,front:true,variant:'base'},{id:3,front:true,variant:'base'},{id:1,front:false,variant:'ascension3'}],ces:[99,330]},fixedOpts);
assert.equal(placed[2].servantId,1);assert.equal(placed[2].servantLocked,true);assert.equal(placed[0].ceId,99);assert.equal(placed[0].ceLocked,true);assert.equal(placed[2].autoForm,'ascension3');assert.equal(new Set(placed.slice(0,3).map(s=>s.servantId)).size,3);
assert.throws(()=>solve(crownData,{...co,front:0,locked:[1],lockedFront:{1:true}}),/没有可行/);
console.log('Position-lock tests passed: 20 constrained exhaustive comparisons, exact slot placement, independent CE lock, impossible front lock.');

const cnCatalog = globalThis.FGO_DATA;
require('./dist/data-jp.js');
const jpCatalog = globalThis.FGO_DATA;
assert.equal(cnCatalog.region, 'CN');
assert.equal(jpCatalog.region, 'JP');
assert.ok(jpCatalog.servants.some(jp => !cnCatalog.servants.some(cn => cn.id === jp.id)));
const chaoticKnights = jpCatalog.ces.find(ce => ce.id === 2509);
assert.ok(chaoticKnights.aliases.includes('迦勒底之人'));
const jpEffect = chaoticKnights.effects.find(effect => effect.mlb);
assert.equal(jpEffect.rate, 20);
assert.ok(matches([301, 2858], jpEffect));
assert.equal(matches([301], jpEffect), false);
assert.equal(jpCatalog.masterCosts[200], 118);
console.log('Regional snapshots, JP search alias, conditional CE and Master Cost passed.');

// Compare exhaustive teams with variable numbers of capped and still-earning guides.
for (let seed=0; seed<40; seed++) {
 const servants = Array.from({length:8}, (_,i)=>make(i+1,1+(i+seed)%4,(i+seed)%3?[2821]:[]));
 const data = {servants,ces:[ce]};
 const opt = {...cfg, base:997, tea:2, count:4, front:seed%4, cost:8+seed%7,
  owned:servants.map(s=>s.id), locked:seed%2?[2]:[], forms:{}, extra:3,
  maxed:[2,4], bond15:[2,3,7], ces:{1:{enabled:true,mlb:true,required:false}}};
 assert.equal(solve(data,opt).total,brute(data,opt),'guide brute seed '+seed);
}
const guideTest = {servants:[1,2,3,4].map(id=>make(id,1,[])),ces:[]};
const guideOpts = {...cfg,owned:[1,2,3,4],locked:[1],objective:'target',cost:3,
 count:3,front:1,base:1000,tea:1,extra:0,support:0,ces:{},maxed:[2,3],bond15:[2,3]};
const guided = solve(guideTest,guideOpts);
assert.equal(guided.guides,2);
assert.equal(guided.team.find(s=>s.id===1).value,1800);
assert.equal(guided.total,1800);
assert.equal(solve(guideTest,{...guideOpts,objective:'team'}).guides,1);
assert.equal(solve(guideTest,{...guideOpts,count:1,owned:[1],bond15:[2,3]}).total,1200);
assert.equal(solve(guideTest,{...guideOpts,count:1,owned:[1],maxed:[],bond15:[1]}).total,1500);
console.log('Bond 15 passive: stacking, target priority, self gain, benched guides, and 40 exhaustive comparisons passed.');

// Fixed observations, independent of the optimizer's scoring implementation.
const supportStarts = [0, 1, 5, 2, 3, 4], supportReserves = [0, 1, 2, 3, 4, 5];
function equipped(data, id, mlb = true) {
 const card = data.ces.find(ce => ce.id === id);
 assert.ok(card, 'missing bond effect on CE ' + id);
 return {...card, e:card.effects.find(e => e.mlb === mlb) || card.effects[0]};
}
for (const data of [cnCatalog, jpCatalog]) {
 const member = data.servants.find(s => s.no === 284);
 const gainAt = (front, options, ces = [], support = null) =>
  gain(member, member.variants[0], ces, support, {base:1000, tea:1, order:supportStarts, ...options}, front).value;
 // Both 8th Anniversary notices: one starting support gives 24% / 4% even without a support CE.
 assert.deepEqual([gainAt(true, {}), gainAt(false, {})], [1240, 1040]);
 assert.deepEqual([gainAt(true, {order:supportReserves}), gainAt(false, {order:supportReserves})], [1200, 1000]);
 const teatime = equipped(data, 910);
 assert.equal(gainAt(true, {base:915}, [], teatime), 1304);
 assert.equal(gainAt(false, {base:915}, [], teatime), 1093);
 assert.equal(gainAt(true, {base:815, order:supportReserves}, [], teatime), 1124);
 const portrait = equipped(data, 108);
 assert.equal(gainAt(true, {tea:2}, [portrait]), 2580);
 assert.equal(gainAt(false, {tea:3}, [], portrait), 3270);
 const fraction = data.ces.find(c => c.effects.some(e => e.mlb && e.rate === 2.5));
 assert.equal(gainAt(true, {base:999, tea:2}, [equipped(data, fraction.id), portrait]), 2636);
 assert.equal(gainAt(true, {extra:490, guides:1, tea:2}, [portrait], teatime), 14980);

 // Southern Africa, base 2636, support Oberon in front. Published settlement:
 // https://silentmajo.blog89.fc2.com/blog-entry-6458.html
 const party = [357,239,284,31,38].map(no => data.servants.find(s => s.no === no).id);
 const observed = solve(data, {...opts, count:5, front:2, order:supportStarts, owned:party, locked:party,
  lockedFront:Object.fromEntries(party.map((id, i) => [id, i < 2])), base:2636, cost:200,
  tea:1, maxed:[], bond15:[], extra:0, support:910, supportMlb:true,
  ces:Object.fromEntries([330,1410,2124,99].map(id => [id,{enabled:true, required:true, mlb:true}]))});
 assert.deepEqual(party.map(id => observed.team.find(g => g.id === id).value), [4298,4298,4161,4161,4161]);
 assert.equal(observed.total, 21079);
}
// At base 915, a team with three own starters gains 252 points from 5%, versus 250 from a portrait.
const rateOrFlat = solve(cnCatalog, {...opts, base:915, count:5, front:3, order:supportReserves,
 cost:200, reserveSlots:4, extra:0, support:0, tea:1, maxed:[], locked:[], bond15:[],
 ces:Object.fromEntries([99,910].map(id => [id,{enabled:true,required:false,mlb:true}]))});
assert.deepEqual(rateOrFlat.ces, [910]);
assert.equal(rateOrFlat.total, 5376);
console.log('Settlement fixtures passed for both regions: formation, rounding, portraits, effect cap, tea and optimal CE.');

// Compare automatic borrowed gear with explicit exhaustive equipment choices.
for (const data of [cnCatalog, jpCatalog]) {
 const member = data.servants.find(s => s.no === 284);
 const basic = {...opts, count:1, front:1, owned:[member.id], locked:[member.id], ces:{},
  maxed:[], forms:{}, grandMode:'off', base:1000, tea:1, order:supportStarts};
 for (const base of [10, 1000]) for (const mlb of [false, true]) {
  const config = {...basic, base, supportMlb:mlb};
  const automatic = solve(data, {...config, support:'auto'});
  const fixed = [0,...data.ces.map(c=>c.id)].map(support=>solve(data,{...config,support}).total);
  assert.equal(automatic.total, Math.max(...fixed));
  assert.equal(solve(data,{...config,support:automatic.support}).total, automatic.total);
 }
}
for (const normal of [0, 1, 'auto']) for (const reward of [0, 2, 'auto']) {
 if(normal!=='auto' && reward!=='auto') continue;
 const opts = {...co, support:normal, supportGrand:true, supportReward:reward, supportRewardMlb:true};
 const r = solve(crownData,opts);
 const totals = [];
 for (const support of normal==='auto'?[0,1,2]:[normal])
  for (const supportReward of reward==='auto'?[0,1,2]:[reward])
   if(!support || support!==supportReward) totals.push(solve(crownData,{...opts,support,supportReward}).total);
 assert.equal(r.total, Math.max(...totals));
 assert.ok(!r.support || r.support!==r.supportReward);
}
console.log('Automatic support gear matches exhaustive fixed picks for both regions, mixed crown slots and MLB states.');

// Explicit equipment subsets form an oracle independent of optional-portrait pruning.
const portraitCards = [
 ...[330,910,99,100,108].map(id=>cnCatalog.ces.find(c=>c.id===id))
];
const smallRoster = [2,4,7,9].map((cost,i)=>({...make(i+1,cost,[]),class:'saber'}));
const portraitData = {servants:smallRoster,ces:portraitCards};
for (let seed=0;seed<60;seed++) {
 const grand = seed%3===0, requiredId = seed%5===0 ? 108 : 0;
 const config = {...co, owned:[1,2,3,4], locked:[1], count:2, front:1, cost:10+seed%31,
  reserveSlots:seed%2, reserveCost:1, base:[400,915,999,1000,1001,2000][seed%6],
  maxed:seed%4===0?[2,3]:[], bond15:seed%4===0?[2]:[], extra:seed%7===0?498:0,
  objective:seed%2?'team':'target',tea:1+seed%3,order:seed%2?supportStarts:supportReserves,
  grandMode:grand?'duel':'off',grandReward:grand && requiredId ? String(requiredId) : 'auto',
  support:0, supportGrand:false, fixedNormalCes:[]};
 const settings = (mask, force) => Object.fromEntries(portraitCards.map((c,i)=>[c.id,{
  enabled:!!(mask & (1<<i)), required:c.id===requiredId || force, mlb:true
 }]));
 let oracle;
 for(let mask=0;mask<32;mask++){
  if(requiredId && !(mask & 16)) continue;
  let row;
  try { row=solve(portraitData,{...config,ces:settings(mask,true)}); }
  catch(error){assert.match(error.message,/Cost|礼装超出/);continue;}
  if(!oracle||row.score>oracle.score||(row.score===oracle.score&&row.cost<oracle.cost))oracle=row;
 }
 const optimized=()=>solve(portraitData,{...config,ces:settings(31,false)});
 if(!oracle){assert.throws(optimized);continue;}
 const result=optimized();
 assert.deepEqual([result.score,result.cost],[oracle.score,oracle.cost],'portrait seed '+seed);
 assert.equal(result.total,result.team.reduce((sum,g)=>sum+g.value,0));
 const equippedIds=[...result.ces,...(result.grandReward?[result.grandReward]:[])];
 const effects=equippedIds.map(id=>equipped(portraitData,id));
 for(const g of result.team){
  const sv=smallRoster.find(s=>s.id===g.id);
  const recalculated=gain({...sv,maxed:config.maxed.includes(g.id)},sv.variants[0],effects,null,{...config,guides:result.guides},g.front);
  assert.deepEqual([g.value,g.flat,g.rate],[recalculated.value,recalculated.flat,recalculated.rate]);
 }
}
console.log('Portrait pruning: 60 independent exhaustive checks of score, minimum cost and individual gains passed.');
const borrowedPair = {servants:[smallRoster[0]], ces:[
 {...portraitCards[1], effects:[{mlb:true, rate:5, supportRate:5, flat:0, clauses:[]}]}, portraitCards[2]
]};
for (const [base,extra,front,expected] of [[999,0,0,99],[1200,0,0,910],[915,0,1,910],[1500,499,1,99],[1800,500,0,99]]) {
 const config = {...opts,count:1,front,base,extra,order:supportReserves,tea:1,owned:[1],locked:[1],ces:{},supportMlb:true};
 const auto = solve(borrowedPair,{...config,support:'auto'});
 assert.equal(auto.support,expected);
 assert.equal(auto.total,Math.max(...[0,99,910].map(support=>solve(borrowedPair,{...config,support}).total)));
 assert.equal(auto.checked,1);
}
