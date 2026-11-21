/* Exact search: enumerate CE subsets, then grouped 0/1 knapsack over servants.
   Every servant appears once; front/back placement is part of the state. */
(function(root){
function effect(ce,mlb=true){return ce.effects.find(e=>e.mlb===mlb)||ce.effects[0]}
function matches(traits,e){return !e.clauses.length||e.clauses.some(row=>row.every(t=>traits.includes(t)))}
function masterCost(l){if(l<=90)return 56+Math.floor((l-1)/2);if(l<=109)return 100+Math.floor((l-89)/3);if(l<=126)return 106+Math.floor((l-107)/4);if(l<140)return 111;return 112+Math.floor((l-140)/10)}
const GUIDANCE_RATE = 25;
function gain(s,variant,ces,support,o,front){const guidanceRate = (o.guides || 0) * GUIDANCE_RATE;
 let rate=(+o.extra||0)+guidanceRate,flat=0,sources=[];
 if (guidanceRate) sources.push({name:'绊15 · 梦火指引',rate:guidanceRate,flat:0});
 for(const c of ces){if(matches(variant.traits,c.e)){rate+=c.e.rate;flat+=c.e.flat;if(c.e.rate||c.e.flat)sources.push({name:c.name,rate:c.e.rate,flat:c.e.flat})}}for(const sup of (Array.isArray(support)?support:(support?[support]:[]))){if(matches(variant.traits,sup.e)){rate+=sup.e.supportRate;flat+=sup.e.flat;sources.push({name:sup.sourceLabel||'助战 · '+sup.name,rate:sup.e.supportRate,flat:sup.e.flat})}}let raw=o.base+Math.floor(o.base*rate/100+1e-8)+flat;let value=Math.floor(raw*(front?1.2:1)+1e-8)*o.tea;if(s.maxed)value=0;return {value,rate,flat,sources,front,variant:variant.key,cost:variant.cost,id:s.id}}
const grandGroups={saber:['saber'],archer:['archer'],lancer:['lancer'],rider:['rider'],caster:['caster'],assassin:['assassin'],berserker:['berserker'],extra1:['ruler','avenger','moonCancer','shielder'],extra2:['alterEgo','foreigner','pretender','beast','beastEresh','unBeastOlgaMarie']};
function solve(data,o,progress=()=>{}){
 o={...o,locked:[...o.locked],ces:structuredClone(o.ces)};
 const grand=!!o.grandMode&&o.grandMode!=='off',grandId=grand?+o.grandId:0;
 const originalLocked=[...o.locked];
 if(grand){
  const gs=data.servants.find(s=>s.id===grandId);
  if(!gs||!o.owned.includes(grandId))throw Error('请从候选池中选择已完成冠位选定的自有从者。');
  const group = o.grandGroup;
  {
   const classes=grandGroups[group];
   if(!classes||!classes.includes(gs.class))throw Error('自有冠位从者不符合当前戴冠战职阶限制。');
   if(o.locked.some(id=>!classes.includes(data.servants.find(s=>s.id===id)?.class)))throw Error('必选从者与戴冠战职阶限制冲突。');
   o.owned=o.owned.filter(id=>classes.includes(data.servants.find(s=>s.id===id)?.class));
  }
  if(!o.locked.includes(grandId))o.locked.push(grandId);
  if(+o.grandReward>0){if((o.fixedNormalCes||[]).includes(+o.grandReward))throw Error('该礼装已固定在普通槽，不能同时装备冠位报酬槽。');if(!o.ces[o.grandReward]?.enabled)throw Error('指定的冠位报酬礼装必须勾选为候选。');o.ces[o.grandReward].required=true}
 }
 const extraSlot=grand&&o.grandReward!=='0'?1:0;
 const N=+o.count,F=Math.min(+o.front,N),budget=+o.cost-(+o.reserveCost||0),ceSlots=N-(+o.reserveSlots||0);
 if(!Number.isInteger(N)||N<1||N>5||!Number.isInteger(budget)||budget<0||ceSlots<0)throw Error('编队人数、预留 Cost 或礼装槽位无效。');
 const guideIds = new Set(o.bond15 || []);
 const roster=data.servants.filter(s=>o.owned.includes(s.id)).map(s=>({...s,maxed:o.maxed.includes(s.id),guide:guideIds.has(s.id)}));
 const locked=roster.filter(s=>o.locked.includes(s.id)),free=roster.filter(s=>!o.locked.includes(s.id));
 if(locked.length!==o.locked.length)throw Error('必选从者必须在候选池中。');
 if(locked.length>N)throw Error('必选从者数量超过自有编队人数。');if(roster.length<N)throw Error('候选从者不足，请增加候选或减少人数。');
 if(o.objective==='target'&&!originalLocked.length)throw Error('优先刷指定从者时，请先将至少一名从者设为必选。');
 const available=data.ces.filter(c=>o.ces[c.id]?.enabled).map(c=>({...c,e:effect(c,o.ces[c.id].mlb)}));
 const required=available.filter(c=>o.ces[c.id].required),optional=available.filter(c=>!o.ces[c.id].required);
 if(required.length>ceSlots+extraSlot)throw Error('必选礼装超出剩余礼装槽位。');
 let support=data.ces.find(c=>c.id===+o.support);if(support)support={...support,e:effect(support,o.supportMlb)};
 if(grand&&o.supportGrand&&+o.supportReward){
  const c=data.ces.find(c=>c.id===+o.supportReward);
  if(!c)throw Error('助战冠位报酬礼装无效。');
  if(+o.support===+o.supportReward)throw Error('当前按每种礼装一张建模：助战普通槽和报酬槽请选择不同礼装。');
  const sup={...c,e:effect(c,o.supportRewardMlb),sourceLabel:'助战报酬槽 · '+c.name};support=support?[support,sup]:[sup];
 }
 let best=null,checked=0;const scale=o.objective==='target'?100000000:0;
 const variants=s=>o.forms[s.id]&&o.forms[s.id]!=='auto'?s.variants.filter(v=>v.key===o.forms[s.id]||v.rawKeys?.includes(o.forms[s.id])):s.variants.filter(v=>!v.key.startsWith('costume')||o.costumes);
 function options(s,ces,settings){let rows=[];for(const v of variants(s)){for(let front=0;front<=1;front++){if(front&&!F)continue;if(o.lockedFront?.[s.id]!==undefined&&!!front!==o.lockedFront[s.id])continue;let g=gain(s,v,ces,support,settings,!!front);rows.push({...g,score:g.value*(1+(originalLocked.includes(s.id)?scale:0))})}}return rows}
 function evaluate(ces,rawCost){let reward=null;if(extraSlot){reward=+o.grandReward>0?ces.find(c=>c.id===+o.grandReward):ces.filter(c=>!(o.fixedNormalCes||[]).includes(c.id)).sort((a,b)=>b.cost-a.cost)[0];}if(ces.length-(reward?1:0)>ceSlots)return;let ceCost=rawCost-(reward?.cost||0);checked++;if(checked%25===0)progress(checked);let cap=budget-ceCost;if(cap<0)return;
  for (let guides = minGuides; guides <= maxGuides; guides++) {
   evaluateParty(ces, reward, ceCost, cap, guides);
  }
 }
 const lockedGuides = locked.filter(s => s.guide).length;
 const freeGuides = free.filter(s => s.guide).length;
 const openSlots = N - locked.length;
 const minGuides = lockedGuides + Math.max(0, openSlots - (free.length - freeGuides));
 const maxGuides = lockedGuides + Math.min(openSlots, freeGuides);
 function evaluateParty(ces, reward, ceCost, cap, guides) {
  // With a fixed number of active passives, each member's rounded gain is independent.
  const settings = {...o, guides};
  const buckets = new Map();
  for (const servant of free) {
   const quota = servant.guide ? guides - lockedGuides : openSlots - (guides - lockedGuides);
   if (!quota) continue;
   for (const row of options(servant, ces, settings)) {
    const key = [row.cost, row.front, servant.guide].join(',');
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push({servant, row, quota});
   }
  }
  const keep = new Set();
  for (const rows of buckets.values()) {
   rows.sort((a,b) => b.row.score - a.row.score || a.servant.no - b.servant.no);
   const ids = new Set();
   for (const {servant, quota} of rows) {
    ids.add(servant.id);
    keep.add(servant.id);
    if (ids.size >= quota) break;
   }
  }
  const candidates = [...locked, ...free.filter(s => keep.has(s.id))];
  let dp = new Map([['0,0,0,0', {score:0,total:0,team:[],n:0,f:0,c:0,guides:0}]]);
  for (const servant of candidates) {
   const next = o.locked.includes(servant.id) ? new Map() : new Map(dp);
   const rows = options(servant, ces, settings);
   for (const st of dp.values()) {
    const n = st.n + 1;
    const active = st.guides + Number(servant.guide);
    if (n > N || active > guides || n - active > N - guides) continue;
    for (const g of rows) {
     const c = st.c + g.cost, f = st.f + Number(g.front);
     if (c > cap || f > F || n - f > N - F) continue;
     const key = n+','+f+','+c+','+active;
     const score = st.score + g.score;
     if (!next.has(key) || score > next.get(key).score) {
      next.set(key, {score, total:st.total+g.value, team:[...st.team,g], n,f,c,guides:active});
     }
    }
   }
   dp = next;
   if (!dp.size) return;
  }
  for (const st of dp.values()) {
   if (st.n !== N || st.f !== F || st.guides !== guides) continue;
   const cost = st.c + ceCost + (+o.reserveCost || 0);
   if (!best || st.score > best.score || (st.score === best.score && cost < best.cost)) {
    best = {score:st.score,total:st.total,team:st.team,ces:ces.filter(c=>c.id!==reward?.id).map(c=>c.id),grandReward:reward?.id||0,grandId,cost,ceCost,guides};
   }
  }
 }
 // At each depth only try the first interchangeable copy. Deeper levels
 // still allow distinct owned copies to occupy multiple equipment slots.
 const equivalents = optional.map(c => (o.fixedNormalCes || []).includes(c.id)
  ? 'fixed:' + c.id : JSON.stringify([c.cost,c.e.rate,c.e.flat,c.e.clauses]));
 function walk(start,chosen,cost) {
  evaluate(chosen,cost);
  if (chosen.length >= ceSlots + extraSlot) return;
  const tried = new Set();
  for (let i=start;i<optional.length;i++) {
   if (tried.has(equivalents[i])) continue;
   tried.add(equivalents[i]);
   const c = optional[i];
   if (cost+c.cost <= budget+(extraSlot?12:0)) walk(i+1,[...chosen,c],cost+c.cost);
  }
 }
 walk(0,required,required.reduce((a,c)=>a+c.cost,0));if(!best)throw Error('当前 Cost 下没有可行队伍。请减少必选项、降低预留费用或提高 Cost 上限。');return {...best,checked};
}
root.BondSolver={GUIDANCE_RATE,effect,matches,masterCost,gain,solve,grandGroups};if(typeof module!=='undefined')module.exports=root.BondSolver;
})(globalThis);
