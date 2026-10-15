(function () {
  'use strict';
  const auth = firebase.auth(), db = firebase.database();
  let panel, supports = {}, visitors = {}, supportCounts = {}, visitorCount = 0, listeners = [];
  const esc = text => String(text ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const time = value => new Date(value).toLocaleString('es-CO', { timeZone: 'America/Bogota' });
  function render() {
    if (!panel) return;
    let count = 0, mismatch = 0;
    Object.keys(supports).forEach(key => { const n = Object.keys(supports[key] || {}).length; count += n; if (n !== Number(supportCounts[key] || 0)) mismatch++; });
    Object.keys(supportCounts).forEach(key => { if (!supports[key] && Number(supportCounts[key]) !== 0) mismatch++; });
    const visitRecords = Object.keys(visitors).length;
    panel.querySelector('[data-audit-summary]').textContent = 'Apoyos autenticados: ' + count + ' · Cuentas Google visitantes: ' + visitRecords + '. ' + (mismatch || visitRecords !== visitorCount ? 'Hay una diferencia entre contadores y registros. Revisa antes de consolidar resultados.' : 'Los contadores coinciden con los registros de auditoría.');
  }
  auth.onAuthStateChanged(user => {
    listeners.forEach(({ref, callback}) => ref.off('value', callback)); listeners = [];
    if (panel) panel.hidden = true;
    if (!user || user.email !== 'jarspp19802008@gmail.com' || !user.emailVerified) return;
    if (!panel) {
      panel = document.createElement('section'); panel.className = 'integrity-audit';
      panel.innerHTML = '<h2>Control de apoyos para el premio</h2><p data-audit-summary role="status">Cargando auditoría…</p><p>Cuenta Google autenticada no significa persona única. El historial de likes anónimos permanece separado. Los registros nuevos incluyen fecha del servidor y no se pueden editar desde el aplicativo.</p><button type="button" data-audit-export>Descargar auditoría CSV</button>';
      const approved = document.getElementById('approvedShops');
      if (approved?.parentNode) approved.parentNode.insertBefore(panel, approved);
      else document.querySelector('main').append(panel);
      panel.querySelector('[data-audit-export]').onclick = async () => {
        const rows = [['tipo','comercio','id_comercio','cuenta_google','uid_firebase','fecha_hora_bogota','fecha_servidor_ms']];
        const shopData = (await db.ref('approvedShops').once('value')).val() || {};
        for (const [key, records] of Object.entries(supports)) {
          const shop = key.startsWith('contest-') ? shopData._contestEntries?.[key.slice(8)] : shopData[key];
          for (const [account, record] of Object.entries(records || {})) rows.push(['apoyo',shop?.name || key,key,account,record.uid,time(record.createdAt),record.createdAt]);
        }
        for (const [account, record] of Object.entries(visitors)) rows.push(['visita','','',account,record.uid,time(record.createdAt),record.createdAt]);
        const cell = value => '"' + String(value ?? '').replace(/^[=+@-]/,'\u0027$&').replace(/"/g,'""') + '"';
        const blob = new Blob(['\uFEFF' + rows.map(row => row.map(cell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob), link = document.createElement('a');
        link.href = url; link.download = 'auditoria-apoyos-neiva-2026.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      };
    }
    panel.hidden = false;
    [['verifiedSupports',value=>supports=value||{}],['verifiedVisitors',value=>visitors=value||{}],['verifiedSupportCounts',value=>supportCounts=value||{}],['verifiedVisitorCount',value=>visitorCount=Number(value)||0]].forEach(([path,assign])=>{
      const ref=db.ref(path),callback=snap=>{assign(snap.val());render();};
      ref.on('value',callback,()=>{panel.querySelector('[data-audit-summary]').textContent='No se pudo leer la auditoría. Comprueba la sesión de administración.';});listeners.push({ref,callback});
    });
  });
})();