(function(root){
function place(r,o){
 const slots=Array.from({length:5},()=>({servantId:0,ceId:0,autoServant:true,autoCE:true})),used=new Set(),position=i=>o.order.indexOf(i),manual=o.manualSlots||[];
 function put(i,g){slots[i]={...slots[i],servantId:g.id,autoForm:g.variant,autoServant:!o.locked.includes(g.id),servantLocked:!!manual[i]?.servantLocked};used.add(g.id)}
 for(let i=0;i<o.count;i++)if(manual[i]?.servantLocked&&manual[i].servantId){const g=r.team.find(g=>g.id===manual[i].servantId);if(!g||g.front!==(position(i)<3))throw Error('锁定从者的位置与计算结果不一致。');put(i,g)}
 for(let i=0;i<o.count;i++)if(!slots[i].servantId){const g=r.team.find(g=>!used.has(g.id)&&g.front===(position(i)<3));if(!g)throw Error('没有可回填当前前后排的从者。');put(i,g)}
 const assigned=new Set(),required=new Set(manual.map(s=>s.ceId).filter(Boolean));
 function equip(i,id,locked=false){slots[i].ceId=id;slots[i].autoCE=!required.has(id);slots[i].ceLocked=locked;assigned.add(id)}
 for(let i=0;i<o.count;i++)if(manual[i]?.ceLocked&&manual[i].ceId)equip(i,manual[i].ceId,true);
 for(const sl of manual){if(!sl.ceId||assigned.has(sl.ceId))continue;const i=slots.findIndex(s=>s.servantId===sl.servantId&&!s.ceId);if(i>=0)equip(i,sl.ceId)}
 for(const id of [...required,...r.ces]){if(assigned.has(id))continue;const i=slots.findIndex((s,i)=>i<o.count&&!s.ceId);if(i<0)throw Error('礼装数量超过可用普通槽。');equip(i,id)}
 let reserved=+o.reserveSlots-(o.manualCombatSlots?.length||0);for(let i=0;i<o.count;i++)if(!slots[i].ceId&&reserved-->0)slots[i].reservedCombat=true;
 return slots;
}
root.FGOPlacement={place};if(typeof module!=='undefined')module.exports=root.FGOPlacement;
})(globalThis);
