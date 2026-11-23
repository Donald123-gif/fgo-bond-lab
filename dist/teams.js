(() => {
 const libraryKey = 'fgo-teams-v1-' + D.region;
 const list = $('teamList');
 const message = text => { $('teamMessage').textContent = text; };
 function read() {
  const entries = JSON.parse(localStorage.getItem(libraryKey) || '[]');
  if (!Array.isArray(entries)) throw Error('invalid library');
  return entries;
 }
 function refresh(entries, name) {
  list.replaceChildren(...entries.map(entry => new Option(entry.name,entry.name)));
  if (name) list.value = name;
  list.disabled = $('loadTeam').disabled = $('deleteTeam').disabled = !entries.length;
  if (!entries.length) list.add(new Option('暂无保存的方案',''));
 }
 function action(callback) {
  try { callback(read()); }
  catch { message('无法读写本机存档，请检查浏览器存储空间和站点权限。'); }
 }
 $('manageTeams').onclick = () => {
  $('teamsHint').textContent = (D.region === 'CN' ? '国服' : '日服') + ' · 保存在此浏览器。载入会恢复该方案的编队、持有候选和计算条件。';
  $('teamName').value = '';
  message('');
  refresh([]);
  $('teamsDialog').showModal();
  action(entries => refresh(entries));
 };
 $('saveTeamForm').onsubmit = event => {
  event.preventDefault();
  const name = $('teamName').value.trim();
  if (!name) { message('请输入方案名称。'); return; }
  action(entries => {
   const old = entries.findIndex(entry => entry.name === name);
   if (old >= 0 && !confirm('覆盖已保存的「' + name + '」？')) return;
   const entry = {name, state:{...state, inputs:inputs()}};
   if (old < 0) entries.push(entry); else entries[old] = entry;
   localStorage.setItem(libraryKey, JSON.stringify(entries));
   refresh(entries,name);
   message('已保存「' + name + '」。');
  });
 };
 $('loadTeam').onclick = () => action(entries => {
  const entry = entries.find(row => row.name === list.value);
  if (!entry) { refresh(entries); return; }
  if (!confirm('载入「' + entry.name + '」并替换当前编队和计算配置？')) return;
  localStorage.setItem(partyStorageKey, JSON.stringify(entry.state));
  location.reload();
 });
 $('deleteTeam').onclick = () => action(entries => {
  const name = list.value;
  if (!confirm('删除已保存的「' + name + '」？')) return;
  const rest = entries.filter(entry => entry.name !== name);
  localStorage.setItem(libraryKey, JSON.stringify(rest));
  refresh(rest);
  message('方案已删除。');
 });
})();
