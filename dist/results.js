function formDetails(s,v,o,r){
 const relevant=[...r.ces,...(r.grandReward?[r.grandReward]:[])].map(id=>{const c=D.ces.find(c=>c.id===id);return {name:c.name,e:BondSolver.effect(c,o.ces[id].mlb)}});
 for(const [id,mlb,label] of [[o.support,o.supportMlb,'助战普通槽'],[o.grandMode!=='off'&&o.supportGrand?o.supportReward:0,o.supportRewardMlb,'助战报酬槽']]){const c=D.ces.find(c=>c.id===+id);if(c)relevant.push({name:label+' · '+c.name,e:BondSolver.effect(c,mlb)})}
 const warnings=[];for(const c of relevant){const active=s.variants.filter(x=>BondSolver.matches(x.traits,c.e)),inactive=s.variants.filter(x=>!BondSolver.matches(x.traits,c.e));if(active.length&&inactive.length){warnings.push(`<p><b>${esc(c.name)}</b>：当前形态${BondSolver.matches(v.traits,c.e)?'生效':'不生效'}。<br>生效：${active.map(x=>esc(x.label)).join('；')}。<br>不生效：${inactive.map(x=>esc(x.label)).join('；')}。</p>`)}}
 return warnings.length?`<details class="form-details"><summary>形态影响加成 · ${warnings.length} 项</summary>${warnings.join('')}<p>以战斗形象为准，请关闭随机再临；灵衣仅在实际解锁并启用时可用。</p></details>`:'';
}
function renderResult(){const r=last.result,o=last.options;state.manualSlots=FGOPlacement.place(r,o);state.order=[...o.order];state.resolvedReward=r.grandReward;state.autoSupport={support:r.support,supportReward:r.supportReward};state.locked=[...o.locked];renderParty();$('resultBadge').textContent='已回填最优编队 · 保留锁定位置';save();}
