let dragClickUntil=0;
function decorateBoard(){
 const rows=[...$('partyGrid').children],on=$('grandMode').value!=='off';
 rows.forEach((el,pos)=>{const idx=state.order[pos],support=idx===5,sl=state.manualSlots[idx],s=getSvt(support?state.supportServant:sl.servantId);el.dataset.position=pos;el.dataset.member=idx;el.classList.add(pos<3?'main-member':'sub-member');el.querySelector('.slot-number').insertAdjacentHTML('afterbegin',`<button class="drag-handle" data-drag="${pos}" title="拖动换位；也可点击两个手柄交换" aria-label="移动第${pos+1}位">⠿ ${pos+1}</button>`);const num=el.querySelector('.slot-number');[...num.childNodes].filter(n=>n.nodeType===3).forEach(n=>n.remove());if(s){el.querySelector('.servant-slot').insertAdjacentHTML('afterend',`<label class="servant-level">Lv.<input type="number" min="1" max="120" value="${state.svtLevels[s.id]||1}" data-svt-level="${s.id}" aria-label="${esc(s.name)}等级"><small>${support?'助战':sl.autoServant?'自动补全':'已固定'}</small></label>`)}else el.querySelector('.servant-slot').insertAdjacentHTML('afterend','<div class="servant-level"><small>等待选择</small></div>');});
 rows.forEach((el,pos)=>{const idx=state.order[pos],sl=state.manualSlots[idx],support=idx===5,sv=getSvt(support?state.supportServant:sl.servantId),ce=ceAt(idx);
 function lockButton(kind,locked,hasItem){return `<button class="position-lock ${locked?'locked':''}" data-lock="${kind}" aria-pressed="${locked}" ${hasItem?'':'disabled'} title="${locked?'解除':'启用'}${kind==='servant'?'从者':'礼装'}位置锁定（约束最优计算）" aria-label="${pos+1}号${kind==='servant'?'从者':'礼装'}位置锁定">${locked?'🔒':'🔓'}</button>`}
 el.querySelector('.slot-number').insertAdjacentHTML('beforeend',lockButton('servant',!!(support?state.supportServantLocked:sl.servantLocked),!!sv));el.querySelector('.equipment-label').insertAdjacentHTML('beforeend',lockButton('ce',ce.locked,!!ce.id));
 });
 updateBoardTotals();
}
function bondDetails(g, o, capped) {
 const fmt = n => n.toLocaleString();
 if (capped) return '<details class="form-details bond-details"><summary>结算明细</summary><p>该从者已达到当前牵绊上限，本场获得 0 点。</p></details>';
 const effects = g.sources.map(source => {
  const values = [source.rate && '+' + source.rate + '%', source.flat && '+' + source.flat + ' 点'].filter(Boolean);
  return '<li>' + esc(source.name) + ' ' + values.join('、') + '</li>';
 }).join('');
 const cap = g.rawRate > g.rate ? '（合计 +' + g.rawRate + '%，已达上限）' : '';
 return `<details class="form-details bond-details"><summary>结算明细</summary>
  <p>关卡基础 ${fmt(o.base)}<br>开场站位 +${g.positionRate}% → ${fmt(g.positionBase)}<br>百分比效果 +${g.rate}%${cap} → +${fmt(g.ratePoints)}<br>固定加成 +${fmt(g.flat)}<br>茶壶 ×${o.tea}</p>
  ${effects ? '<ul>' + effects + '</ul>' : ''}
  <p>本场共 ${fmt(g.value)} 点，比关卡基础多 ${fmt(g.value - o.base)} 点。</p></details>`;
}
function updateBoardTotals(){
 const on=$('grandMode').value!=='off',reward=on?getBond($('grandReward').value==='auto'?state.resolvedReward:$('grandReward').value):null;
 const ces=state.manualSlots.filter((s,i)=>i<+$('count').value).map(sl=>getBond(sl.ceId)).filter(Boolean);if(reward)ces.push(reward);
 const effects=ces.map(c=>({...c,e:BondSolver.effect(c,state.ces[c.id]?.mlb??true)}));const support=[];
 for(const [id,mlb,label] of [[supportCeId('support'),$('supportMlb').checked,'助战普通槽'],[on&&$('supportGrand').checked?supportCeId('supportReward'):0,$('supportRewardMlb').checked,'助战报酬槽']]){const c=getBond(id);if(c)support.push({...c,e:BondSolver.effect(c,mlb),sourceLabel:label+' · '+c.name})}
 const guides = state.manualSlots.slice(0, +$('count').value).filter(slot => state.bond15.includes(slot.servantId)).length;
 const o={guides,order:state.order,base:+$('base').value,extra:+$('extra').value,tea:+$('tea').value};let cost=+$('reserveCost').value,total=0,number=0,rates=[];
 for(const [idx,sl] of state.manualSlots.entries()){const el=$('partyGrid').querySelector(`[data-member="${idx}"]`),s=getSvt(sl.servantId);if(idx>=+$('count').value)continue;cost+=getCE(sl.ceId)?.cost||0;if(!s)continue;number++;const v=s.variants.find(v=>v.key===(state.forms[s.id]&&state.forms[s.id]!=='auto'?state.forms[s.id]:sl.autoForm))||s.variants[0];cost+=v.cost;
 const g=BondSolver.gain({...s,maxed:state.maxed.includes(s.id)},v,effects,support,o,state.order.indexOf(idx)<3);total+=g.value;rates.push(g.rate);
 el.insertAdjacentHTML('beforeend',`<div class="slot-bond"><b>${g.value.toLocaleString()}</b><small>站位 +${g.positionRate}% · 效果 +${g.rate}%${g.flat?' · +'+g.flat+' 点':''}</small></div>${bondDetails(g,o,state.maxed.includes(s.id))}<div class="board-form">${esc(v.label)}</div>`);
 if(typeof formDetails==='function')el.insertAdjacentHTML('beforeend',formDetails(s,v,{...inputs(),support:supportCeId('support'),supportReward:supportCeId('supportReward'),ces:state.ces},{ces:ces.filter(c=>c!==reward).map(c=>c.id),grandReward:reward?.id||0}));
 }
 $('fixedCost').textContent=`COST ${cost} / ${$('cost').value}`;$('fixedCost').classList.toggle('over-cost',cost>+$('cost').value);
 $('resultBody').innerHTML=`<div><small>队伍 COST</small><b class="${cost>+$('cost').value?'over-cost':''}">${cost}<em> / ${$('cost').value}</em></b></div><div><small>${number<+$('count').value?'已选成员':'全队'}牵绊 / 次</small><b>${total.toLocaleString()}</b></div><div><small>成员效果加成${guides?'（含绊15 +'+guides*BondSolver.GUIDANCE_RATE+'%）':''}</small><b>${rates.length?Math.min(...rates)+'–'+Math.max(...rates):0}%</b></div><div><small>编队</small><b>${number} + 1<em> 助战</em></b></div>`;
}
function swapBoard(a,b){if(a===b)return;[state.order[a],state.order[b]]=[state.order[b],state.order[a]];changed();$('status').textContent=`已交换 ${a+1} 与 ${b+1} 号整槽，从者与礼装同步移动。`;}
function ceAt(idx){if(idx===5)return {id:state.supportCombatCe||supportCeId('support'),mlb:$('supportMlb').checked,locked:!!state.supportCeLocked};const sl=state.manualSlots[idx];return {id:sl.ceId,mlb:state.ces[sl.ceId]?.mlb??state.ceMlb?.[sl.ceId]??false,locked:!!sl.ceLocked}}
function swapEquipment(a,b){if(a===b)return;const ai=state.order[a],bi=state.order[b];if([ai,bi].some(i=>i!==5&&i>=+$('count').value)){notify('未出击槽位不能交换礼装。');return}const left=ceAt(ai),right=ceAt(bi),next=state.manualSlots.map(sl=>sl.ceId);if(ai!==5)next[ai]=right.id;if(bi!==5)next[bi]=left.id;if ((ai !== 5 && fixedRewardUses(right.id)) || (bi !== 5 && fixedRewardUses(left.id))) {
  notify('交换后的普通槽会与冠位报酬槽使用同一张礼装。');
  return;
 }
 const ids=next.filter(Boolean);if(new Set(ids).size!==ids.length){notify('交换后自有礼装会重复，每种礼装按一张计算。');return}
 function put(i,c){if(i===5){state.supportCombatCe=c.id&&!getBond(c.id)?c.id:0;$('support').value=getBond(c.id)?String(c.id):'0';$('supportMlb').checked=c.mlb;state.supportPinnedAuto=false;state.supportCeLocked=c.locked;return}const sl=state.manualSlots[i];sl.ceId=c.id;sl.autoCE=false;sl.ceLocked=c.locked;sl.reservedCombat=false;if(c.id){state.ceMlb={...state.ceMlb,[c.id]:c.mlb};if(getBond(c.id)){state.ces[c.id].enabled=true;state.ces[c.id].mlb=c.mlb}}}
 put(ai,right);put(bi,left);changed();$('status').textContent=`仅交换 ${a+1} 与 ${b+1} 号普通礼装，从者位置不变。`;
}
const phoneLayout = matchMedia('(max-width: 700px), (pointer: coarse) and (max-width: 950px)');
const reorderButton = document.getElementById('reorderTouch');
function setTouchReorder(enabled) {
 document.body.classList.toggle('touch-reorder', enabled);
 reorderButton.setAttribute('aria-pressed', String(enabled));
 reorderButton.textContent = enabled ? '完成换位' : '调整站位';
 document.getElementById('touchHint').textContent = enabled ? '拖从者换整组，拖礼装只换礼装' : '左右滑动查看 1–6 位';
}
reorderButton.onclick = () => setTouchReorder(!document.body.classList.contains('touch-reorder'));
phoneLayout.addEventListener('change', () => setTouchReorder(false));
let boardDrag=null,keyboardSource=null;
function dragSource(target){const row=target.closest('[data-position]');if(!row||target.closest('[data-face],[data-lock],input,select,details,[data-crown],[data-auto-reward],.extra-equipment,.bond-slot'))return null;const ce=target.closest('[data-pick="ce"],[data-pick="support"]');return {row,handle:ce||target.closest('.servant-slot,[data-drag]')||row,type:ce?'ce':'whole'}}
document.addEventListener('dragstart',e=>{if(e.target.closest('#partyGrid'))e.preventDefault()});
document.addEventListener('pointerdown',e=>{dragClickUntil=0;
 if (e.pointerType === 'touch' && phoneLayout.matches && !document.body.classList.contains('touch-reorder') && !e.target.closest('[data-drag]')) return;
 const src=dragSource(e.target);if(!src||e.button!==0)return;boardDrag={start:+src.row.dataset.position,target:+src.row.dataset.position,type:src.type,x:e.clientX,y:e.clientY,moved:false,id:e.pointerId,handle:src.handle};src.handle.setPointerCapture(e.pointerId);});
document.addEventListener('pointermove',e=>{if(!boardDrag||boardDrag.id!==e.pointerId)return;const d=boardDrag;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>8)d.moved=true;if(!d.moved)return;d.handle.classList.add('drag-origin');const sc=document.querySelector('.board-scroll'),rect=sc.getBoundingClientRect();if(e.clientX<rect.left+35)sc.scrollLeft-=18;if(e.clientX>rect.right-35)sc.scrollLeft+=18;const row=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-position]');document.querySelectorAll('.drop-target,.ce-drop-target').forEach(el=>el.classList.remove('drop-target','ce-drop-target'));d.target=row?+row.dataset.position:d.start;if(row){const dest=d.type==='ce'?row.querySelector('[data-pick="ce"],[data-pick="support"]'):row;dest?.classList.add(d.type==='ce'?'ce-drop-target':'drop-target')}});
function stopBoardDrag(e,cancel=false){if(!boardDrag)return;const d=boardDrag;boardDrag=null;document.querySelectorAll('.drag-origin,.drop-target,.ce-drop-target').forEach(el=>el.classList.remove('drag-origin','drop-target','ce-drop-target'));if(d.moved){dragClickUntil=Date.now()+500;if(!cancel)(d.type==='ce'?swapEquipment:swapBoard)(d.start,d.target)}}
document.addEventListener('pointerup',e=>stopBoardDrag(e));document.addEventListener('pointercancel',e=>stopBoardDrag(e,true));
document.addEventListener('click',e=>{if(Date.now()<dragClickUntil)return;const lock=e.target.closest('[data-lock]');if(lock){const idx=+lock.closest('[data-member]').dataset.member,key=lock.dataset.lock;if(idx===5){const field=key==='servant'?'supportServantLocked':'supportCeLocked';if(key==='ce'){
  if (!state[field] && $('support').value==='auto') {
   $('support').value=String(supportCeId('support'));state.supportPinnedAuto=true;
  } else if (state[field] && state.supportPinnedAuto) {
   $('support').value='auto';state.supportPinnedAuto=false;
  }
 }state[field]=!state[field]}else{const sl=state.manualSlots[idx],field=key==='servant'?'servantLocked':'ceLocked';sl[field]=!sl[field];sl[key==='servant'?'autoServant':'autoCE']=!sl[field]}changed();return}const h=e.target.closest('[data-drag]');if(!h)return;const pos=+h.dataset.drag;if(keyboardSource===null){keyboardSource=pos;h.closest('.party-slot').classList.add('drop-target');$('status').textContent='请选择另一个位置的手柄交换；Esc 取消。'}else{const prev=keyboardSource;keyboardSource=null;swapBoard(prev,pos);document.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'))}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){keyboardSource=null;stopBoardDrag(e,true);document.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'))}});
