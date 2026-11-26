'use strict';

// BBC uses its own servant dictionary keys and the stems of local recognition images.
const BBChannel = (() => {
 const imageAliases = {34:'宝石翁', 48:'黑之圣杯', 910:'迦勒底午茶时光', 1949:'nff',
  2052:'秩序善', 2233:'秩序女', 2437:'星恶'};
 function build(snapshot, names, images, masterEquip = 1) {
  const {party, region, grandSupport} = snapshot;
  const warnings = [];
  const assistIdx = party.findIndex(slot => slot.support);
  const support = party[assistIdx];
  const config = {server:region === 'JP' ? 'JP' : 'CH', assistIdx, usedServant:[],
   master_equip:masterEquip, assistTags:[], skillsLevel:[1,1,1,0,0,0,0,0], NPlevel:1,
   servantLevel:support.level || 1, onlyFriendAssist:0, fullEquip:0, dropImage:null,
   dropStopNum:0, randomTouch:0, randomTime:0, firstBattleSet:1, intervalBF:0,
   intervalAF:0.1, scrollLimit:0.96, clearAP:0, allowOtherApple:0, fullFriendshipStop:1,
   gameCrushRestart:0, allNotSkip:1, ignoreFriendship:'', addFriend:0, noChain:0,
   noSpeedupSkill:0, stuckRestart:0, stuck_times:0, screenRotation:90, checkStuckInterval:30, specialKeys:[],
   noGrandRefresh:1, intervalAFswipeAssist:0.5, intervalBFchooseCard:0};
  party.forEach((slot,i) => {
   let id = slot.servantId;
   if (id === 800100 && ['costume800140','costume800150'].includes(slot.form)) id=800101;
   if (id === 800100 && slot.form === 'costume800190') id=800102;
   config['servant_'+i+'_name'] = names[id] || null;
   if (id && !names[id]) warnings.push('第'+(i+1)+'位「'+slot.name+'」未收录在 BBC 从者库，请更新或在 BBC 选择。');
  });
  function imageName(card) {
   if (!card) return null;
   const candidates = [imageAliases[card.id],card.name,...card.aliases].filter(Boolean);
   if (!images) return candidates[0];
   const hit = candidates.find(n=>images.has(n.toLowerCase()));
   if (hit) return images.get(hit.toLowerCase());
   warnings.push('助战「'+card.name+'」缺少 BBC 识别图，已留空；请在 BBC 补选。');
   return null;
  }
  const normal = imageName(support.ce), reward = grandSupport ? imageName(support.reward) : null;
  config.assistEquip = [normal,null,reward];
  const hasServant = Boolean(config['servant_'+assistIdx+'_name']);
  config.assistMode = grandSupport ? (hasServant?'冠位助战':'冠位助战仅礼装')
   : normal ? (hasServant?'从者礼装':'仅礼装') : (hasServant?'仅从者':'不识别');
  const flags = [normal && support.ce, reward && support.reward].filter(Boolean).map(c=>c.mlb);
  config.fullEquip = Number(flags.length > 0 && flags.every(Boolean));
  if (flags.includes(true) && flags.includes(false)) warnings.push('BBC 共用一个满破开关，两张助战礼装的满破条件不同，请在 BBC 核对。');
  for (let wave=1; wave<=3; wave++) {
   const prefix='round'+wave+'_';
   Object.assign(config,{[prefix+'turns']:1,[prefix+'extraStrategy']:null,[prefix+'extraSkill']:[],
    [prefix+'turn0_skill']:[],[prefix+'turn0_np']:[],[prefix+'turn0_strategy']:null,[prefix+'turn0_condition']:null});
  }
  const {bbcBattle,...settings}=snapshot.settings||{};
  if (bbcBattle?.signature===JSON.stringify([assistIdx,...party.map(p=>p.servantId)])) {
   Object.assign(config,bbcBattle.fields);
   // A BBC slot may contain an ordered list of acceptable images. Preserve
   // those alternatives while the corresponding web selection stays the same.
   if(bbcBattle.grand===grandSupport && Array.isArray(bbcBattle.gear)){
    const original=typeof bbcBattle.assistEquip==='string'?[bbcBattle.assistEquip,null,null]:bbcBattle.assistEquip;
    if(Array.isArray(original)){
     const available=v=>!images||v==null||(Array.isArray(v)?v:[v]).every(n=>typeof n==='string'&&images.has(n.toLowerCase()));
     if(available(original[0]) && bbcBattle.gear[0]===(support.ce?.id||0)) config.assistEquip[0]=original[0]??null;
     if(grandSupport && available(original[1]) && available(original[2]) && bbcBattle.gear[1]===(support.reward?.id||0)) {
      config.assistEquip[1]=original[1]??null;config.assistEquip[2]=original[2]??null;
     }
    }
   }
  } else if(bbcBattle) warnings.push('编队站位或成员已更改，请在 BBC 重新设置战斗指令。');
  const bbcFields=Object.fromEntries([...party.map((_,i)=>'servant_'+i+'_name'),'assistIdx','assistMode','assistEquip','fullEquip','servantLevel'].map(k=>[k,config[k]]));
  config.chaldeaBondLab = {...snapshot,settings,bbcFields,warnings};
  return {config,warnings};
 }
 function filename(region) {
  return '牵绊编队_'+region+'_'+new Date().toISOString().replace(/[:.]/g,'-')+'_'+crypto.randomUUID().slice(0,8)+'.json';
 }
 async function write(root, snapshot) {
  const server=snapshot.region==='JP'?'JP':'CH';
  const readJson=async name=>JSON.parse((await (await (await root.getFileHandle(name)).getFile()).text()).replace(/^\uFEFF/,''));
  let settings, records;
  try {
   settings=await root.getDirectoryHandle('settings');
   records=await readJson('servant_info_'+server+'.json');
  } catch (e) {
   if(e.name==='NotFoundError') throw Error('请选择 BBchannel 安装目录，其中应有 settings 文件夹和 servant_info_'+server+'.json。');
   throw e;
  }
  const names=Object.fromEntries(Object.entries(records).filter(([,v])=>v?.SN).map(([name,v])=>[v.SN,name]));
  if (!Object.keys(names).length) throw Error('BBC 从者资料为空，请检查选中的安装目录。');
  const images=new Map();
  try{
   let dir=root;
   for(const part of ['assets','assist','assist_equip']) dir=await dir.getDirectoryHandle(part);
   for await (const [name, entry] of dir.entries()) if(entry.kind==='file' && /\.png$/i.test(name))
    images.set(name.slice(0,-4).toLowerCase(),name.slice(0,-4));
  }catch(e){if(e.name!=='NotFoundError')throw e;}
  let masterEquip=1;
  try{masterEquip=(await readJson('scripts_settings.json')).page0?.master_equip ?? 1;}
  catch(e){if(e.name!=='NotFoundError')throw e;}
  const {config,warnings}=build(snapshot,names,images,masterEquip);
  const name=filename(snapshot.region);
  const file=await settings.getFileHandle(name,{create:true});
  const stream=await file.createWritable();
  try {await stream.write(JSON.stringify(config,null,2));await stream.close();}
  catch(e){await stream.abort().catch(()=>{});await settings.removeEntry(name).catch(()=>{});throw e;}
  return {name,warnings};
 }
 return {build,write,filename,imageAliases};
})();
if (typeof module!=='undefined') module.exports=BBChannel;
if (typeof document!=='undefined') {
 const feedback=$('bbcFeedback'), message=$('bbcMessage');
 let rootHandle=null, busy=false;
 const dbReady=new Promise(resolve=>{
  try {
   const req=indexedDB.open('chaldea-bbc',1);
   req.onupgradeneeded=()=>req.result.createObjectStore('paths');
   req.onerror=req.onblocked=()=>resolve(null);
   req.onsuccess=()=>{const db=req.result,read=db.transaction('paths').objectStore('paths').get('bbc');
    read.onsuccess=()=>{if (!rootHandle) rootHandle=read.result;resolve(db);};read.onerror=()=>resolve(db);};
  }catch{resolve(null);}
 });
 function snapshot() {
  const conditions=inputs();
  const grand=conditions.grandMode!=='off';
  const grandSupport=grand && conditions.supportGrand;
  function card(id, mlb) {
   const c=getCE(id);return c ? {id:c.id,name:c.name,aliases:c.aliases || [],mlb:Boolean(mlb),level:state.ceLevels?.[id]||1} : null;
  }
  const party=state.order.map((idx,pos)=>{
   const support=idx===5,slot=state.manualSlots[idx],active=support||idx<+conditions.count;
   const s=active?getSvt(support?state.supportServant:slot.servantId):null;
   const chosen=s&&!support && (state.forms[s.id] && state.forms[s.id]!=='auto'?state.forms[s.id]:slot.autoForm);
   const v=s?.variants.find(v=>v.key===chosen) || s?.variants[0];
   const gear=active?ceAt(idx):{};
   const crown=grand && (support?grandSupport:!!s && s.id===+conditions.grandId);
   const rewardId=support?supportCeId('supportReward'):conditions.grandReward==='auto'?state.resolvedReward:+conditions.grandReward;
   const row=$('partyGrid').querySelector('[data-position="'+pos+'"]');
   return {position:pos+1,support,crown,servantId:s?.id||0,name:s?.name||null,form:v?.key||null,formLabel:v?.label||null,
    level:s?state.svtLevels[s.id]||1:null,ce:card(gear.id,gear.mlb),reward:crown?card(rewardId,support?conditions.supportRewardMlb:state.ces[rewardId]?.mlb):null,
    bond:row?.querySelector('.slot-bond b')?.textContent||null};
  });
  if(!party.some(s=>!s.support && s.servantId)) throw Error('请先选择自有从者，或点击「寻找最优队伍」。');
  return {version:1,region:D.region,grandSupport,party,summary:$('resultBody').innerText,settings:structuredClone({...state,inputs:conditions})};
 }
 async function exportTeam(downloadOnly=false,change=false) {
  if (busy) return;
  busy=true; $('bbcExport').disabled=true; feedback.hidden=false;
  $('bbcChange').hidden=typeof window.showDirectoryPicker!=='function';
  try {
   const team=snapshot();
   if(downloadOnly || !window.showDirectoryPicker) {
    const response=await fetch('bbc-names.json?v=1');
    if(!response.ok)throw Error('BBC 名称表加载失败，请重试。');
    const {config,warnings}=BBChannel.build(team,await response.json(),null);
    const url=URL.createObjectURL(new Blob([JSON.stringify(config,null,2)],{type:'application/json;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=BBChannel.filename(D.region);link.click();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    message.textContent='已生成 '+link.download+'。在 BBC「文件」中打开，并核对本机助战识别图。'+warnings.join(' ');return;
   }
   let root=change?null:rootHandle;
   if (!root) root=await window.showDirectoryPicker({id:'bbchannel',mode:'readwrite'});
   else if(await root.requestPermission({mode:'readwrite'})!=='granted')throw Error('需要本机目录写入权限。可更换 BBC 目录或下载队伍文件。');
   const result=await BBChannel.write(root,team);
   rootHandle=root;
   dbReady.then(db=>{if(db){try{db.transaction('paths','readwrite').objectStore('paths').put(root,'bbc');}catch{}}});
   message.textContent='已写入 '+root.name+'/settings/'+result.name+'。请在 BBC「文件」中打开。'+result.warnings.join(' ');
  }catch(e){
   message.textContent=e.name==='AbortError'?'已取消选择目录。':e.name==='SecurityError'||e.name==='NotAllowedError'?'浏览器未允许访问本机目录。可下载队伍文件，在 BBC「文件」中打开。':e.message;
  }finally{busy=false;$('bbcExport').disabled=false;}
 }
 const inputFile=$('bbcFile');
 $('bbcImport').onclick=()=>{if(!busy){inputFile.value='';inputFile.click();}};
 inputFile.onchange=async()=>{
  const file=inputFile.files?.[0];if(!file||busy)return;
  busy=true;$('bbcImport').disabled=$('bbcExport').disabled=true;
  feedback.hidden=false;$('bbcChange').hidden=typeof window.showDirectoryPicker!=='function';
  try {
   const cfg=JSON.parse((await file.text()).replace(/^\uFEFF/,''));
   const region=BBCImport.regionOf(cfg,D.region);
   const key=region==='CN'?'chaldea-bond-v1':'chaldea-bond-v1-JP';
   const load=async url=>{const r=await fetch(url);if(!r.ok)throw Error('读取资料失败，请重试。');return r;};
   let data=D;
   if(region!==D.region){
    const raw=(await (await load(region==='CN'?'data.js?v=20':'data-jp.js?v=20')).text()).trim();
    const prefix='globalThis.FGO_DATA=';
    if(!raw.startsWith(prefix)||!raw.endsWith(';'))throw Error('服务器资料格式错误。');
    data=JSON.parse(raw.slice(prefix.length,-1));
   }
   let names=await (await load('bbc-names.json?v=1')).json();
   if(rootHandle && await rootHandle.queryPermission({mode:'read'})==='granted'){
    try {
     const f=await rootHandle.getFileHandle('servant_info_'+(region==='CN'?'CH':'JP')+'.json');
     const catalog=JSON.parse((await (await f.getFile()).text()).replace(/^\uFEFF/,''));
     names={...names,...Object.fromEntries(Object.entries(catalog).filter(([,v])=>v?.SN).map(([name,v])=>[v.SN,name]))};
    }catch{/* Use the bundled dictionary when the installation has moved. */}
   }
   const previous=region===D.region?{...state,inputs:inputs()}:JSON.parse(localStorage.getItem(key)||'{}');
   const imported=BBCImport.convert(cfg,data,names,BBChannel,previous);
   const label=region==='CN'?'国服':'日服';
   const notice='已从 BBC 导入「'+file.name+'」。'+imported.warnings.join(' ');
   if(!confirm('用「'+file.name+'」替换'+label+'当前编队？已命名保存的方案会保留。'+(imported.warnings.length?'\n\n'+imported.warnings.join('\n'):''))){
    message.textContent='已取消导入。';return;
   }
   localStorage.setItem(key,JSON.stringify(imported.state));
   try{sessionStorage.setItem('bbc-import-notice-'+region,notice);}catch{}
   const url=new URL(location.href);url.searchParams.set('region',region);url.hash='workspace';
   if(region===D.region){history.replaceState(null,'',url.href);location.reload();}else location.assign(url.href);
  } catch(e){message.textContent=e instanceof SyntaxError?'文件不是有效的 JSON，当前编队已保留。':e.message;}
  finally{busy=false;$('bbcImport').disabled=$('bbcExport').disabled=false;}
 };
 try{
  const key='bbc-import-notice-'+D.region,notice=sessionStorage.getItem(key);
  if(notice){feedback.hidden=false;message.textContent=notice;sessionStorage.removeItem(key);}
 }catch{}
 $('bbcExport').onclick=()=>exportTeam();
 $('bbcChange').onclick=()=>exportTeam(false,true);
 $('bbcDownload').onclick=()=>exportTeam(true);
}

