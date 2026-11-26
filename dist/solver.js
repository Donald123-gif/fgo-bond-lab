/* Exact search: enumerate CE subsets, then grouped 0/1 knapsack over servants.
   Every servant appears once; front/back placement is part of the state. */
(function(root){
function effect(ce,mlb=true){return ce.effects.find(e=>e.mlb===mlb)||ce.effects[0]}
function matches(traits,e){return !e.clauses.length||e.clauses.some(row=>row.every(t=>traits.includes(t)))}
function masterCost(l){if(l<=90)return 56+Math.floor((l-1)/2);if(l<=109)return 100+Math.floor((l-89)/3);if(l<=126)return 106+Math.floor((l-107)/4);if(l<140)return 111;return 112+Math.floor((l-140)/10)}
const GUIDANCE_RATE = 25;
const MAX_BOND_RATE = 500;
function formationRate(o, front) {
 const supportIndex = o.order?.indexOf(5) ?? -1;
 return (front ? 20 : 0) + (supportIndex >= 0 && supportIndex < 3 ? 4 : 0);
}
function gain(s, variant, ces, support, o, front) {
 const sources = [];
 let rawRate = 0, flat = 0;
 function add(name, rate, points) {
  if (!rate && !points) return;
  rawRate += rate;
  flat += points;
  sources.push({name, rate, flat:points});
 }
 add('全队额外加成', Number(o.extra) || 0, 0);
 add('绊15 · 梦火指引', (o.guides || 0) * GUIDANCE_RATE, 0);
 for (const ce of ces) {
  if (matches(variant.traits, ce.e)) add(ce.name, ce.e.rate, ce.e.flat);
 }
 const borrowed = Array.isArray(support) ? support : support ? [support] : [];
 for (const ce of borrowed) {
  if (matches(variant.traits, ce.e)) add(ce.sourceLabel || '助战 · ' + ce.name, ce.e.supportRate, ce.e.flat);
 }

 // Formation adjusts the base first. The game floors again after all matching
 // percentage effects, then adds flat bonuses before applying the teapot.
 const positionRate = formationRate(o, front);
 const positionBase = Math.floor(o.base * (100 + positionRate) / 100);
 const rate = Math.min(rawRate, MAX_BOND_RATE);
 // The data encodes rates in tenths of a percent, including 2.5% CEs.
 const ratePoints = Math.floor(positionBase * Math.round(rate * 10) / 1000);
 const value = s.maxed ? 0 : (positionBase + ratePoints + flat) * o.tea;
 return {id:s.id, variant:variant.key, cost:variant.cost, front, value,
  positionRate, positionBase, rawRate, rate, ratePoints, flat, sources};
}
const grandGroups={saber:['saber'],archer:['archer'],lancer:['lancer'],rider:['rider'],caster:['caster'],assassin:['assassin'],berserker:['berserker'],extra1:['ruler','avenger','moonCancer','shielder'],extra2:['alterEgo','foreigner','pretender','beast','beastEresh','unBeastOlgaMarie']};
// Compare the borrowed slots jointly with the owned party. A pair can be
// discarded only if another guarantees at least its points for every eligible form.
function solve(data, o, progress = () => {}) {
 const rewardActive = o.grandMode && o.grandMode !== 'off' && o.supportGrand;
 const reward = rewardActive ? o.supportReward : 0;
 if (o.support !== 'auto' && reward !== 'auto') return solveParty(data, o, progress);
 const owned = new Set(o.owned);
 const classes = o.grandMode && o.grandMode !== 'off' && grandGroups[o.grandGroup];
 const forms = data.servants.filter(s => owned.has(s.id) && (!classes || classes.includes(s.class)))
  .flatMap(s => s.variants);
 function choices(setting, mlb) {
  const cards = setting === 'auto' ? [null, ...data.ces] : [data.ces.find(c => c.id === +setting)];
  return cards.map(card => {
   const e = card && effect(card, mlb);
   const profile = forms.flatMap(v => e && matches(v.traits, e) ? [e.supportRate, e.flat] : [0, 0]);
   return {id:card?.id || 0, profile};
  });
 }
 const normalChoices = choices(o.support, o.supportMlb);
 const rewardChoices = choices(reward, o.supportRewardMlb);
 let pairs = [];
 // Bound all non-borrowed percentage effects before comparing a borrowed
 // percentage against fixed points. At the rate cap an extra 5% can be worth zero.
 const ownSlots = o.count - (o.reserveSlots || 0) + Number(!!classes && o.grandReward !== '0');
 const ownRates = data.ces.filter(c => o.ces[c.id]?.enabled)
  .map(c => effect(c, o.ces[c.id].mlb).rate).sort((a,b) => b-a);
 const guideCount = Math.min(o.count, (o.bond15 || []).filter(id => owned.has(id)).length);
 const minOtherRate = +o.extra || 0;
 const otherRate = minOtherRate + guideCount * GUIDANCE_RATE
  + ownRates.slice(0, ownSlots).reduce((sum, rate) => sum + rate, 0);
 const baseAt = front => Math.floor(o.base * (100 + formationRate(o, front)) / 100);
 const lowBase = baseAt(o.front >= o.count), highBase = baseAt(o.front > 0);
 function dominates(a, b) {
  for (let i = 0; i < a.length; i += 2) {
   const rate = a[i], rival = b[i], flatAdvantage = a[i+1] - b[i+1];
   if (rate >= rival && flatAdvantage >= 0) continue;
   // floor(x + d) - floor(x) >= floor(d), including for a negative d.
   const delta = rate >= rival
    ? Math.min(MAX_BOND_RATE, otherRate + rate) - Math.min(MAX_BOND_RATE, otherRate + rival)
    : Math.min(MAX_BOND_RATE, minOtherRate + rate) - Math.min(MAX_BOND_RATE, minOtherRate + rival);
   const guaranteed = Math.floor((delta >= 0 ? lowBase : highBase) * Math.round(delta * 10) / 1000);
   if (guaranteed + flatAdvantage < 0) return false;
  }
  return true;
 }
 for (const normal of normalChoices) {
  for (const extra of rewardChoices) {
   if (normal.id && normal.id === extra.id) continue;
   const profile = normal.profile.map((n,i) => n + extra.profile[i]);
   if (pairs.some(p => dominates(p.profile, profile))) continue;
   pairs = pairs.filter(p => !dominates(profile, p.profile));
   pairs.push({support:normal.id, supportReward:extra.id, profile});
  }
 }
 let best, checked = 0;
 for (const {support, supportReward} of pairs) {
  const r = solveParty(data, {...o, support, supportReward}, n => progress(checked + n));
  checked += r.checked;
  progress(checked);
  if (!best || r.score > best.score || (r.score === best.score && r.cost < best.cost))
   best = {...r, support, supportReward};
 }
 return {...best, checked};
}
function solveParty(data,o,progress=()=>{}){
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
 const required = available.filter(c => o.ces[c.id].required);
 // All ten Heroic Spirit Portraits have the same cost and unconditional effect.
 // Required cards keep their identities; only interchangeable optional copies are grouped.
 const portraits = [], optional = [];
 for (const c of available.filter(c => !o.ces[c.id].required)) {
  const portrait = c.cost === 5 && c.e.flat === 50 && !c.e.rate && !c.e.clauses.length && !o.fixedNormalCes?.includes(c.id);
  (portrait ? portraits : optional).push(c);
 }
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
 function rewardFor(ces) {
  if (!extraSlot) return null;
  if (+o.grandReward > 0) return ces.find(c => c.id === +o.grandReward);
  return ces.filter(c => !o.fixedNormalCes?.includes(c.id)).sort((a,b) => b.cost-a.cost)[0];
 }
 let subsetBest;
 function evaluate(ces,rawCost){
  subsetBest = null;
  const reward = rewardFor(ces);
  if (ces.length - Number(!!reward) > ceSlots) return;
  const ceCost = rawCost - (reward?.cost || 0), cap = budget - ceCost;
  if (cap < 0) return;
  checked++;
  if (checked % 25 === 0) progress(checked);
  for (let guides = minGuides; guides <= maxGuides; guides++) {
   evaluateParty(ces, reward, ceCost, cap, guides);
  }
  if (subsetBest && improves(subsetBest.score, subsetBest.cost, best)) best = subsetBest;
  return subsetBest;
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
   if (improves(st.score, cost, subsetBest)) {
    subsetBest = {score:st.score,total:st.total,team:st.team,ces:ces.filter(c=>c.id!==reward?.id).map(c=>c.id),grandReward:reward?.id||0,grandId,cost,ceCost,guides};
   }
  }
 }
 // At each depth only try the first interchangeable copy. Deeper levels
 // still allow distinct owned copies to occupy multiple equipment slots.
 const equivalents = optional.map(c => (o.fixedNormalCes || []).includes(c.id)
  ? 'fixed:' + c.id : JSON.stringify([c.cost,c.e.rate,c.e.flat,c.e.clauses]));
 function improves(score, cost, previous) {
  return !previous || score > previous.score || (score === previous.score && cost < previous.cost);
 }
 const earning = new Set(roster.filter(s => !s.maxed).map(s => s.id));
 const priority = new Set(originalLocked.filter(id => earning.has(id)));
 const maxWeight = Math.min(earning.size, N - locked.filter(s => s.maxed).length) + priority.size * scale;

 function considerPortraits(chosen, rawCost, baseline) {
  const limit = Math.min(portraits.length, ceSlots + extraSlot - chosen.length);
  for (let n = 1; n <= limit; n++) {
   const added = portraits.slice(0,n), ces = [...chosen, ...added];
   const reward = rewardFor(ces);
   if (ces.length - Number(!!reward) > ceSlots) continue;
   const equipmentCost = rawCost + n*5 - (reward?.cost || 0);
   const sameTeamCost = baseline.cost + equipmentCost - baseline.ceCost;
   const points = n * 50 * o.tea;
   // Removing optional portraits frees budget. Even the best team for this
   // tighter budget cannot exceed the baseline plus every possible recipient's bonus.
   const upper = baseline.score + maxWeight * points;
   if (!improves(upper, sameTeamCost, best)) continue;
   const recipients = baseline.team.filter(g => earning.has(g.id));
   if (sameTeamCost <= o.cost && recipients.length + priority.size * scale === maxWeight) {
    // This feasible team attains the bound and was already cheapest at its baseline score.
    const sources = added.map(c => ({name:c.name,rate:0,flat:50}));
    best = {...baseline, score:upper, cost:sameTeamCost, ceCost:equipmentCost,
     ces:ces.filter(c => c !== reward).map(c => c.id), grandReward:reward?.id || 0,
     total:baseline.total + points * recipients.length,
     team:baseline.team.map(g => ({...g, value:g.value + (earning.has(g.id) ? points : 0),
      flat:g.flat + n*50, sources:[...g.sources,...sources]}))};
   } else {
    evaluate(ces, rawCost + n*5);
   }
  }
 }
 function walk(start,chosen,cost) {
  const baseline = evaluate(chosen,cost);
  if (!baseline) return;
  if (chosen.length >= ceSlots + extraSlot) return;
  const tried = new Set();
  for (let i=start;i<optional.length;i++) {
   if (tried.has(equivalents[i])) continue;
   tried.add(equivalents[i]);
   const c = optional[i];
   if (cost+c.cost <= budget+(extraSlot?12:0)) walk(i+1,[...chosen,c],cost+c.cost);
  }
  considerPortraits(chosen, cost, baseline);
 }
 walk(0,required,required.reduce((a,c)=>a+c.cost,0));if(!best)throw Error('当前 Cost 下没有可行队伍。请减少必选项、降低预留费用或提高 Cost 上限。');return {...best,checked};
}
root.BondSolver={GUIDANCE_RATE,effect,matches,masterCost,gain,solve,grandGroups};if(typeof module!=='undefined')module.exports=root.BondSolver;
})(globalThis);
