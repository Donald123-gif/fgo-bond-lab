// Load one catalog per page. A region change starts a fresh page and solver.
(async function startPlanner() {
 const names = {CN: '国服', JP: '日服'};
 const url = new URL(location.href);
 const requested = url.searchParams.get('region')?.toUpperCase();
 let preferred;
 try { preferred = localStorage.getItem('fgo-region'); } catch {}
 const region = ['JP','CN'].includes(requested) ? requested : preferred === 'JP' ? 'JP' : 'CN';
 const select = document.getElementById('regionSelect');
 const status = document.getElementById('regionStatus');
 select.value = region;
 const remember = value => { try { localStorage.setItem('fgo-region', value); } catch {} };
 remember(region);
 select.onchange = () => {
  url.searchParams.set('region', select.value);
  url.hash = '';
  location.assign(url.href);
 };
 // Back/forward navigation can restore the previous document from the browser cache.
 window.addEventListener('pageshow', () => { select.value = region; remember(region); });
 const load = src => new Promise((resolve, reject) => {
  const script = document.createElement('script');
  script.onload = resolve;
  script.onerror = reject;
  script.src = src;
  document.body.append(script);
 });
 status.textContent = '正在载入' + names[region] + '数据…';
 document.getElementById('regionLabel').textContent = names[region] + '快照';
 try {
  await load(region === 'CN' ? 'data.js?v=20' : 'data-jp.js?v=20');
  if (globalThis.FGO_DATA?.region !== region) throw Error('region mismatch');
  for (const link of document.querySelectorAll('[data-source]')) {
   link.href = FGO_DATA.sources[link.dataset.source];
   link.textContent = region + (link.dataset.source === 'servants' ? ' 从者数据' : ' 礼装数据');
  }
  const portraits = await fetch('portraits-' + region + '.json?v=15');
  if (!portraits.ok) throw Error('portrait catalog unavailable');
  globalThis.FGO_PORTRAITS = await portraits.json();
  for (const file of ['app','picker','results','teams']) await load(file + (file === 'app' ? '.js?v=21' : '.js?v=20'));
  await load('bbc-import.js?v=1');
  await load('bbc.js?v=2');
  if (FGO_DATA.masterCosts) document.getElementById('level').max = Math.max(...Object.keys(FGO_DATA.masterCosts).map(Number));
  document.querySelector('main').inert = false;
  document.querySelector('.mobile-dock').inert = false;
  status.hidden = true;
 } catch {
  status.textContent = names[region] + '数据载入失败，请刷新重试，或切换服务器。';
 }
})();
