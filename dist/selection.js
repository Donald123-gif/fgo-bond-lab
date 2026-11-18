(function(root){
 const emptyFilters=()=>({classes:[],rarities:[],npColors:[],effects:[],traits:[]});
 const normalize=s=>String(s??'').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,' ').trim();
 function matchesSearch(item,query){const hay=normalize([item.name,item.no??item.id,...(item.aliases||[])].join(' '));return normalize(query).split(' ').filter(Boolean).every(q=>hay.includes(q));}
 function filterItems(items,kind,f,query,sort='number',levels={}){const rows=items.filter(x=>matchesSearch(x,query)&&(!f.rarities.length||f.rarities.includes(x.rarity))&&(kind==='servant'?(!f.classes.length||f.classes.includes(x.class==='beastEresh'?'beast':x.class))&&(!f.npColors.length||f.npColors.some(c=>x.npColors?.includes(c)))&&(!f.traits.length||f.traits.some(t=>x.variants.some(v=>v.traits.includes(t)))):(!f.effects.length||f.effects.some(t=>x.effectTypes?.includes(t)))));return rows.sort((a,b)=>{const n=(a.no??a.id)-(b.no??b.id);switch(sort){case'rarityDesc':return b.rarity-a.rarity||n;case'costAsc':return a.cost-b.cost||n;case'costDesc':return b.cost-a.cost||n;case'levelDesc':return (levels[b.id]||1)-(levels[a.id]||1)||n;case'levelAsc':return (levels[a.id]||1)-(levels[b.id]||1)||n;default:return n}})}
 root.FGOSelection={emptyFilters,normalize,matchesSearch,filterItems};if(typeof module!=='undefined')module.exports=root.FGOSelection;
})(globalThis);
