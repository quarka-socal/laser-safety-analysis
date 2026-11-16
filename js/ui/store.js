/*
 * Lazer Emniyet — envanter ve oturum kaydı (tarayıcı yerel deposu + dosya)
 *
 * Veriler yalnız bu bilgisayarda, tarayıcının yerel deposunda tutulur.
 * Kalıcı yedek için "JSON dışa aktar" kullanın.
 */
(function (root) {
  'use strict';
  const LE = (root.LE = root.LE || {});
  const T = (s, ...a) => (LE.i18n ? LE.i18n.T(s, ...a) : s.replace(/\{(\d+)\}/g, (m, i) => a[i]));

  const KEY_INV = 'lazerEmniyet.envanter.v1';
  const KEY_SES = 'lazerEmniyet.oturum.v1';
  let memory = { [KEY_INV]: '[]', [KEY_SES]: null };
  let persistent = true;

  function getItem(k) {
    try { return root.localStorage.getItem(k); } catch (e) { persistent = false; return memory[k]; }
  }
  function setItem(k, v) {
    try { root.localStorage.setItem(k, v); return true; } catch (e) { persistent = false; memory[k] = v; return false; }
  }

  function loadInventory() {
    try {
      const a = JSON.parse(getItem(KEY_INV) || '[]');
      return Array.isArray(a) ? a.filter(validRecord) : [];
    } catch (e) {
      return [];
    }
  }

  function saveInventory(list) {
    return setItem(KEY_INV, JSON.stringify(list));
  }

  function validRecord(r) {
    return r && typeof r === 'object' && typeof r.id === 'string' && r.state && r.state.v && typeof r.state.v === 'object';
  }

  function newId() {
    return 'L' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1e6).toString(36).toUpperCase();
  }

  function summarize(state, out) {
    const v = state.v;
    const s = {
      name: v.name || '', maker: v.maker || '', modelNo: v.modelNo || '', serial: v.serial || '', inv: v.inv || '',
      cls: v.cls || '', loc: v.loc || '', owner: v.owner || '', lso: v.lso || '', date: v.date || '', status: v.status || '',
      wl: out && out.input ? out.input.lambda : null, mode: v.mode,
    };
    if (out && out.ok) {
      s.nohd = out.eye.nohdInf ? 'inf' : out.eye.nohd;
      s.odWorst = out.eye.odWorst;
      s.marking = out.eyewear ? out.eyewear.marking : '';
      s.nhz = out.diffuse ? out.diffuse.eye.nhz : null;
    }
    return s;
  }

  function upsert(rec) {
    const list = loadInventory();
    const i = list.findIndex((r) => r.id === rec.id);
    if (i >= 0) list[i] = rec; else list.push(rec);
    const ok = saveInventory(list);
    return { ok, list };
  }

  /** Kaydın kopyası (yeni kimlik, "(kopya)" ekli ad). Özeti olmayan içe aktarılmış kayıtlarda da çalışır. */
  function duplicate(rec, suffix) {
    const c = JSON.parse(JSON.stringify(rec));
    c.id = newId();
    c.savedAt = new Date().toISOString();
    c.state.v.name = (c.state.v.name || '') + (suffix || ' (kopya)');
    c.summary = Object.assign({}, c.summary || {}, { name: c.state.v.name });
    return c;
  }

  function remove(id) {
    const list = loadInventory().filter((r) => r.id !== id);
    saveInventory(list);
    return list;
  }

  function saveSession(state) {
    setItem(KEY_SES, JSON.stringify({ savedAt: new Date().toISOString(), state }));
  }

  function loadSession() {
    try {
      const s = JSON.parse(getItem(KEY_SES) || 'null');
      return s && s.state && s.state.v ? s.state : null;
    } catch (e) {
      return null;
    }
  }

  function download(name, text, mime) {
    // Android uygulaması (WebView) blob indirmesini desteklemez: yerel köprü dosya seçiciyle kaydeder
    const bridge = root.LazerAndroid;
    if (bridge && typeof bridge.saveFile === 'function') {
      bridge.saveFile(String(name), String(mime || 'application/octet-stream'), String(text));
      return;
    }
    const blob = new Blob([text], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
  }

  function stamp() {
    const d = new Date();
    return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  }

  function exportJSON(list) {
    const doc = { format: 'lazer-emniyet-envanter', version: 1, exportedAt: new Date().toISOString(), engine: LE.analysis.ENGINE_VERSION, records: list };
    download(T('lazer-envanter-{0}.json', stamp()), JSON.stringify(doc, null, 1), 'application/json');
  }

  /** İçe aktarma: geçerli kayıtları ekler, aynı kimlikli kayıtları günceller. */
  function importJSON(text) {
    const doc = JSON.parse(text);
    const recs = Array.isArray(doc) ? doc : (doc && Array.isArray(doc.records) ? doc.records : null);
    if (!recs) throw new Error('Dosya biçimi tanınmadı (lazer-emniyet-envanter bekleniyor).');
    const list = loadInventory();
    let added = 0;
    let updated = 0;
    let skipped = 0;
    for (const r of recs) {
      if (!validRecord(r)) { skipped++; continue; }
      const i = list.findIndex((x) => x.id === r.id);
      if (i >= 0) { list[i] = r; updated++; } else { list.push(r); added++; }
    }
    saveInventory(list);
    return { added, updated, skipped, list };
  }

  function csvCell(v) {
    const s = v === null || v === undefined ? '' : String(v);
    return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function num(v, d) {
    if (v === 'inf') return '∞';
    if (typeof v !== 'number' || !Number.isFinite(v)) return '';
    return v.toFixed(d).replace('.', ',');
  }

  function exportCSV(list) {
    const head = ['Tanım', 'Üretici', 'Model', 'Seri no', 'Envanter no', 'Sınıf', 'Konum', 'Sorumlu', 'LGS', 'Durum', 'Dalga boyu (nm)', 'Mod', 'NOHD (m)', 'En kötü OD', 'EN 207', 'Yaygın NHZ (m)', 'Analiz tarihi', 'Kayıt'].map((h) => T(h));
    const modeTxt = { cw: T('Sürekli'), sp: T('Tek darbe'), rp: T('Tekrarlı darbe') };
    const en = LE.i18n && LE.i18n.lang() === 'en';
    const rows = list.map((r) => {
      const s = r.summary || {};
      const n = (v, d) => (en ? num(v, d).replace(',', '.') : num(v, d));
      return [s.name, s.maker, s.modelNo, s.serial, s.inv, s.cls, s.loc, s.owner, s.lso, s.status ? T(s.status) : '', n(s.wl, 1), modeTxt[s.mode] || s.mode, n(s.nohd, 2), n(s.odWorst, 2), s.marking, n(s.nhz, 3), s.date, (r.savedAt || '').slice(0, 10)].map(csvCell).join(';');
    });
    download(T('lazer-envanter-{0}.csv', stamp()), '﻿' + head.join(';') + '\r\n' + rows.join('\r\n'), 'text/csv;charset=utf-8');
  }

  LE.store = {
    loadInventory, saveInventory, upsert, remove, duplicate, newId, summarize, saveSession, loadSession,
    exportJSON, importJSON, exportCSV, download, isPersistent: () => persistent,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
