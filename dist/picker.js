let picker=null,filterDraft=null;const filtersByKind={servant:FGOSelection.emptyFilters(),ce:FGOSelection.emptyFilters()},sortByKind={servant:'rarityDesc',ce:'levelDesc'};
let savedViews = {}, savedQuestClasses = {};
try{const p=JSON.parse(localStorage.getItem(pickerStorageKey));
 savedViews = p?.views || {};
 savedQuestClasses = p?.questClasses || {};
 for(const kind of ['servant','ce']){for(const key of Object.keys(filtersByKind[kind]))if(Array.isArray(p?.filters?.[kind]?.[key]))filtersByKind[kind][key]=p.filters[kind][key];if(['number','rarityDesc','costAsc','costDesc','levelDesc','levelAsc'].includes(p?.sort?.[kind]))sortByKind[kind]=p.sort[kind]}}catch{}
if (sortByKind.servant.startsWith('cost')) sortByKind.servant = 'rarityDesc';
const sortOptions = [...$('pickerSort').options].map(o => [o.value,o.textContent]);
function setSortMenu(kind) {
 const options = sortOptions.filter(([value]) => kind === 'ce' || !value.startsWith('cost'));
 $('pickerSort').replaceChildren(...options.map(([value,text]) =>
  new Option(kind === 'servant' ? text.replace('礼装等级','从者等级') : text,value)));
 $('pickerSort').value = sortByKind[kind];
}
function bondStateField(servant) {
 const id = servant.id, capped = picker.maxed.includes(id), guide = picker.bond15.includes(id);
 const value = guide ? (capped ? 'guideCap' : 'guideGrowing') : (capped ? 'cap' : 'earning');
 const modes = [['earning','正常获得'], ['cap','未到15 · 已达上限'], ['guideCap','绊15+ · 已满（全队+25%）']];
 if (D.region === 'JP') modes.push(['guideGrowing','绊15→16 · 可获得（全队+25%）']);
 return `<label class="bond-state">牵绊状态<select data-bond-state="${id}" aria-label="${esc(servant.name)}牵绊状态">${modes.map(([key,label])=>`<option value="${key}" ${key===value?'selected':''}>${label}</option>`).join('')}</select></label>`;
}
function persistPicker(){try{localStorage.setItem(pickerStorageKey,JSON.stringify({filters:filtersByKind,sort:sortByKind,views:savedViews,questClasses:savedQuestClasses}))}catch{notify('浏览器无法保存筛选设置。')}}

function supportEquipment(target) {
 if (target === 'support') return { id: state.supportCombatCe || supportCeId('support'), mlb: $('supportMlb').checked };
 if (target === 'supportReward') return { id: supportCeId('supportReward'), mlb: $('supportRewardMlb').checked };
 return null;
}
function savePickerFilters() {
 const saved = structuredClone(picker.filters);
 // The quest determines the available classes; keep the ordinary picker preference.
 if (picker.questClasses) {
  savedQuestClasses[picker.questGroup] = [...picker.filters.classes];
  saved.classes = filtersByKind.servant.classes;
 }
 filtersByKind[picker.kind] = saved;
 persistPicker();
}
function emptyPickerAction() {
 const search = $('pickerSearch');
 if (search.value.trim()) {
  search.value = '';
  search.focus();
 } else {
  picker.filters = FGOSelection.emptyFilters();
  savePickerFilters();
 }
 picker.page = 0;
 renderPicker();
 $('pickerGrid').scrollTop = 0;
}
function openPicker(kind,context){picker={kind,context,page:0,filters:structuredClone(filtersByKind[kind]),owned:[...state.owned],maxed:[...state.maxed],bond15:[...state.bond15],ces:structuredClone(state.ces),levels:{...state.ceLevels},mlb:Object.fromEntries(D.catalogCes.map(c=>[c.id,state.ces[c.id]?.mlb??state.ceMlb?.[c.id]??false])),opener:document.activeElement};
 if (kind === 'servant' && activeGroupSelect()) {
  picker.questClasses = BondSolver.grandGroups[activeGroupSelect().value];
  picker.questLabel = activeGroupSelect().selectedOptions[0].textContent;
  picker.questGroup = activeGroupSelect().value;
  picker.filters.classes = [...(savedQuestClasses[picker.questGroup] || [])];
 }
 picker.viewKey = [context.target, picker.questGroup || 'any'].join('/');
 const view = savedViews[picker.viewKey];
 picker.page = Number.isSafeInteger(view?.page) && view.page >= 0 ? view.page : 0;
 const equipped = supportEquipment(context.target);
 if (equipped?.id) picker.mlb[equipped.id] = equipped.mlb;
 const pool=['pool','cePool'].includes(context.target);$('pickerTitle').textContent=context.target==='pool'?'从者候选池':context.target==='cePool'?'牵绊礼装候选':kind==='servant'?'选择从者':'选择概念礼装';$('pickerEyebrow').textContent=kind==='servant'?'SERVANT SELECTION':'CRAFT ESSENCE SELECTION';$('pickerSearch').value=view?.search || '';$('pickerSearch').placeholder=kind==='servant'?'搜索名称 / 别名，如 C呆、术呆、奥宝…':'搜索名称 / 别名，如 宝石翁、黑杯、午餐…';setSortMenu(kind);$('autoSupportPicker').hidden=!['support','supportReward'].includes(context.target);$('clearPickerSelection').textContent=$('autoSupportPicker').hidden?'清除此槽位':'不装备';$('clearPickerSelection').hidden=pool;$('bulkActions').hidden=!pool;$('confirmPicker').hidden=!pool;$('pickerNotice').textContent=pool?'候选修改将在点击「确认候选配置」后保存；关闭窗口可取消本次修改。':kind==='ce'?'点击卡片立即装备并返回。等级按你设定的持有等级排序（默认 Lv.1）；仅计算已收录的常驻全队牵绊效果，其他礼装计入槽位与 Cost。':'点击卡片立即选定并返回。已在自有队伍中的从者不可重复选择；选定后可在主界面固定灵基。';$('pickerDialog').dataset.kind = kind;
 renderPicker();
 $('pickerDialog').showModal();
 (phoneLayout.matches ? $('closePicker') : $('pickerSearch')).focus({preventScroll:true});}
function closePicker(){if($('filterDialog').open)$('filterDialog').close();$('pickerDialog').close();}
$('closePicker').onclick=closePicker;$('pickerDialog').addEventListener('click',e=>{if(e.target===$('pickerDialog'))closePicker()});$('pickerDialog').addEventListener('close',()=>{$('toast').hidden=true;if(picker?.opener?.isConnected)picker.opener.focus();else if(picker?.context){const c=picker.context;document.querySelector(`[data-pick="${c.target}"]${Number.isFinite(c.index)?`[data-slot="${c.index}"]`:''},[data-grand-pick="${c.target}"]`)?.focus()}});
function pickerItems(){let items=picker.kind==='servant'?D.servants:['cePool','grandReward','supportReward'].includes(picker.context.target)?D.ces:D.catalogCes;if (picker.questClasses) items = items.filter(servant => picker.questClasses.includes(servant.class));
 return FGOSelection.filterItems(items,picker.kind,picker.filters,$('pickerSearch').value,$('pickerSort').value,picker.kind==='servant'?state.svtLevels:picker.levels)}
function renderPicker(){if(!picker)return;const items=pickerItems(),pageSize=30,pages=Math.max(1,Math.ceil(items.length/pageSize));picker.page=Math.min(picker.page,pages-1);
 const search = $('pickerSearch').value;
 const previous = savedViews[picker.viewKey];
 if (previous?.page !== picker.page || previous?.search !== search) {
  savedViews[picker.viewKey] = {page:picker.page, search};
  persistPicker();
 }
 const pool=picker.context.target==='pool',cePool=picker.context.target==='cePool';$('pickerCount').textContent=`${items.length.toLocaleString()} ${picker.kind==='servant'?'位从者':'张礼装'}${pool?' · 已选 '+picker.owned.length:cePool?' · 已选 '+Object.values(picker.ces).filter(c=>c.enabled).length+' 种':''}`;const n=Object.values(picker.filters).reduce((a,v)=>a+v.length,0);$('filterCount').textContent=n?`(${n})`:'';$('activeFilters').innerHTML=Object.entries(picker.filters).flatMap(([key,values])=>values.map(v=>`<span class="chip">${esc(key==='rarities'?v+'★':key==='classes'?classNames[v]||v:key==='traits'?traits[v]:effectNames[v]||v)}</span>`)).join('');
 if (picker.questClasses) $('activeFilters').insertAdjacentHTML('afterbegin', `<span class="chip">出击职阶 · ${esc(picker.questLabel)}</span>`);
 $('pickerGrid').innerHTML=items.slice(picker.page*pageSize,(picker.page+1)*pageSize).map(x=>{const sv=picker.kind==='servant',chosen=pool?picker.owned.includes(x.id):cePool?picker.ces[x.id]?.enabled:sv?(picker.context.target==='supportServant'?state.supportServant:picker.context.target==='grandServant'?+$('grandId').value:state.manualSlots[picker.context.index]?.servantId)===x.id:(picker.context.target==='support'?state.supportCombatCe||supportCeId('support'):picker.context.target==='supportReward'?supportCeId('supportReward'):picker.context.target==='grandReward'?+$('grandReward').value:state.manualSlots[picker.context.index]?.ceId)===x.id;const duplicate=!pool&&sv&&picker.context.target==='servant'&&state.manualSlots.some((sl,i)=>i!==picker.context.index&&sl.servantId===x.id);return `<article class="collection-card rarity-${x.rarity} ${chosen?'selected':''}"><button class="collection-pick" data-select="${x.id}" ${duplicate?'disabled':''} aria-label="${chosen?'已选 ':''}${esc(x.name)}"><div class="collection-art"><img src="${esc(sv?faceFor(x,picker.context.target==='supportServant',x.image||x.art):x.image||x.art)}" alt="" loading="lazy"><span class="card-shade"></span>${sv?`<span class="card-class">${classIcon(x.class)}</span>`:'<span class="card-class ce-emblem">◈</span>'}<span class="card-stars">${'★'.repeat(x.rarity)||'☆'}</span><span class="selection-check">${duplicate?'已编队':chosen?'✓':''}</span><span class="slot-cost">COST ${x.cost}</span>${sv?`<span class="np-colors">${(x.npColors||[]).map(c=>`<span class="np-${c}">${c[0]}</span>`).join('')}</span>`:''}</div><strong class="collection-name">${esc(x.name)}</strong><span class="collection-meta">No.${x.no??x.id} · ${sv?(classNames[x.class]||x.class)+' · Lv.'+(state.svtLevels[x.id]||1):'CRAFT ESSENCE'}</span></button>${sv?(pool?bondStateField(x):''):`<div class="ce-card-settings"><label>Lv.<input type="number" data-level="${x.id}" aria-label="${esc(x.name)}持有等级" min="1" max="${x.maxLevel}" value="${picker.levels[x.id]||1}"></label><label><input type="checkbox" data-mlb="${x.id}" ${picker.mlb[x.id]?'checked':''}>满破</label>${cePool?`<label><input type="checkbox" data-required="${x.id}" ${picker.ces[x.id]?.required?'checked':''}>必带</label>`:''}</div><p class="ce-effect" title="${esc(x.detail)}">${esc(x.detail)}</p>`}</article>`}).join('')||`<div class="no-matches"><span>◇</span><h3>没有符合条件的结果</h3><p>试试其他关键词，或重置筛选条件。</p><button id="emptyReset">${$('pickerSearch').value.trim()?'清除搜索':'重置筛选'}</button></div>`;$('pickerPage').textContent=`${picker.page+1} / ${pages}`;$('pickerPrev').disabled=picker.page===0;$('pickerNext').disabled=picker.page>=pages-1;$('emptyReset')?.addEventListener('click',emptyPickerAction)}
function selectItem(id){const {target,index}=picker.context;if(target==='pool'){if(picker.owned.includes(id)){if(state.locked.includes(id)){notify('这位从者已锁定在编队中，请先清空对应从者槽。');return}picker.owned=picker.owned.filter(x=>x!==id)}else picker.owned.push(id);renderPicker();return}if(target==='cePool'){const c=picker.ces[id];if(c.enabled){c.enabled=false;c.required=false}else{c.enabled=true}renderPicker();return}
 if(target==='servant'){if(id&&state.manualSlots.some((s,i)=>i!==index&&s.servantId===id)){notify('同一从者不能重复入队。');return}state.manualSlots[index].servantId=id;if(!id)state.manualSlots[index].servantLocked=false;state.manualSlots[index].autoServant=false;delete state.manualSlots[index].autoForm;if(id&&!state.owned.includes(id))state.owned.push(id)}
 if(target==='grandServant'){if(Number.isInteger(index)){const existing=state.manualSlots.findIndex(sl=>sl.servantId===id&&id);if(existing<0)state.manualSlots[index].servantId=id; }if(id&&!state.owned.includes(id))state.owned.push(id);fillGrand();$('grandId').value=String(id)}
 if(target==='grandReward'||target==='supportReward'){if(id&&target==='grandReward'&&state.manualSlots.some(sl=>sl.ceId===id)){notify('这张礼装已固定在普通槽，请先清空对应普通槽。');return}$(target).value=String(id);if(id&&target==='grandReward'){state.ces[id].enabled=true;state.ces[id].mlb=picker.mlb[id]}if(id&&target==='supportReward')$('supportRewardMlb').checked=picker.mlb[id]}
 if(target==='supportServant')state.supportServant=id;
 if(target==='ce'){
  if (fixedRewardUses(id)) {
   notify('这张礼装已固定在冠位报酬槽。请先将报酬槽改为自动或清空。');
   return;
  }
  if(id&&state.manualSlots.some((s,i)=>i!==index&&s.ceId===id)){notify('每种礼装按一张建模，请选择不同礼装。');return}state.manualSlots[index].ceId=id;if(!id)state.manualSlots[index].ceLocked=false;state.manualSlots[index].autoCE=false;if(id&&getBond(id)){state.ces[id].enabled=true;state.ces[id].mlb=picker.mlb[id]}}
 if(target==='support'){state.supportCeLocked=false;state.supportPinnedAuto=false;state.supportCombatCe=id&&!getBond(id)?id:0;$('support').value=getBond(id)?String(id):'0';if(id)$('supportMlb').checked=picker.mlb[id]}
 if (picker.kind === 'ce') {
  state.ceLevels = {...picker.levels};
  if (!supportEquipment(target)) state.ceMlb = {...state.ceMlb, ...picker.mlb};
 }
 changed();closePicker();}
$('pickerGrid').onclick=e=>{const b=e.target.closest('[data-select]');if(b&&!b.disabled)selectItem(+b.dataset.select)};
$('pickerGrid').onchange=e=>{const el=e.target;if(el.dataset.level){const c=getCE(el.dataset.level),n=Math.max(1,Math.min(c.maxLevel,Math.trunc(+el.value)||1));picker.levels[c.id]=n;el.value=n;if($('pickerSort').value.startsWith('level'))renderPicker()}if(el.dataset.mlb){const id=+el.dataset.mlb;picker.mlb[id]=el.checked;if(picker.ces[id])picker.ces[id].mlb=el.checked}if (el.dataset.bondState) {
 const id = Number(el.dataset.bondState);
 picker.maxed = picker.maxed.filter(x => x !== id);
 picker.bond15 = picker.bond15.filter(x => x !== id);
 if (['cap','guideCap'].includes(el.value)) picker.maxed.push(id);
 if (['guideCap','guideGrowing'].includes(el.value)) picker.bond15.push(id);
}
if(el.dataset.required){const id=+el.dataset.required,c=picker.ces[id];c.required=el.checked;if(el.checked)c.enabled=true;renderPicker()}};
$('confirmPicker').onclick=()=>{if(picker.context.target==='pool'){state.owned=picker.owned;state.maxed=picker.maxed;state.bond15=picker.bond15}else{state.ces=picker.ces;state.ceLevels=picker.levels;state.ceMlb={...state.ceMlb,...picker.mlb}}changed();closePicker()};
$('autoSupportPicker').onclick=()=>{
 const target=picker.context.target;
 if(target==='support'){state.supportCombatCe=0;state.supportCeLocked=false;state.supportPinnedAuto=false;}
 delete state.autoSupport?.[target];
 $(target).value='auto';
 changed();closePicker();
};
$('clearPickerSelection').onclick=()=>selectItem(0);$('pickerSearch').oninput=()=>{picker.page=0;renderPicker();$('pickerGrid').scrollTop=0};$('pickerSort').onchange=()=>{sortByKind[picker.kind]=$('pickerSort').value;persistPicker();picker.page=0;renderPicker();$('pickerGrid').scrollTop=0};$('pickerPrev').onclick=()=>{picker.page--;renderPicker();$('pickerGrid').scrollTop=0};$('pickerNext').onclick=()=>{picker.page++;renderPicker();$('pickerGrid').scrollTop=0};
$('selectFiltered').onclick=()=>{if(picker.context.target==='pool')picker.owned=[...new Set([...picker.owned,...pickerItems().map(s=>s.id)])];else{const merged=new Set([...Object.keys(picker.ces).filter(id=>picker.ces[id].enabled).map(Number),...pickerItems().map(c=>c.id)]);for(const id of merged)picker.ces[id].enabled=true}renderPicker()};
$('clearCandidates').onclick=()=>{if(picker.context.target==='pool'){
 const visible = new Set(pickerItems().map(servant => servant.id));
 picker.owned = picker.owned.filter(id => !visible.has(id) || state.locked.includes(id));
}else for(const c of Object.values(picker.ces)){c.enabled=false;c.required=false}renderPicker()};
function filterField(title,key,values){return `<fieldset><legend>${title}</legend><div class="filter-options">${values.map(([v,label])=>`<label class="filter-option ${key==='npColors'?'np-'+v:''}"><input type="checkbox" data-filter="${key}" value="${esc(v)}" ${filterDraft[key].includes(v)?'checked':''}><span>${key==='classes'?classIcon(v):''}${esc(label)}</span></label>`).join('')}</div></fieldset>`}
function renderFilterFields(){const sv=picker.kind==='servant';$('filterFields').innerHTML=(sv?filterField(picker.questClasses?'出击范围内的职阶':'职阶','classes',[...new Set((picker.questClasses || D.servants.map(s=>s.class)).map(c=>c==='beastEresh'?'beast':c))].map(c=>[c,classNames[c]||c])):'')+filterField('稀有度','rarities',(sv?[0,1,2,3,4,5]:[1,2,3,4,5]).map(n=>[n,n===0?'☆ 0星':'★'.repeat(n)]))+(sv?filterField('宝具卡色','npColors',[['Buster','Buster · 红'],['Arts','Arts · 蓝'],['Quick','Quick · 绿']])+filterField('特性（包含可用形态）','traits',Object.entries(traits).map(([id,name])=>[+id,name])):filterField('效果类型','effects',Object.entries(effectNames)));}
$('openFilters').onclick=()=>{filterDraft=structuredClone(picker.filters);renderFilterFields();$('filterDialog').showModal()};$('filterFields').onchange=e=>{const k=e.target.dataset.filter;if(!k)return;const v=['rarities','traits'].includes(k)?+e.target.value:e.target.value;filterDraft[k]=filterDraft[k].filter(x=>x!==v);if(e.target.checked)filterDraft[k].push(v)};
$('resetFilters').onclick=()=>{filterDraft=FGOSelection.emptyFilters();renderFilterFields()};$('confirmFilters').onclick=()=>{picker.filters=structuredClone(filterDraft);savePickerFilters();picker.page=0;renderPicker();$('filterDialog').close()};$('closeFilters').onclick=()=>$('filterDialog').close();$('filterDialog').onclick=e=>{if(e.target===$('filterDialog'))$('filterDialog').close()};
