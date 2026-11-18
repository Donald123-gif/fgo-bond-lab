import json,urllib.request,pathlib,datetime
ROOT=pathlib.Path(__file__).parent
sources={k:'https://api.atlasacademy.io/export/CN/nice_'+v+'.json' for k,v in [('servants','servant_lore'),('ces','equip')]}
def get(k):
 p=pathlib.Path('/tmp/fgo-'+('servants-lore' if k=='servants' else 'ce')+'.json')
 return json.loads(p.read_text()) if p.exists() else json.load(urllib.request.urlopen(sources[k]))
aliases=json.loads((ROOT/'aliases.json').read_text(encoding='utf8'))
servants=[]
for s in get('servants'):
 if s['type'] not in ['normal','heroine'] or s['collectionNo']<=0:continue
 base=[t['id'] for t in s['traits']]; variants=[]
 faces=s['extraAssets'].get('faces',{}); add=s['ascensionAdd']
 groups={}
 for k in ['0','1','2','3','4']:
  ts=add['individuality'].get('ascension',{}).get(k) or s['traits']
  trait_ids=[t['id'] for t in ts];cost=add['overwriteCost'].get('ascension',{}).get(k,s['cost'])
  stage=1 if k=='0' else 2 if k in ['1','2'] else 3
  label='第'+str(stage)+'阶段'
  signature=(tuple(sorted(trait_ids)),cost)
  if signature in groups:
   v=groups[signature]
   if label not in v['labels']:v['labels'].append(label)
   v['rawKeys'].append('ascension'+k)
  else:
   v={'key':'ascension'+k,'labels':[label],'rawKeys':['ascension'+k],'traits':trait_ids,'cost':cost,'image':faces.get('ascension',{}).get(str(stage),''),'name':add['overWriteServantName'].get('ascension',{}).get(k,s['name'])};groups[signature]=v
 for v in groups.values():
  v['label']=' / '.join(v.pop('labels'))
  if len(groups)==1:v['key']='base';v['label']+='（特性相同）'
  variants.append(v)
 costumes=s.get('profile',{}).get('costume',{})
 for key,info in costumes.items():
  if not info.get('costumeCollectionNo'):continue
  def cv(field,default):
   values=add.get(field,{}).get('costume',{})
   return values.get(key,values.get(str(info['id']),default))
  ts=cv('individuality',[]) or s['traits'];cost=cv('overwriteCost',s['cost'])
  variants.append({'key':'costume'+key,'rawKeys':['costume'+key,'costume'+str(info['id'])],'label':'灵衣 · '+info['name'],'traits':[t['id'] for t in ts],'cost':cost,'image':faces.get('costume',{}).get(key,''),'name':cv('overWriteServantName',s['name'])})
 servants.append({'id':s['id'],'no':s['collectionNo'],'name':s['name'],'class':s['className'],'rarity':s['rarity'],'cost':s['cost'],'traits':variants[0]['traits'],'variants':variants,'image':next(iter(faces.get('ascension',{}).values()),''),'mash':s['type']=='heroine','aliases':aliases['servants'].get(str(s['collectionNo']),[]),'npColors':sorted(set({'1':'Arts','2':'Buster','3':'Quick'}[n['card']] for n in s['noblePhantasms'] if n['card'] in ['1','2','3'])),'art':next(iter(s['extraAssets'].get('charaGraph',{}).get('ascension',{}).values()),'')})

ces=[]
catalog=[]
for e in get('ces'):
 if e['collectionNo']<=0 or not 1<=e['rarity']<=5:continue
 all_functions=[f for sk in e['skills'] for f in sk['functions']]
 kinds=set()
 for f in all_functions:
  typ=f['funcType'];buffs=[b['type'] for b in f.get('buffs',[])]
  if typ=='gainNp':kinds.add('initialNp')
  if any(b in ['upAtk','upCommandall','upDamage'] for b in buffs):kinds.add('attack')
  if 'upNpdamage' in buffs:kinds.add('npDamage')
  if any('critical' in b.lower() or b in ['upCriticaldamage','gainStar'] for b in buffs) or typ=='gainStar':kinds.add('critical')
  if typ=='servantFriendshipUp':kinds.add('bond')
  if typ in ['qpDropUp','expUp','userEquipExpUp','friendPointUpDuplicate']:kinds.add('reward')
  if any(v.get('EventId') for v in f.get('svals',[])) or any(sk.get('eventId') for sk in e.get('skillSvts',[])):kinds.add('event')
 if any('活动限定' in sk.get('detail','') for sk in e['skills']):kinds.add('event')
 record={'id':e['collectionNo'],'name':e['name'],'rarity':e['rarity'],'cost':e['cost'],'maxLevel':e['lvMax'],'aliases':aliases['ces'].get(str(e['collectionNo']),[]),'effectTypes':sorted(kinds),'detail':e['skills'][0].get('detail','') if e['skills'] else '无效果','image':next(iter(e['extraAssets'].get('faces',{}).get('equip',{}).values()),''),'art':next(iter(e['extraAssets'].get('charaGraph',{}).get('equip',{}).values()),'')}
 catalog.append(record)
 effects=[]
 for sk in e['skills']:
  for f in sk['functions']:
   if f['funcType']!='servantFriendshipUp' or f['funcTargetType']!='ptFull':continue
   v=f['svals'][0]
   if v.get('EventId') or f.get('funcquestTvals'):continue
   clauses=f.get('script',{}).get('overwriteTvals')
   if clauses:clauses=[[t['id'] for t in row] for row in clauses]
   else:clauses=[[t['id']] for t in f['functvals']]
   effects.append({'mlb':sk.get('condLimitCount',0)==4,'rate':v.get('RateCount',0)/10,'flat':v.get('AddCount',0),'supportRate':f.get('followerVals',[v])[0].get('RateCount',0)/10,'clauses':clauses,'detail':sk.get('detail','')})
 if not effects:continue
 ces.append({**record,'effects':effects})
ces.sort(key=lambda c:(-max(e['rate'] for e in c['effects']),c['id']))
d={'region':'CN','retrieved':datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).date().isoformat(),'sources':sources,'servants':sorted(servants,key=lambda s:s['no']),'ces':ces,'catalogCes':sorted(catalog,key=lambda c:c['id'])}
(ROOT/'dist'/'data.js').write_text('globalThis.FGO_DATA='+json.dumps(d,ensure_ascii=False,separators=(',',':'))+';',encoding='utf8')
print('Catalog:',len(catalog));print(len(servants),'servants',len(ces),'CEs',[(c['id'],c['name']) for c in ces])
