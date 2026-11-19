'use strict';
const D=FGO_DATA,$=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const classNames={saber:'Saber',archer:'Archer',lancer:'Lancer',rider:'Rider',caster:'Caster',assassin:'Assassin',berserker:'Berserker',ruler:'Ruler',avenger:'Avenger',moonCancer:'Moon Cancer',alterEgo:'Alter Ego',foreigner:'Foreigner',pretender:'Pretender',shielder:'Shielder',beast:'Beast',beastEresh:'Beast',unBeastOlgaMarie:'UnBeast'};
const traits={300:'秩序',301:'混沌',302:'中立',303:'善',304:'恶',305:'中庸',306:'夏',2821:'兽科',203:'星之力',2654:'活在当下',2780:'持有灵衣',2:'女性',1:'男性',2883:'FSN从者'};
const effectNames={bond:'牵绊提升',initialNp:'初始 NP',attack:'攻击强化',npDamage:'宝具威力',critical:'暴击 / 星',event:'活动加成',reward:'其他报酬'};
const icons={saber:'M16 3 20 8 17 22 22 25 20 28 15 24 9 30 6 27 12 21 8 16 11 14 14 19 14 6Z',archer:'M8 3Q30 17 8 31L13 17Z M4 17H29 M24 12L29 17 24 22',lancer:'M23 2 28 12 22 11 7 32 4 30 19 9 16 5Z',rider:'M6 28V19L12 8 23 5 28 14 19 16 18 24 25 29Z M12 8 12 3 17 6',caster:'M6 29 22 8 M16 5 22 1 28 5 28 11 22 15 16 11Z M3 26 9 32',assassin:'M8 9Q16 0 24 9L27 20 21 29 11 29 5 20Z M10 16 14 18 M22 16 18 18 M13 24H19',berserker:'M8 5 16 12 24 5 28 18 22 29 10 29 4 18Z M10 16 14 19 M22 16 18 19',shielder:'M5 5 16 2 27 5 26 20 16 32 6 20Z M16 5V26 M9 14H23'};
function classIcon(c){return `<svg class="class-icon" viewBox="0 0 34 34" aria-label="${esc(classNames[c]||c)}"><path d="${icons[c]||'M17 2 21 12 32 17 21 22 17 32 12 22 2 17 12 12Z M17 10 24 17 17 24 10 17Z'}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`}
const ids=['level','cost','base','count','front','support','supportMlb','objective','extra','tea','reserveSlots','reserveCost','costumes','grandMode','grandGroup','grandId','grandReward','grandBond','supportGrand','supportReward','supportRewardMlb'];
const partyStorageKey = D.region === 'CN' ? 'chaldea-bond-v1' : 'chaldea-bond-v1-' + D.region;
const pickerStorageKey = D.region === 'CN' ? 'fgo-picker-preferences' : 'fgo-picker-preferences-' + D.region;
const initial=()=>({owned:D.servants.filter(s=>!s.mash).map(s=>s.id),locked:[],maxed:[],forms:{},ceLevels:{},order:[0,1,5,2,3,4],svtLevels:{},manualSlots:Array.from({length:5},()=>({servantId:0,ceId:0})),supportServant:0,supportCombatCe:0,ces:Object.fromEntries(D.ces.map(c=>[c.id,{enabled:[1949,2020,2052,2124,2142,2209,2233,2437,330,910,99].includes(c.id),mlb:true,required:false}]))});
let state=initial(),worker=null,last=null,dirty=false;
try{const saved=JSON.parse(localStorage.getItem(partyStorageKey));if(saved){state={...state,...saved};state.owned=state.owned.filter(id=>D.servants.some(s=>s.id===id));state.locked=state.locked.filter(id=>state.owned.includes(id));state.ces={...initial().ces,...state.ces};if(!saved.manualSlots)state.manualSlots=Array.from({length:5},(_,i)=>({servantId:state.locked[i]||0,ceId:0}));}}catch{}
if(!Array.isArray(state.order)||state.order.length!==6||new Set(state.order).size!==6||state.order.some(x=>!Number.isInteger(x)||x<0||x>5))state.order=[0,1,5,2,3,4];
const getCE=id=>D.catalogCes.find(c=>c.id===+id),getSvt=id=>D.servants.find(s=>s.id===+id),getBond=id=>D.ces.find(c=>c.id===+id);
for(const sl of state.manualSlots){if(!getSvt(sl.servantId))sl.servantId=0;if(!getCE(sl.ceId))sl.ceId=0}
const ceOptions=D.ces.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
$('support').innerHTML='<option value="0">不带牵绊礼装</option>'+ceOptions;$('support').value='910';
$('grandReward').innerHTML='<option value="auto">自动选择最优报酬礼装</option><option value="0">不带牵绊加成礼装</option>'+ceOptions;
$('supportReward').innerHTML='<option value="0">不带牵绊加成礼装</option>'+ceOptions;$('supportReward').value='330';
function fillGrand(){const old=$('grandId').value||state.inputs?.grandId||'0';$('grandId').innerHTML='<option value="0">请选择已戴冠从者</option>'+D.servants.filter(s=>state.owned.includes(s.id)).map(s=>`<option value="${s.id}">${esc(s.name)} · ${classNames[s.class]||s.class}</option>`).join('');$('grandId').value=old;}
fillGrand();
for(const [id,key] of Object.entries(state.forms)){const sv=getSvt(id);if(key!=='auto'&&!sv?.variants.some(v=>v.key===key||v.rawKeys?.includes(key)))state.forms[id]='auto';else if(key!=='auto')state.forms[id]=sv.variants.find(v=>v.key===key||v.rawKeys?.includes(key)).key}
for(const id of ids){if(state.inputs?.[id]!==undefined){if($(id).type==='checkbox')$(id).checked=state.inputs[id];else $(id).value=state.inputs[id]}$(id).addEventListener('change',()=>{if(id==='level'){const l=+$(id).value;if(Number.isInteger(l)&&l>=1&&l<=+$('level').max)$('cost').value=D.masterCosts?.[l] ?? BondSolver.masterCost(l)}if(id==='support')state.supportCombatCe=0;changed()})}
function inputs(){return Object.fromEntries(ids.map(id=>[id,$(id).type==='checkbox'?$(id).checked:$(id).value]))}
function save(){try{localStorage.setItem(partyStorageKey,JSON.stringify({...state,inputs:inputs()}))}catch{}}
function updateGrand(){$('grandToggle').checked=$('grandMode').value!=='off';$('grandSettings').hidden=$('grandMode').value==='off';$('grandGroup').disabled=$('grandMode').value!=='duel';}
$('grandToggle').onchange=()=>{if($('grandToggle').checked)$('grandMode').value=state.lastGrandMode||'duel';else{state.lastGrandMode=$('grandMode').value;$('grandMode').value='off'}changed()};
function changed(){state.locked=[...new Set(state.manualSlots.filter(s=>s.servantLocked||!s.autoServant).map(s=>s.servantId).filter(Boolean))];updateGrand();save();dirty=true;if(worker){worker.terminate();worker=null;$('calculate').disabled=false;$('cancel').hidden=true;$('status').textContent='条件已变更，请重新计算。'}$('resultBadge').textContent='当前编队 · 可重新优化';renderParty();renderPools();}
function notify(msg){(document.querySelector('dialog[open]:last-of-type')||document.querySelector('dialog[open]')||document.body).append($('toast'));$('toast').textContent=msg;$('toast').hidden=false;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('toast').hidden=true,3500)}
function tags(s,v){const chosen=s.variants.find(v=>v.key===state.forms[s.id]);return (v||chosen?.traits||s.traits).filter(t=>traits[t]).map(t=>`<span class="tag ${t===2821?'special':''}">${traits[t]}</span>`).join('')}
function fixedRewardUses(id) {
 return Boolean(id) && $('grandMode').value !== 'off' && Number($('grandReward').value) === id;
}
function renderParty(){
 const n=+$('count').value,on=$('grandMode').value!=='off',grandId=+$('grandId').value;
 if(on&&grandId&&!state.manualSlots.some(sl=>sl.servantId===grandId)){const empty=state.manualSlots.slice(0,n).find(sl=>!sl.servantId);if(empty)empty.servantId=grandId;}
 let crownIndex=state.manualSlots.findIndex(sl=>sl.servantId&&sl.servantId===grandId);if(on&&crownIndex<0&&!grandId)crownIndex=Math.max(0,state.manualSlots.slice(0,n).findIndex(sl=>!sl.servantId));
 if (on) {
  const reward = $('grandReward');
  const active = state.manualSlots.slice(0,n);
  if (active.some(slot => fixedRewardUses(slot.ceId))) {
   reward.value = 'auto';
   state.resolvedReward = 0;
   notify('普通槽已装备同一张礼装，冠位报酬槽已恢复自动选优。');
   save();
  } else if (reward.value === 'auto' && state.resolvedReward && active.some(slot => slot.ceId === state.resolvedReward)) {
   state.resolvedReward = 0;
   save();
  }
 }
 let fixed=0;
 function normalCE(c,i,support=false){return `<div class="equipment-row"><span class="equipment-label">概念礼装</span><button class="ce-slot ${c?'filled':''}" data-pick="${support?'support':'ce'}" ${support?'':`data-slot="${i}"`} ${!support&&i>=n?'disabled':''} title="${esc(c?.name||'选择礼装')}" aria-label="${support?'助战':'第'+(i+1)+'位'}礼装：${esc(c?.name||'未装备')}">${c?ceSlotArt(c,support?0:c.cost,support?$('supportMlb').checked:undefined):'<span class="ce-plus">＋</span><small>选择礼装</small>'}</button></div>`}
 function extras(support=false){const key=support?'supportReward':'grandReward',c=getCE($(key).value==='auto'?state.resolvedReward:$(key).value);return `<div class="equipment-row extra-equipment"><span class="equipment-label">报酬礼装 <em>COST 0</em></span><button class="ce-slot ${c?'filled':''}" data-grand-pick="${key}" title="${esc(c?.name||'选择报酬礼装')}" aria-label="${support?'助战':'自有'}报酬礼装：${esc(c?.name||'自动或未装备')}">${c?ceSlotArt(c,0,support?$('supportRewardMlb').checked:undefined):`<span class="ce-plus">${$(key).value==='auto'?'✧':'＋'}</span><small>${$(key).value==='auto'?'自动选优':'选择礼装'}</small>`}</button>${support?'':'<button class="reward-auto" data-auto-reward>自动选优</button>'}</div><div class="equipment-row extra-equipment"><span class="equipment-label">牵绊礼装 <em>COST 0</em></span>${support?'<div class="bond-slot"><span>◇</span><small>助战自身十绊</small></div>':`<label class="bond-slot"><span>◇</span><select data-grand-bond aria-label="自身牵绊礼装效果">${[...$('grandBond').options].map(o=>`<option value="${o.value}" ${o.selected?'selected':''}>${{none:'未装备',np:'开局 NP50%',original:'原有效果'}[o.value]}</option>`).join('')}</select></label>`}</div>`}
 const cards=state.manualSlots.map((sl,i)=>{const s=getSvt(sl.servantId),c=getCE(sl.ceId),v=s?.variants.find(v=>v.key===(state.forms[s.id]&&state.forms[s.id]!=='auto'?state.forms[s.id]:sl.autoForm)),crown=on&&i===crownIndex;if(i<n)fixed+=(v?.cost??s?.cost??0)+(c?.cost||0);return `<article class="party-slot ${i>=n?'inactive':''} ${crown?'crowned':''}"><div class="slot-number">${String(i+1).padStart(2,'0')} <span>${crown?'♛ GRAND':i>=n?'不出击':s?(sl.autoServant?'AUTO':'固定'):'AUTO'}</span></div><button class="servant-slot ${s?'filled':''} rarity-${s?.rarity||0}" ${crown?'data-grand-pick="grandServant"':'data-pick="servant"'} data-slot="${i}" ${i>=n?'disabled':''} aria-label="${crown?'选择冠位从者':'选择从者 '+(i+1)}">${s?`<img src="${esc(v?.image||s.image)}" alt="${esc(s.name)}" loading="lazy"><span class="card-shade"></span><span class="card-class">${classIcon(s.class)}</span><span class="card-stars">${'★'.repeat(s.rarity)||'☆'}</span><span class="card-name">${esc(s.name)}</span><span class="slot-cost">COST ${v?.cost??s.cost}</span>`:`<span class="empty-sigil">${crown?'♛':'＋'}</span><strong>${crown?'选择冠位从者':'选择从者'}</strong><small>${crown?'已完成冠位选定':'留空 · 自动补全'}</small>`}</button>${s?`<select data-form="${s.id}" class="slot-form" aria-label="${esc(s.name)}形态"><option value="auto">最优灵基 · 自动</option>${s.variants.map(x=>`<option value="${x.key}" ${state.forms[s.id]===x.key?'selected':''}>${esc(x.label)}</option>`).join('')}</select>`:'<div class="slot-form placeholder">灵基形态随结果注明</div>'}${normalCE(c,i)}${crown?extras():on&&s&&i<n?`<button class="set-grand" data-crown="${s.id}">♛ 设为冠位</button>`:''}</article>`});
 const support=getSvt(state.supportServant),ce=getCE(state.supportCombatCe||+$('support').value),supportCrown=on&&$('supportGrand').checked;
 cards.push(`<article class="party-slot support-slot ${supportCrown?'crowned':''}"><div class="slot-number">SUPPORT <span>${supportCrown?'♛ GRAND':'助战'}</span></div><button class="servant-slot ${support?'filled':''}" data-pick="supportServant" aria-label="选择助战从者">${support?`<img src="${esc(support.image)}" alt="${esc(support.name)}"><span class="card-shade"></span><span class="card-class">${classIcon(support.class)}</span><span class="card-stars">${'★'.repeat(support.rarity)}</span><span class="card-name">${esc(support.name)}</span>`:'<span class="empty-sigil">✦</span><strong>选择助战</strong><small>按通关需求选择</small>'}</button><div class="slot-form placeholder">助战不占用 COST</div>${normalCE(ce,5,true)}${supportCrown?extras(true):''}</article>`);
 $('partyGrid').innerHTML=state.order.map(i=>cards[i]).join('');decorateBoard();
}
function renderPools(){$('servantCount').textContent=`${state.owned.length} 位候选`;$('ceCount').textContent=`${Object.values(state.ces).filter(c=>c.enabled).length} / 12 种`;$('poolSummary').innerHTML=D.ces.filter(c=>state.ces[c.id]?.enabled).map(c=>`<span class="chip">${esc(c.name)}${state.ces[c.id].required?' · 必带':''}</span>`).join('');fillGrand();}
$('partyGrid').onclick=e=>{if(Date.now()<dragClickUntil||e.target.closest('[data-drag],[data-lock]'))return;const crown=e.target.closest('[data-crown]');if(crown){$('grandId').value=crown.dataset.crown;changed();return}if(e.target.closest('[data-auto-reward]')){$('grandReward').value='auto';changed();return}const b=e.target.closest('[data-pick],[data-grand-pick]');if(!b)return;const target=b.dataset.grandPick||b.dataset.pick;openPicker(['servant','supportServant','grandServant'].includes(target)?'servant':'ce',{target,index:b.hasAttribute('data-slot')?+b.dataset.slot:undefined})};
$('partyGrid').onchange=e=>{if(e.target.dataset.svtLevel){const input = e.target;
 const level = Math.max(1, Math.min(120, Math.trunc(+input.value) || 1));
 input.value = level;
 state.svtLevels[input.dataset.svtLevel] = level;
 save();
 return}if(e.target.hasAttribute('data-grand-bond')){$('grandBond').value=e.target.value;changed()}else if(e.target.dataset.form){state.forms[+e.target.dataset.form]=e.target.value;changed()}};
$('manageServants').onclick=()=>openPicker('servant',{target:'pool'});$('manageCes').onclick=()=>openPicker('ce',{target:'cePool'});
$('clearParty').onclick=()=>{state.manualSlots=initial().manualSlots;$('grandId').value='0';state.resolvedReward=0;changed()};
function request(){let o={...inputs(),...state,ces:structuredClone(state.ces),manualSlots:state.manualSlots.map(sl=>({...sl,servantId:sl.autoServant&&!sl.servantLocked?0:sl.servantId,ceId:sl.autoCE&&!sl.ceLocked?0:sl.ceId}))};for(const id of ['level','cost','base','count','front','support','extra','tea','reserveSlots','reserveCost','grandId','supportReward'])o[id]=+$(id).value;for(const id of ids){const el=$(id);if(el.type==='number'&&!el.checkValidity())throw Error('请检查输入范围：'+el.parentElement.textContent.trim())}o.front=state.order.slice(0,3).filter(i=>i<o.count).length;if(o.front>o.count)throw Error('自有前排人数不能超过自有从者人数。');if(o.manualSlots.slice(o.count).some(s=>s.servantId||s.ceId))throw Error('未出击的卡位仍有固定配置，请清空对应槽位或增加自有从者人数。');
 o.locked=state.manualSlots.filter(s=>s.servantLocked||!s.autoServant).map(s=>s.servantId).filter(Boolean);if(new Set(o.locked).size!==o.locked.length)throw Error('自有从者不能重复入队。');o.order=[...state.order];o.lockedFront=Object.fromEntries(state.manualSlots.map((sl,i)=>[sl,i]).filter(([sl])=>sl.servantLocked&&sl.servantId).map(([sl,i])=>[sl.servantId,state.order.indexOf(i)<3]));o.fixedNormalCes=[];o.manualCombatSlots=[];const seen=new Set();for(const [index,sl] of o.manualSlots.entries()){if(!sl.ceId)continue;const c=getCE(sl.ceId);if(seen.has(c.id))throw Error('每种自有礼装按一张建模，不能重复装备。');seen.add(c.id);if(getBond(c.id)){o.ces[c.id].enabled=true;o.ces[c.id].required=true;o.fixedNormalCes.push(c.id)}else{o.reserveSlots++;o.reserveCost+=c.cost;o.manualCombatSlots.push({index,servantId:sl.servantId,ceId:c.id})}}
 if(o.reserveSlots>o.count)throw Error('已选战斗礼装与额外预留槽位超过自有从者人数。');if(Object.values(o.ces).filter(x=>x.enabled).length>12)throw Error('候选牵绊礼装最多12种（含固定槽位），请在候选配置中减少一种。');if(o.grandMode==='duel'&&state.supportServant&&!BondSolver.grandGroups[o.grandGroup].includes(getSvt(state.supportServant).class))throw Error('所选助战从者不符合当前戴冠战职阶限制。');return o;}
$('calculate').onclick=()=>{try{const o=request();worker?.terminate();worker=new Worker('worker.js?v=11&region=' + D.region);$('calculate').disabled=true;$('cancel').hidden=false;$('status').textContent='正在搜索符合限制的队伍…';worker.onmessage=({data})=>{if(data.progress){$('status').textContent=`已搜索 ${data.progress.toLocaleString()} 种礼装组合…`;return}$('calculate').disabled=false;$('cancel').hidden=true;worker.terminate();worker=null;if(data.error){showError(data.error);return}last={result:data.result,options:o};dirty=false;renderResult();
 if (phoneLayout.matches) document.querySelector('.board-summary').scrollIntoView({block:'center'});
 $('status').textContent=`完成：已搜索 ${data.result.checked.toLocaleString()} 种礼装组合。`;save()};worker.onerror=()=>{showError('计算线程启动失败，请刷新后重试。');$('calculate').disabled=false;$('cancel').hidden=true;worker?.terminate();worker=null};worker.postMessage(o)}catch(e){showError(e.message)}};
function showError(msg){$('status').textContent=msg;$('resultBadge').textContent='需要调整条件';notify(msg)}
$('cancel').onclick=()=>{worker?.terminate();worker=null;$('calculate').disabled=false;$('cancel').hidden=true;$('status').textContent='计算已停止。'};
$('reset').onclick=()=>{localStorage.removeItem(partyStorageKey);location.reload()};
$('counts').textContent=`${D.servants.length} 位从者 · ${D.catalogCes.length.toLocaleString()} 张礼装`;$('dataDate').textContent=D.retrieved.replaceAll('-','.');renderParty();renderPools();updateGrand();

function ceSlotArt(c,cost,mlb){mlb=mlb??state.ces[c.id]?.mlb??state.ceMlb?.[c.id]??false;return `<span class="ce-compact"><img src="${esc(c.image)}" alt=""><span class="ce-numbers"><small>Lv.${state.ceLevels[c.id]||1} · COST ${cost}</small><small class="${mlb?'mlb':'unbroken'}">${mlb?'◆ ◆ ◆ ◆ 满破':'◇ ◇ ◇ ◇ 未满破'}</small></span></span>`}

const mobilePanels = {party: '.party-panel', settings: '.settings', pool: '.pool-panel'};
for (const button of document.querySelectorAll('[data-mobile-link]')) {
 button.onclick = () => document.querySelector(mobilePanels[button.dataset.mobileLink]).scrollIntoView({block:'start'});
}
const quickCalculate = $('mobileCalculate');
quickCalculate.onclick = () => $('calculate').click();
new MutationObserver(() => {
 quickCalculate.disabled = $('calculate').disabled;
 quickCalculate.textContent = quickCalculate.disabled ? '计算中…' : '计算最优';
}).observe($('calculate'), {attributes:true, attributeFilter:['disabled']});

for (const button of document.querySelectorAll('[data-jump-slot]')) {
 button.onclick = () => {
  const panel = document.querySelector('.board-scroll');
  const slot = $('partyGrid').children[Number(button.dataset.jumpSlot)];
  const offset = slot.getBoundingClientRect().left - panel.getBoundingClientRect().left;
  panel.scrollLeft += offset;
 };
}
