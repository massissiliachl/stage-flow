(function () {
  const $ = (id) => document.getElementById(id);
  let currentView = 'dashboard';
  let listMode = null;
  let listItems = [];

  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3500);
  }

  function badge(status) {
    const s = status || 'approved';
    return `<span class="badge ${s}">${s}</span>`;
  }

  function showLogin() {
    $('loginScreen').classList.remove('hidden');
    $('appScreen').classList.add('hidden');
  }

  function showApp(admin) {
    $('loginScreen').classList.add('hidden');
    $('appScreen').classList.remove('hidden');
    $('adminName').textContent = admin?.name || admin?.email || '';
  }

  async function loadDashboard() {
    const stats = await window.adminApi.stats();
    const g = $('statsGrid');
    const e = stats.entreprises || {};
    const s = stats.etudiants || {};
    g.innerHTML = `
      <div class="stat-card"><div class="num">${e.pending || 0}</div><div class="lbl">Entreprises en attente</div></div>
      <div class="stat-card"><div class="num">${e.total || 0}</div><div class="lbl">Entreprises totales</div></div>
      <div class="stat-card"><div class="num">${s.pending || 0}</div><div class="lbl">Étudiants en attente</div></div>
      <div class="stat-card"><div class="num">${s.total || 0}</div><div class="lbl">Étudiants totaux</div></div>
    `;
    if (!stats.adminVerificationEnabled) {
      g.innerHTML += '<p class="sub" style="grid-column:1/-1">Migration admin non détectée — redémarrez l’API avec DATABASE_URL.</p>';
    }
  }

  function setView(name) {
    currentView = name;
    document.querySelectorAll('.nav-item').forEach((b) => {
      b.classList.toggle('active', b.dataset.view === name);
    });
    $('viewDashboard').classList.toggle('hidden', name !== 'dashboard');
    $('viewList').classList.toggle('hidden', !name.startsWith('entreprises') && !name.startsWith('etudiants'));
    $('viewAudit').classList.toggle('hidden', name !== 'audit');
    $('detailPanel').classList.add('hidden');
  }

  async function loadList(mode) {
    listMode = mode;
    const pending = mode.includes('pending');
    const isEnt = mode.startsWith('entreprises');
    $('listTitle').textContent = isEnt
      ? (pending ? 'Entreprises — validation NIF / NIS / NRC' : 'Toutes les entreprises')
      : (pending ? 'Étudiants — validation matricule' : 'Tous les étudiants');

    const params = {};
    if (pending) params.status = 'pending';
    const q = $('searchInput').value.trim();
    if (q) params.q = q;

    const data = isEnt
      ? await window.adminApi.entreprises(params)
      : await window.adminApi.etudiants(params);
    listItems = data.items || [];

    const head = $('listHead');
    const body = $('listBody');
    if (isEnt) {
      head.innerHTML = '<tr><th>Raison sociale</th><th>NIF</th><th>NIS</th><th>NRC</th><th>Statut</th></tr>';
      body.innerHTML = listItems.map((r) => `
        <tr data-kind="ent" data-id="${r.id}">
          <td>${esc(r.nom)}</td>
          <td>${esc(r.nif)}</td>
          <td>${esc(r.nis || '—')}</td>
          <td>${esc(r.nrc)}</td>
          <td>${badge(r.admin_verification_status)}</td>
        </tr>`).join('');
    } else {
      head.innerHTML = '<tr><th>Nom</th><th>Matricule</th><th>Faculté</th><th>Statut</th></tr>';
      body.innerHTML = listItems.map((r) => `
        <tr data-kind="stu" data-id="${r.id}">
          <td>${esc(r.display_name)}</td>
          <td>${esc(r.matricule)}</td>
          <td>${esc(r.faculte || '—')}</td>
          <td>${badge(r.admin_verification_status)}</td>
        </tr>`).join('');
    }
  }

  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function openDetailEnt(row) {
    $('detailPanel').classList.remove('hidden');
    $('detailContent').innerHTML = `
      <h3>${esc(row.nom)}</h3>
      <dl>
        <dt>Identifiant</dt><dd>${esc(row.identifiant)}</dd>
        <dt>Email</dt><dd>${esc(row.user_email || row.email_contact)}</dd>
        <dt>NIF</dt><dd>${esc(row.nif)}</dd>
        <dt>NIS</dt><dd>${esc(row.nis || '—')}</dd>
        <dt>NRC</dt><dd>${esc(row.nrc)}</dd>
        <dt>Wilaya</dt><dd>${esc(row.wilaya)}</dd>
        <dt>Téléphone</dt><dd>${esc(row.phone)}</dd>
      </dl>
      <div class="check-row">
        <label><input type="checkbox" id="vNif" ${row.nif_verified ? 'checked' : ''}> NIF vérifié</label>
        <label><input type="checkbox" id="vNis" ${row.nis_verified ? 'checked' : ''}> NIS vérifié</label>
        <label><input type="checkbox" id="vNrc" ${row.nrc_verified ? 'checked' : ''}> NRC vérifié</label>
      </div>
      <label>Notes internes</label>
      <textarea id="adminNotes">${esc(row.admin_notes || '')}</textarea>
      <label>Motif de refus</label>
      <textarea id="rejectReason">${esc(row.admin_rejection_reason || '')}</textarea>
      <div class="detail-actions">
        <button type="button" class="btn ok sm" id="btnApproveEnt">Approuver</button>
        <button type="button" class="btn bad sm" id="btnRejectEnt">Refuser</button>
        <button type="button" class="btn ghost sm" id="btnSaveEnt">Enregistrer coches</button>
      </div>
    `;
    $('btnApproveEnt').onclick = () => saveEnt(row.id, 'approved', true);
    $('btnRejectEnt').onclick = () => saveEnt(row.id, 'rejected', false);
    $('btnSaveEnt').onclick = () => saveEnt(row.id, null, null);
  }

  async function saveEnt(id, status, approveAll) {
    const body = {
      nifVerified: $('vNif').checked,
      nisVerified: $('vNis').checked,
      nrcVerified: $('vNrc').checked,
      notes: $('adminNotes').value,
      rejectionReason: $('rejectReason').value,
    };
    if (status) {
      body.status = status;
      if (approveAll) {
        body.nifVerified = true;
        body.nrcVerified = true;
      }
    }
    await window.adminApi.patchEntreprise(id, body);
    toast(status === 'approved' ? 'Entreprise approuvée' : status === 'rejected' ? 'Entreprise refusée' : 'Modifications enregistrées');
    await loadList(listMode);
    $('detailPanel').classList.add('hidden');
  }

  function openDetailStu(row) {
    $('detailPanel').classList.remove('hidden');
    $('detailContent').innerHTML = `
      <h3>${esc(row.display_name)}</h3>
      <dl>
        <dt>Matricule</dt><dd>${esc(row.matricule)}</dd>
        <dt>Email</dt><dd>${esc(row.email)}</dd>
        <dt>Spécialité</dt><dd>${esc(row.specialty || '—')}</dd>
        <dt>Faculté</dt><dd>${esc(row.faculte || '—')}</dd>
        <dt>Département</dt><dd>${esc(row.departement || '—')}</dd>
      </dl>
      <div class="check-row">
        <label><input type="checkbox" id="vMat" ${row.matricule_verified ? 'checked' : ''}> Matricule vérifié</label>
      </div>
      <label>Notes internes</label>
      <textarea id="adminNotes">${esc(row.admin_notes || '')}</textarea>
      <label>Motif de refus</label>
      <textarea id="rejectReason">${esc(row.admin_rejection_reason || '')}</textarea>
      <div class="detail-actions">
        <button type="button" class="btn ok sm" id="btnApproveStu">Approuver</button>
        <button type="button" class="btn bad sm" id="btnRejectStu">Refuser</button>
        <button type="button" class="btn ghost sm" id="btnSaveStu">Enregistrer</button>
      </div>
    `;
    $('btnApproveStu').onclick = () => saveStu(row.id, 'approved', true);
    $('btnRejectStu').onclick = () => saveStu(row.id, 'rejected', false);
    $('btnSaveStu').onclick = () => saveStu(row.id, null, null);
  }

  async function saveStu(id, status, verifyMat) {
    const body = {
      matriculeVerified: $('vMat').checked,
      notes: $('adminNotes').value,
      rejectionReason: $('rejectReason').value,
    };
    if (status) {
      body.status = status;
      if (verifyMat) body.matriculeVerified = true;
    }
    await window.adminApi.patchEtudiant(id, body);
    toast(status === 'approved' ? 'Étudiant approuvé' : status === 'rejected' ? 'Étudiant refusé' : 'Modifications enregistrées');
    await loadList(listMode);
    $('detailPanel').classList.add('hidden');
  }

  async function loadAudit() {
    const data = await window.adminApi.audit();
    $('auditBody').innerHTML = (data.items || []).map((a) => `
      <tr>
        <td>${new Date(a.created_at).toLocaleString('fr-FR')}</td>
        <td>${esc(a.admin_email || '—')}</td>
        <td>${esc(a.action)}</td>
        <td>${esc(a.entity_type)} #${esc(a.entity_id)}</td>
        <td><code>${esc(JSON.stringify(a.details || {}))}</code></td>
      </tr>`).join('');
  }

  $('btnLogin').onclick = async () => {
    $('loginError').textContent = '';
    try {
      const data = await window.adminApi.login($('loginEmail').value.trim(), $('loginPassword').value);
      window.adminApi.setToken(data.token);
      showApp(data.admin);
      setView('dashboard');
      await loadDashboard();
    } catch (e) {
      $('loginError').textContent = e.message;
    }
  };

  $('btnLogout').onclick = () => {
    window.adminApi.setToken('');
    showLogin();
  };

  $('closeDetail').onclick = () => $('detailPanel').classList.add('hidden');

  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.onclick = async () => {
      const v = btn.dataset.view;
      setView(v);
      if (v === 'dashboard') await loadDashboard();
      else if (v.startsWith('entreprises') || v.startsWith('etudiants')) await loadList(v);
      else if (v === 'audit') await loadAudit();
    };
  });

  $('searchInput').addEventListener('input', () => {
    if (listMode) loadList(listMode).catch((e) => toast(e.message));
  });

  $('listBody').addEventListener('click', (ev) => {
    const tr = ev.target.closest('tr');
    if (!tr) return;
    const id = tr.dataset.id;
    const kind = tr.dataset.kind;
    const row = listItems.find((x) => String(x.id) === String(id));
    if (!row) return;
    if (kind === 'ent') openDetailEnt(row);
    else openDetailStu(row);
  });

  (async function boot() {
    const token = window.adminApi.getToken();
    if (!token) {
      showLogin();
      return;
    }
    try {
      const me = await window.adminApi.me();
      showApp(me.admin);
      setView('dashboard');
      await loadDashboard();
    } catch (_) {
      window.adminApi.setToken('');
      showLogin();
    }
  })();
})();
