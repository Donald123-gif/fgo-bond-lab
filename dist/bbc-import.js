'use strict';

const BBCImport = (() => {
 const plain = x => !!x && typeof x==='object' && !Array.isArray(x);
 const bad = () => {throw Error('队伍文件格式无效，当前编队已保留。');};
 const keys = Array.from({length:6},(_,i)=>'servant_'+i+'_name');
 const signature = (party,assist) => JSON.stringify([assist,...party]);
 const shared = cfg => Object.fromEntries([...keys,'assistIdx','assistMode','assistEquip','fullEquip','servantLevel'].map(k=>[k,cfg[k]]));
 function regionOf(cfg,current) {
  if (!plain(cfg) || !keys.every(k=>Object.hasOwn(cfg,k) && (cfg[k]===null || typeof cfg[k]==='string'))) bad();
  if (cfg.server==='JP') return 'JP';
  if (cfg.server==='CH'||cfg.server==='CN') return 'CN';
  if (cfg.server==null) return current;
  throw Error('网页支持国服和日服，文件服务器为 '+String(cfg.server)+'。');
 }
 function checkedSettings(s) {
  const assert=ok=>{if(!ok)bad();};
  const map=x=>plain(x)&&Object.keys(x).every(k=>/^\d+$/.test(k));
  const num=x=>Number.isSafeInteger(x)&&x>=0;
  const flag=x=>typeof x==='boolean';
  const flags=(o,ks)=>ks.every(k=>o[k]==null||flag(o[k]));
  assert(plain(s)&&plain(s.inputs)&&Array.isArray(s.order)&&s.order.length===6&&
   new Set(s.order).size===6&&s.order.every(i=>num(i)&&i<=5));
  for(const k of ['owned','locked','maxed','bond15'])assert((k==='bond15' && s[k]===undefined) || Array.isArray(s[k])&&s[k].every(num));
  for(const k of ['forms','svtLevels','ceLevels','ceMlb','ces'])assert(s[k]===undefined||map(s[k]));
  for(const k of ['svtLevels','ceLevels'])assert(Object.values(s[k]||{}).every(v=>num(v)&&v<=120));
  assert(Object.values(s.ceMlb||{}).every(flag));
  assert(Object.values(s.ces||{}).every(v=>plain(v)&&flags(v,['enabled','mlb','required'])));
  const form=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]+$/.test(v);
  assert(Object.values(s.forms||{}).every(form));
  assert(Array.isArray(s.manualSlots)&&s.manualSlots.length===5&&s.manualSlots.every(v=>plain(v)&&num(v.servantId)&&num(v.ceId)&&(!v.autoForm||form(v.autoForm))&&flags(v,['autoCE','autoServant','servantLocked','ceLocked','reservedCombat'])));
  for(const k of ['supportServant','supportCombatCe','resolvedReward'])assert(s[k]==null||num(s[k]));
  assert(flags(s,['supportCeLocked','supportServantLocked','advancedOpen','supportPinnedAuto']));
  assert(!s.autoSupport||(plain(s.autoSupport)&&Object.values(s.autoSupport).every(num)));
  assert(!s.portraits||(plain(s.portraits)&&Object.entries(s.portraits).every(([k,v])=>/^(support-)?\d+$/.test(k)&&typeof v==='string'&&/^[\w.-]+\.png$/i.test(v))));
  const enums={objective:['team','target'],grandMode:['off','duel'],grandGroup:Object.keys(globalThis.BondSolver.grandGroups),grandBond:['none','original','np']};
  const numbers=['level','cost','base','count','front','support','extra','tea','reserveSlots','reserveCost','grandId','grandReward','supportReward'];
  for (const [k,v] of Object.entries(s.inputs)){
   if(enums[k])assert(enums[k].includes(v));
   else if(numbers.includes(k))assert((['support','grandReward','supportReward'].includes(k)&&v==='auto') || /^\d+$/.test(String(v))&&Number.isSafeInteger(+v));
   else assert(['supportMlb','supportRewardMlb','costumes','supportGrand'].includes(k)&&flag(v));
  }
  assert(+s.inputs.count>=1&&+s.inputs.count<=5);
  const out={};
  for(const k of ['owned','locked','maxed','bond15','forms','svtLevels','ceLevels','ceMlb','order','ces','manualSlots','inputs','supportServant','supportCombatCe','resolvedReward','autoSupport','supportCeLocked','supportServantLocked','supportPinnedAuto','portraits','advancedOpen'])
   if(s[k]!==undefined)out[k]=structuredClone(s[k]);
  return out;
 }
 // Old native imports packed the named members first, locked them, and set the
 // target equal to their count. Only repair saves that still match that lineup.
 function repairLegacyCount(s) {
  const battle=s?.bbcBattle, count=Number(s?.inputs?.count);
  if(!battle || battle.hasPartyCapacity || !Number.isInteger(count) || count<1 || count>=5) return false;
  if(s.manualSlots?.length!==5 || s.order?.length!==6 ||
     !s.manualSlots.every((slot,i)=>i<count ? slot?.servantId && slot.servantLocked===true : slot?.servantId===0 && !slot.ceId)) return false;
  const party=s.order.map(i=>i===5?s.supportServant:s.manualSlots[i]?.servantId);
  if(signature(party,s.order.indexOf(5))!==battle.signature) return false;
  s.inputs.count='5';
  battle.hasPartyCapacity=true;
  return true;
 }
 function convert(cfg,data,names,bridge,previous={}) {
  const region=regionOf(cfg,data.region),warnings=[];
  if(region!==data.region)throw Error('队伍服务器与资料库不一致。');
  const ext=cfg.chaldeaBondLab;
  const rich=ext?.region===region && ext.version===1;
  if(ext&&!rich)warnings.push('网页快照版本或服务器不匹配，按 BBC 队伍字段读取。');
  const s=rich?checkedSettings(ext.settings):structuredClone(previous);
  if(!rich)repairLegacyCount(s);
  const serv=new Map(data.servants.map(c=>[c.id,c]));
  const ce=new Map(data.catalogCes.map(c=>[c.id,c]));
  const bond=new Set(data.ces.map(c=>c.id));
  const inputs=s.inputs||={};
  let before={};
  if(rich){
   if(!Array.isArray(ext.party)||ext.party.length!==6||ext.party.filter(x=>x?.support).length!==1)bad();
   if(ext.bbcFields)before=ext.bbcFields;
   else{
    before=shared(bridge.build(ext,names,null).config);
    // Older exports explicitly recorded unavailable recognition images as warnings.
    const support=ext.party.find(p=>p.support);
    for(const [i,card] of [[0,support.ce],[2,support.reward]])if(card&&ext.warnings?.some(w=>String(w).includes('「'+card.name+'」缺少')))before.assistEquip[i]=null;
    if(JSON.stringify(before.assistEquip)===JSON.stringify(cfg.assistEquip)&&before.assistEquip.every(v=>!v))before.fullEquip=cfg.fullEquip;
   }
  }
  const changed=k=>!rich||JSON.stringify(cfg[k])!==JSON.stringify(before[k]);
  const byName=new Map(Object.entries(names).map(([id,name])=>[name,+id]));
  let assist=cfg.assistIdx;
  if(assist==null||assist===-1){
   assist=keys.findLastIndex(k=>!cfg[k]);
   if(assist>=0)warnings.push('BBC 未指定助战，网页将第'+(assist+1)+'个空位用作助战槽。');
  }
  if(!Number.isInteger(assist)||assist<0||assist>5)throw Error('BBC 文件中缺少有效的助战位置（0–5）。');
  const lineChanged=changed('assistIdx')||keys.some(changed);
  const oldSlots=rich?s.manualSlots:[];
  const oldParty=rich?ext.party:[];
  const party=keys.map((k,i)=>{
   const name=cfg[k];
   let id=byName.get(name),form;
   if(!id && name)id=data.servants.find(c=>c.name===name||c.aliases?.includes(name))?.id;
   if(id===800101||id===800102){form=id===800101?'costume800140':'costume800190';id=800100;}
   if(rich&&!changed(k)){id=oldParty[i].servantId;form=oldParty[i].form;}
   if(id&&!serv.has(id)||name&&!id){warnings.push('第'+(i+1)+'位「'+name+'」在本服未匹配，已留空。');id=0;}
   return {id:id||0,form};
  });
  if(lineChanged){
   const own=party.filter((p,i)=>i!==assist&&p.id);
   if(!own.length && keys.some((key,i)=>i!==assist&&cfg[key]))throw Error('没有可导入的自有从者，请核对服务器和从者名称。'+warnings.join(' '));
   if(new Set(own.map(p=>p.id)).size!==own.length)throw Error('BBC 队伍的自有从者重复，请核对助战位置。');
   const vacant=()=>({servantId:0,ceId:0});
   s.manualSlots=Array.from({length:5},vacant);
   let active=0,inactive=own.length;
   s.order=party.map((p,i)=>{
    if(i===assist)return 5;
    if(!p.id)return inactive++;
    const idx=active++,old=oldSlots.find(o=>o.servantId===p.id);
    s.manualSlots[idx]=old?{...old}:{...vacant(),servantId:p.id,servantLocked:true};
    if(p.id===800100 && (!rich||changed(keys[i]))) (s.forms||={})[p.id]=p.form||'base';
    else if(p.form&&!old && serv.get(p.id).variants.some(v=>v.key===p.form)) (s.forms||={})[p.id]=p.form;
    return idx;
   });
   // BBC specifies occupied positions, not how many servants the solver should field.
   const requested=Number(inputs.count);
   inputs.count=String(Math.max(own.length,Number.isInteger(requested)&&requested>=1&&requested<=5?requested:5));
   s.supportServant=party[assist].id;
   s.locked=s.manualSlots.filter(x=>x.servantId&&(x.servantLocked||!x.autoServant)).map(x=>x.servantId);
   s.owned=[...new Set([...(s.owned||data.servants.filter(x=>!x.mash).map(x=>x.id)),...own.map(x=>x.id)])];
   if(!rich||!own.some(x=>x.id===+inputs.grandId))inputs.grandId='0';
  }
  const grand=String(cfg.assistMode||'').startsWith('冠位');
  if(!rich||changed('assistMode')&&(grand!==String(before.assistMode||'').startsWith('冠位'))){
   inputs.grandMode=grand?'duel':'off'; inputs.supportGrand=grand;
   if(grand){
    const klass=serv.get(party[assist].id)?.class||serv.get(party.find(p=>p.id)?.id)?.class;
    inputs.grandGroup=Object.entries(globalThis.BondSolver.grandGroups).find(([,classes])=>classes.includes(klass))?.[0]||'saber';
    warnings.push('已按从者职阶推定出击组，请核对职阶组并指定自有冠位。');
   }
  }
  if(!rich){
   inputs.grandId='0';inputs.grandReward=grand?'auto':'0';inputs.grandBond='none';
   s.supportCeLocked=s.supportServantLocked=s.supportPinnedAuto=false;s.autoSupport={};s.resolvedReward=0;
   warnings.push('BBC 原生文件未记录自有礼装和关卡基础牵绊，请核对后计算。');
  }
  const assets=new Map();
  for(const c of ce.values())for(const n of [c.name,...(c.aliases||[])])if(!assets.has(n.toLowerCase()))assets.set(n.toLowerCase(),c.id);
  for(const [id,n] of Object.entries(bridge.imageAliases))if(ce.has(+id))assets.set(n.toLowerCase(),+id);
  const slots=v=>typeof v==='string'?[v,null,null]:v||[null,null,null];
  const ignoresGear=mode=>mode==='仅从者'||mode==='不识别';
  const rawGear=slots(cfg.assistEquip);
  const now=ignoresGear(cfg.assistMode)?[null,null,null]:rawGear;
  const old=ignoresGear(before.assistMode)?[null,null,null]:slots(before.assistEquip);
  if(!rich&&ignoresGear(cfg.assistMode)&&Array.isArray(rawGear)&&rawGear.some(Boolean))
   warnings.push('BBC 当前模式未筛选礼装，助战礼装已留空。');
  if(!Array.isArray(now)||now.length>3||!now.every(v=>v==null||typeof v==='string'||Array.isArray(v)&&v.every(n=>typeof n==='string')))bad();
  for (const [index,key] of [[0,'support'],[2,'supportReward']]){
   const raw=now[index];
   if(rich&&JSON.stringify(raw??null)===JSON.stringify(old[index]??null))continue;
   const choices=Array.isArray(raw)?raw:raw?[raw]:[];
   if(!choices.every(n=>typeof n==='string'))bad();
   let selected=0;
   for(const n of choices){const id=assets.get(n.trim().toLowerCase());if(id&&(index===0||bond.has(id))){selected=id;break;}}
   if(choices.length>1)warnings.push('助战'+(index?'报酬':'普通')+'槽有多个候选，网页采用首个可识别礼装。');
   if(choices.length&&!selected)warnings.push('未识别助战礼装「'+choices.join('、')+'」，对应槽已留空。');
   inputs[key]=String(bond.has(selected)?selected:0);
   if(index===0){s.supportCombatCe=selected&&!bond.has(selected)?selected:0;s.supportCeLocked=false;s.supportPinnedAuto=false;}
   if(s.autoSupport)delete s.autoSupport[key];
  }
  if(changed('fullEquip'))inputs.supportMlb=inputs.supportRewardMlb=Boolean(Number(cfg.fullEquip));
  if(changed('servantLevel')&&s.supportServant&&Number.isInteger(+cfg.servantLevel)&&+cfg.servantLevel>0&&+cfg.servantLevel<=120){
   if(!party.some((p,i)=>i!==assist&&p.id===s.supportServant))(s.svtLevels||={})[s.supportServant]=+cfg.servantLevel;
  }
  // A battle script refers to physical positions. Reuse it only for the same formation.
  const fields=Object.fromEntries(Object.entries(cfg).filter(([k])=>/^round[1-3]_(turns|extraStrategy|extraSkill|turn\d+_(skill|np|strategy|condition))$/.test(k)||['usedServant','specialKeys','master_equip'].includes(k)));
  const effective=key=>inputs[key]==='auto'?s.autoSupport?.[key]||0:Number(inputs[key])||0;
  s.bbcBattle={hasPartyCapacity:true,signature:signature(party.map(p=>p.id),assist),fields,
   gear:[s.supportCombatCe||effective('support'),grand?effective('supportReward'):0],
   grand, assistEquip:structuredClone(now)};
  return {state:s,warnings};
 }
 return {convert,regionOf,shared,signature,repairLegacyCount};
})();
if(typeof module!=='undefined')module.exports=BBCImport;

