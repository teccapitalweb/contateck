/* ============================================================
   CONTATECK · Módulo 01 · Contabilidad General
   Catálogo de cuentas · Pólizas (Debe/Haber) · Libro Mayor · Balanza
   Datos en el navegador (localStorage). Toma control del módulo
   "contabilidad" del dashboard, reemplazando los datos de ejemplo.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Helpers ---------- */
  const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const fmt = (n) => num(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const hoyISO = () => {
    try { return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" }); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  };
  const fechaCorta = (iso) => {
    const m = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const p = String(iso || "").split("-");
    if (p.length !== 3) return iso || "";
    return `${parseInt(p[2], 10)} ${m[parseInt(p[1], 10) - 1] || ""}`;
  };

  /* ---------- Catálogo base (código agrupador SAT, simplificado) ---------- */
  // nivel 1 = cuenta de mayor (acumula, no afectable) · nivel 2 = detalle (afectable)
  const CATALOGO_BASE = [
    { codigo: "100", nombre: "Activo",                  nat: "Deudora",   nivel: 1, padre: null  },
    { codigo: "101", nombre: "Caja",                    nat: "Deudora",   nivel: 2, padre: "100" },
    { codigo: "102", nombre: "Bancos",                  nat: "Deudora",   nivel: 2, padre: "100" },
    { codigo: "105", nombre: "Clientes",                nat: "Deudora",   nivel: 2, padre: "100" },
    { codigo: "115", nombre: "Inventarios",             nat: "Deudora",   nivel: 2, padre: "100" },
    { codigo: "118", nombre: "IVA acreditable",         nat: "Deudora",   nivel: 2, padre: "100" },
    { codigo: "151", nombre: "Equipo de cómputo",       nat: "Deudora",   nivel: 2, padre: "100" },
    { codigo: "200", nombre: "Pasivo",                  nat: "Acreedora", nivel: 1, padre: null  },
    { codigo: "201", nombre: "Proveedores",             nat: "Acreedora", nivel: 2, padre: "200" },
    { codigo: "205", nombre: "Acreedores diversos",     nat: "Acreedora", nivel: 2, padre: "200" },
    { codigo: "209", nombre: "IVA trasladado",          nat: "Acreedora", nivel: 2, padre: "200" },
    { codigo: "213", nombre: "Impuestos por pagar",     nat: "Acreedora", nivel: 2, padre: "200" },
    { codigo: "216", nombre: "Sueldos por pagar",       nat: "Acreedora", nivel: 2, padre: "200" },
    { codigo: "300", nombre: "Capital contable",        nat: "Acreedora", nivel: 1, padre: null  },
    { codigo: "301", nombre: "Capital social",          nat: "Acreedora", nivel: 2, padre: "300" },
    { codigo: "305", nombre: "Resultado del ejercicio", nat: "Acreedora", nivel: 2, padre: "300" },
    { codigo: "400", nombre: "Ingresos",                nat: "Acreedora", nivel: 1, padre: null  },
    { codigo: "401", nombre: "Ventas y servicios",      nat: "Acreedora", nivel: 2, padre: "400" },
    { codigo: "402", nombre: "Productos financieros",   nat: "Acreedora", nivel: 2, padre: "400" },
    { codigo: "500", nombre: "Costos y gastos",         nat: "Deudora",   nivel: 1, padre: null  },
    { codigo: "501", nombre: "Costo de ventas",         nat: "Deudora",   nivel: 2, padre: "500" },
    { codigo: "601", nombre: "Gastos de operación",     nat: "Deudora",   nivel: 2, padre: "500" },
    { codigo: "602", nombre: "Gastos de administración",nat: "Deudora",   nivel: 2, padre: "500" },
    { codigo: "603", nombre: "Gastos de venta",         nat: "Deudora",   nivel: 2, padre: "500" },
  ];

  /* ---------- Persistencia (localStorage) ---------- */
  const K_CUENTAS = "contateck_cuentas";
  const K_POLIZAS = "contateck_polizas";
  const K_FOLIOS  = "contateck_folios";

  function leerCuentas() {
    try {
      const raw = JSON.parse(localStorage.getItem(K_CUENTAS) || "null");
      if (Array.isArray(raw) && raw.length) return raw;
    } catch (e) { /* siembra abajo */ }
    // Primera vez: sembrar catálogo base con id.
    const sembrado = CATALOGO_BASE.map((c, i) => ({ id: "c" + (i + 1), ...c }));
    guardarCuentas(sembrado);
    return sembrado;
  }
  function guardarCuentas(arr) {
    try { localStorage.setItem(K_CUENTAS, JSON.stringify(arr || [])); return true; }
    catch (e) { return false; }
  }
  function leerPolizas() {
    try {
      const raw = JSON.parse(localStorage.getItem(K_POLIZAS) || "null");
      if (Array.isArray(raw)) return raw;
    } catch (e) {}
    return [];
  }
  function guardarPolizas(arr) {
    try { localStorage.setItem(K_POLIZAS, JSON.stringify(arr || [])); return true; }
    catch (e) { return false; }
  }
  function siguienteFolio(tipo) {
    let folios = {};
    try { folios = JSON.parse(localStorage.getItem(K_FOLIOS) || "{}") || {}; } catch (e) {}
    const letra = tipo === "Ingreso" ? "I" : tipo === "Egreso" ? "E" : "D";
    const n = (folios[letra] || 0) + 1;
    folios[letra] = n;
    try { localStorage.setItem(K_FOLIOS, JSON.stringify(folios)); } catch (e) {}
    return `${letra}-${String(n).padStart(5, "0")}`;
  }

  /* ---------- API de datos ---------- */
  function getCuentas() { return leerCuentas().slice(); }
  function getCuentasAfectables() { return getCuentas().filter((c) => c.nivel === 2); }
  function getCuentaPorCodigo(codigo) { return getCuentas().find((c) => c.codigo === codigo) || null; }
  function saveCuenta(cuenta) {
    const arr = leerCuentas();
    cuenta = cuenta || {};
    if (cuenta.id) {
      const i = arr.findIndex((c) => c.id === cuenta.id);
      if (i >= 0) arr[i] = { ...arr[i], ...cuenta };
      else arr.push(cuenta);
    } else {
      cuenta.id = "c" + Date.now() + Math.floor(Math.random() * 1000);
      arr.push(cuenta);
    }
    arr.sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), "es", { numeric: true }));
    guardarCuentas(arr);
    return cuenta;
  }
  function deleteCuenta(id) {
    const arr = leerCuentas().filter((c) => c.id !== id);
    return guardarCuentas(arr);
  }
  function getPolizas() {
    return leerPolizas().slice().sort((a, b) => (b.creada || 0) - (a.creada || 0));
  }
  function savePoliza(poliza) {
    const arr = leerPolizas();
    poliza = poliza || {};
    if (!poliza.id) {
      poliza.id = "p" + Date.now() + Math.floor(Math.random() * 1000);
      poliza.creada = Date.now();
      if (!poliza.folio) poliza.folio = siguienteFolio(poliza.tipo);
      arr.push(poliza);
    } else {
      const i = arr.findIndex((p) => p.id === poliza.id);
      if (i >= 0) arr[i] = { ...arr[i], ...poliza };
      else arr.push(poliza);
    }
    guardarPolizas(arr);
    return poliza;
  }
  function deletePoliza(id) {
    const arr = leerPolizas().filter((p) => p.id !== id);
    return guardarPolizas(arr);
  }

  /* ---------- Cálculos contables ---------- */
  // Movimientos (cargos/abonos) de una cuenta de detalle, de todas las pólizas.
  function movimientosCuenta(codigo) {
    let debe = 0, haber = 0; const movs = [];
    leerPolizas().forEach((p) => {
      (p.asientos || []).forEach((a) => {
        if (a.codigo === codigo) {
          const d = num(a.debe), h = num(a.haber);
          debe += d; haber += h;
          movs.push({ fecha: p.fecha, folio: p.folio, concepto: p.concepto, debe: d, haber: h });
        }
      });
    });
    movs.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
    return { debe: round2(debe), haber: round2(haber), movs };
  }
  // Saldo de una cuenta según su naturaleza.
  function saldoCuenta(cuenta) {
    if (cuenta.nivel === 1) {
      // Mayor: suma de los saldos de sus cuentas hijas.
      return round2(getCuentas()
        .filter((c) => c.padre === cuenta.codigo)
        .reduce((s, c) => s + saldoCuenta(c), 0));
    }
    const { debe, haber } = movimientosCuenta(cuenta.codigo);
    return round2(cuenta.nat === "Deudora" ? debe - haber : haber - debe);
  }
  // Balanza de comprobación: una fila por cuenta afectable con cargos/abonos/saldo.
  function balanza() {
    const filas = getCuentasAfectables().map((c) => {
      const { debe, haber } = movimientosCuenta(c.codigo);
      const saldo = c.nat === "Deudora" ? debe - haber : haber - debe;
      return {
        codigo: c.codigo, nombre: c.nombre, nat: c.nat,
        debe: round2(debe), haber: round2(haber),
        saldoDeudor: c.nat === "Deudora" ? round2(Math.max(saldo, 0)) : (saldo < 0 ? round2(-saldo) : 0),
        saldoAcreedor: c.nat === "Acreedora" ? round2(Math.max(saldo, 0)) : (saldo < 0 ? round2(-saldo) : 0),
      };
    });
    const tot = filas.reduce((t, f) => ({
      debe: t.debe + f.debe, haber: t.haber + f.haber,
      saldoDeudor: t.saldoDeudor + f.saldoDeudor, saldoAcreedor: t.saldoAcreedor + f.saldoAcreedor,
    }), { debe: 0, haber: 0, saldoDeudor: 0, saldoAcreedor: 0 });
    Object.keys(tot).forEach((k) => (tot[k] = round2(tot[k])));
    return { filas, tot, cuadra: Math.abs(tot.debe - tot.haber) < 0.01 };
  }

  // Exponer API por si otros módulos la necesitan.
  window.CTCont = {
    getCuentas, getCuentasAfectables, getCuentaPorCodigo, saveCuenta, deleteCuenta,
    getPolizas, savePoliza, deletePoliza, movimientosCuenta, saldoCuenta, balanza,
  };

  /* ====================== PARTE 2 · UI ====================== */

  const ICO_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
  const ICO_DEL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
  const ICO_EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
  const ICO_BOOK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';

  /* ---------- CSS ---------- */
  const css = `
    .cont-modal{position:fixed;inset:0;z-index:120;display:none;align-items:center;justify-content:center;padding:1.2rem;background:rgba(2,6,15,.6);backdrop-filter:blur(4px)}
    .cont-modal.is-open{display:flex}
    .cont-modal__card{background:var(--ink-800,#0d1322);border:1px solid var(--line,#1a2540);border-radius:18px;
      width:100%;max-width:680px;max-height:90vh;overflow:auto;box-shadow:0 30px 80px -20px rgba(0,0,0,.7)}
    .cont-modal__head{display:flex;align-items:center;justify-content:space-between;padding:1.1rem 1.3rem;border-bottom:1px solid var(--line,#1a2540);position:sticky;top:0;background:var(--ink-800,#0d1322);z-index:2}
    .cont-modal__head h3{margin:0;font-size:1.05rem}
    .cont-modal__x{background:none;border:0;color:var(--muted,#8a93a6);cursor:pointer;padding:.3rem;border-radius:8px;width:30px;height:30px;font-size:1rem}
    .cont-modal__x:hover{background:var(--line,#1a2540);color:var(--text,#e8ecf3)}
    .cont-modal__body{padding:1.3rem}
    .cont-modal .field{margin-bottom:.8rem}
    .cont-modal .field label{display:block;font-size:.78rem;color:var(--muted,#8a93a6);margin-bottom:.35rem;font-weight:500}
    .cont-grid3{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}
    .cont-asientos-head{display:grid;grid-template-columns:1fr 120px 120px 32px;gap:.5rem;margin:.6rem 0 .35rem;
      font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:var(--faint,#5b6680)}
    .cont-asientos-head span:nth-child(2),.cont-asientos-head span:nth-child(3){text-align:right;padding-right:.4rem}
    .cont-asiento{display:grid;grid-template-columns:1fr 120px 120px 32px;gap:.5rem;margin-bottom:.45rem;align-items:center}
    .cont-as-debe,.cont-as-haber{text-align:right}
    .cont-as-debe::-webkit-outer-spin-button,.cont-as-debe::-webkit-inner-spin-button,
    .cont-as-haber::-webkit-outer-spin-button,.cont-as-haber::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
    .cont-as-debe,.cont-as-haber{-moz-appearance:textfield;appearance:textfield}
    .cont-as-x{background:none;border:0;color:var(--down,#FB7185);cursor:pointer;font-size:1rem;border-radius:7px;height:38px}
    .cont-as-x:hover{background:rgba(251,113,133,.12)}
    .cont-totales{margin-top:1rem;padding:1rem;border:1px solid var(--line,#1a2540);border-radius:12px;background:var(--ink-900,rgba(255,255,255,.02))}
    .cont-totales-row{display:flex;justify-content:space-between;align-items:center;font-size:.9rem;margin-bottom:.4rem}
    .cont-totales-row b{font-family:var(--mono,monospace);font-size:1.05rem}
    .cont-cuadre{text-align:center;font-weight:700;font-size:.9rem;padding:.55rem;border-radius:9px;margin-top:.5rem}
    .cont-cuadre.is-ok{color:var(--up,#34D399);background:var(--up-soft,rgba(52,211,153,.12))}
    .cont-cuadre.is-bad{color:var(--gold,#F2B84B);background:var(--gold-soft,rgba(242,184,75,.12))}
    .cont-foot{display:flex;justify-content:flex-end;gap:.6rem;margin-top:1.2rem}
    .cont-err{background:rgba(251,113,133,.12);border:1px solid rgba(251,113,133,.3);color:var(--down,#FB7185);
      padding:.7rem .9rem;border-radius:10px;font-size:.85rem;margin-top:.7rem}
    .cont-verhead,.cont-mayor-head{display:flex;gap:1.5rem;align-items:flex-end;flex-wrap:wrap}
    .cont-verhead div span,.cont-mayor-saldo span{display:block;font-size:.74rem;color:var(--faint,#5b6680);text-transform:uppercase;letter-spacing:.05em}
    .cont-verhead div b{font-size:1rem}
    .cont-mayor-head{justify-content:space-between}
    .cont-mayor-saldo{text-align:right}
    .cont-mayor-saldo b{font-family:var(--mono,monospace);font-size:1.3rem;color:var(--brand,#6E8BFF)}
    .cont-balanza-estado{margin-top:1rem;text-align:center;font-weight:700;padding:.6rem;border-radius:10px}
    .cont-balanza-estado.is-ok{color:var(--up,#34D399);background:var(--up-soft,rgba(52,211,153,.12))}
    .cont-balanza-estado.is-bad{color:var(--gold,#F2B84B);background:var(--gold-soft,rgba(242,184,75,.12))}
    .tbl tfoot td{border-top:2px solid var(--line-strong,#22304d);padding:.7rem;font-family:var(--mono,monospace)}
    .btn--sm{padding:.45rem .8rem;font-size:.82rem}`;
  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ---------- Modal propio ---------- */
  const modal = document.createElement("div");
  modal.className = "cont-modal";
  modal.innerHTML = `<div class="cont-modal__card">
    <div class="cont-modal__head"><h3 data-cont-title>Registro</h3>
      <button class="cont-modal__x" data-cont-close aria-label="Cerrar">✕</button></div>
    <div class="cont-modal__body" data-cont-body></div></div>`;
  document.body.appendChild(modal);
  const cbody = modal.querySelector("[data-cont-body]");
  const ctitle = modal.querySelector("[data-cont-title]");
  const openModal = (t) => { ctitle.textContent = t; modal.classList.add("is-open"); };
  const closeModal = () => modal.classList.remove("is-open");

  /* ---------- Render: KPIs ---------- */
  function renderStats() {
    const el = document.querySelector("[data-cont-stats]");
    if (!el) return;
    const b = balanza();
    const cards = [
      { label: "Pólizas registradas", valor: String(getPolizas().length) },
      { label: "Cuentas afectables", valor: String(getCuentasAfectables().length) },
      { label: "Movimiento (cargos)", valor: "$" + fmt(b.tot.debe) },
      { label: "Balanza", valor: b.cuadra ? "Cuadra" : "Descuadre", tono: b.cuadra ? "" : "warn" },
    ];
    el.innerHTML = cards.map((s) => `<div class="stat${s.tono === "warn" ? " is-warn" : ""}"><span>${s.label}</span><b>${s.valor}</b></div>`).join("");
  }

  /* ---------- Render: catálogo de cuentas ---------- */
  function renderCatalogo() {
    const el = document.querySelector("[data-cuentas]");
    if (!el) return;
    el.innerHTML = getCuentas().map((c) => {
      const esMayor = c.nivel === 1;
      const acciones = esMayor ? "" :
        `<button class="ract" data-cont-mayor="${c.codigo}" title="Libro mayor">${ICO_BOOK}</button>` +
        `<button class="ract" data-cont-edit-cta="${c.id}" title="Editar">${ICO_EDIT}</button>` +
        `<button class="ract ract--del" data-cont-del-cta="${c.id}" title="Eliminar">${ICO_DEL}</button>`;
      return `<tr${esMayor ? ' style="background:var(--ink-900,rgba(255,255,255,.02))"' : ""}>
        <td class="num"${esMayor ? ' style="font-weight:700"' : ""}>${esc(c.codigo)}</td>
        <td style="${esMayor ? "font-weight:700" : "padding-left:1.7rem"}">${esc(c.nombre)}</td>
        <td>${c.nat}</td>
        <td class="num" style="text-align:right${esMayor ? ";font-weight:700" : ""}">$${fmt(saldoCuenta(c))}</td>
        <td class="row-act">${acciones}</td></tr>`;
    }).join("");
  }

  /* ---------- Render: tabla de pólizas ---------- */
  function renderPolizasTabla() {
    const el = document.querySelector("[data-polizas]");
    if (!el) return;
    const pol = getPolizas();
    if (!pol.length) { el.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--faint);padding:2.2rem">Aún no hay pólizas. Crea la primera con <b>Nueva póliza</b>.</td></tr>`; return; }
    el.innerHTML = pol.map((p) => {
      const monto = (p.asientos || []).reduce((s, a) => s + num(a.debe), 0);
      return `<tr>
        <td class="num">${esc(p.folio)}</td>
        <td>${esc(p.tipo)}</td>
        <td>${esc(fechaCorta(p.fecha))}</td>
        <td>${esc(p.concepto)}</td>
        <td class="num" style="text-align:right">$${fmt(monto)}</td>
        <td><span class="pill pill--ok">Cuadrada</span></td>
        <td class="row-act">
          <button class="ract" data-cont-ver="${p.id}" title="Ver">${ICO_EYE}</button>
          <button class="ract ract--del" data-cont-del-pol="${p.id}" title="Eliminar">${ICO_DEL}</button></td></tr>`;
    }).join("");
  }

  /* ---------- Render: Libro Mayor ---------- */
  function renderMayor(codigoSel) {
    const pane = document.querySelector('[data-pane="mayor"]');
    if (!pane) return;
    const ctas = getCuentasAfectables();
    const sel = codigoSel || (ctas[0] && ctas[0].codigo) || "";
    const opts = ctas.map((c) => `<option value="${c.codigo}"${c.codigo === sel ? " selected" : ""}>${esc(c.codigo)} · ${esc(c.nombre)}</option>`).join("");
    const cta = getCuentaPorCodigo(sel);
    let saldoAcum = 0;
    const movs = sel ? movimientosCuenta(sel).movs : [];
    const filas = movs.length ? movs.map((m) => {
      saldoAcum += (cta && cta.nat === "Deudora") ? (m.debe - m.haber) : (m.haber - m.debe);
      return `<tr><td>${esc(fechaCorta(m.fecha))}</td><td class="num">${esc(m.folio)}</td><td>${esc(m.concepto)}</td>
        <td class="num" style="text-align:right">${m.debe ? "$" + fmt(m.debe) : "—"}</td>
        <td class="num" style="text-align:right">${m.haber ? "$" + fmt(m.haber) : "—"}</td>
        <td class="num" style="text-align:right;font-weight:600">$${fmt(round2(saldoAcum))}</td></tr>`;
    }).join("") : `<tr><td colspan="6" style="text-align:center;color:var(--faint);padding:2rem">Esta cuenta no tiene movimientos.</td></tr>`;
    pane.innerHTML = `<div class="card">
      <div class="cont-mayor-head">
        <div class="field" style="margin:0;max-width:360px"><label>Cuenta</label>
          <select class="input" data-mayor-cuenta>${opts || '<option value="">Sin cuentas</option>'}</select></div>
        ${cta ? `<div class="cont-mayor-saldo"><span>Saldo actual</span><b>$${fmt(saldoCuenta(cta))}</b></div>` : ""}
      </div>
      <div style="overflow-x:auto;margin-top:1rem">
        <table class="tbl"><thead><tr><th>Fecha</th><th>Folio</th><th>Concepto</th>
          <th style="text-align:right">Debe</th><th style="text-align:right">Haber</th><th style="text-align:right">Saldo</th></tr></thead>
        <tbody>${filas}</tbody></table></div></div>`;
  }

  /* ---------- Render: Balanza de comprobación ---------- */
  function renderBalanza() {
    const pane = document.querySelector('[data-pane="balanza"]');
    if (!pane) return;
    const b = balanza();
    const filas = b.filas.map((f) => `<tr>
      <td class="num">${esc(f.codigo)}</td><td>${esc(f.nombre)}</td>
      <td class="num" style="text-align:right">$${fmt(f.debe)}</td>
      <td class="num" style="text-align:right">$${fmt(f.haber)}</td>
      <td class="num" style="text-align:right">${f.saldoDeudor ? "$" + fmt(f.saldoDeudor) : "—"}</td>
      <td class="num" style="text-align:right">${f.saldoAcreedor ? "$" + fmt(f.saldoAcreedor) : "—"}</td></tr>`).join("");
    pane.innerHTML = `<div class="card">
      <div style="overflow-x:auto">
        <table class="tbl"><thead><tr><th>Código</th><th>Cuenta</th>
          <th style="text-align:right">Cargos</th><th style="text-align:right">Abonos</th>
          <th style="text-align:right">Saldo deudor</th><th style="text-align:right">Saldo acreedor</th></tr></thead>
        <tbody>${filas || `<tr><td colspan="6" style="text-align:center;color:var(--faint);padding:2rem">Sin movimientos todavía.</td></tr>`}</tbody>
        <tfoot><tr style="font-weight:700"><td colspan="2" style="text-align:right">Totales</td>
          <td class="num" style="text-align:right">$${fmt(b.tot.debe)}</td>
          <td class="num" style="text-align:right">$${fmt(b.tot.haber)}</td>
          <td class="num" style="text-align:right">$${fmt(b.tot.saldoDeudor)}</td>
          <td class="num" style="text-align:right">$${fmt(b.tot.saldoAcreedor)}</td></tr></tfoot></table></div>
      <div class="cont-balanza-estado ${b.cuadra ? "is-ok" : "is-bad"}">${b.cuadra ? "✓ La balanza cuadra" : "⚠ La balanza no cuadra"}</div></div>`;
  }

  function renderTodo() { renderStats(); renderCatalogo(); renderPolizasTabla(); renderBalanza(); renderMayor(); }

  /* ---------- Modal: cuenta ---------- */
  function mayorOptions(sel) {
    return `<option value="">— es cuenta de mayor —</option>` + getCuentas().filter((c) => c.nivel === 1)
      .map((c) => `<option value="${c.codigo}"${c.codigo === sel ? " selected" : ""}>${esc(c.codigo)} · ${esc(c.nombre)}</option>`).join("");
  }
  function openCuentaForm(id) {
    const c = id ? (getCuentas().find((x) => x.id === id) || {}) : {};
    openModal(id ? "Editar cuenta" : "Nueva cuenta");
    cbody.innerHTML = `
      <div class="cont-grid3">
        <div class="field"><label>Código</label><input class="input" id="cta-codigo" placeholder="Ej. 103" value="${esc(c.codigo || "")}"></div>
        <div class="field"><label>Naturaleza</label><select class="input" id="cta-nat">
          <option${c.nat === "Deudora" ? " selected" : ""}>Deudora</option>
          <option${c.nat === "Acreedora" ? " selected" : ""}>Acreedora</option></select></div>
      </div>
      <div class="field"><label>Nombre de la cuenta</label><input class="input" id="cta-nombre" placeholder="Ej. Bancos USD" value="${esc(c.nombre || "")}"></div>
      <div class="field"><label>Pertenece a (cuenta de mayor)</label><select class="input" id="cta-padre">${mayorOptions(c.padre || "")}</select></div>
      <div data-cont-msg></div>
      <div class="cont-foot">
        <button class="btn btn--ghost" data-cont-close>Cancelar</button>
        <button class="btn btn--primary" data-cont-guardar-cta="${id || ""}">Guardar cuenta</button></div>`;
  }
  function guardarCuentaForm(id) {
    const codigo = cbody.querySelector("#cta-codigo").value.trim();
    const nombre = cbody.querySelector("#cta-nombre").value.trim();
    const nat = cbody.querySelector("#cta-nat").value;
    const padre = cbody.querySelector("#cta-padre").value || null;
    const msg = cbody.querySelector("[data-cont-msg]");
    if (!codigo || !nombre) { msg.innerHTML = `<div class="cont-err">Captura código y nombre.</div>`; return; }
    const dup = getCuentas().find((x) => x.codigo === codigo && x.id !== id);
    if (dup) { msg.innerHTML = `<div class="cont-err">Ya existe una cuenta con el código ${esc(codigo)}.</div>`; return; }
    const cuenta = { codigo, nombre, nat, nivel: padre ? 2 : 1, padre };
    if (id) cuenta.id = id;
    saveCuenta(cuenta);
    closeModal();
    renderTodo();
  }

  /* ---------- Modal: póliza ---------- */
  function cuentaOptions(sel) {
    return `<option value="">— cuenta —</option>` + getCuentasAfectables()
      .map((c) => `<option value="${c.codigo}"${c.codigo === sel ? " selected" : ""}>${esc(c.codigo)} · ${esc(c.nombre)}</option>`).join("");
  }
  function asientoRow(a) {
    a = a || {};
    return `<div class="cont-asiento">
      <select class="input cont-as-cta">${cuentaOptions(a.codigo)}</select>
      <input class="input cont-as-debe" type="number" min="0" step="0.01" placeholder="0.00" value="${a.debe || ""}">
      <input class="input cont-as-haber" type="number" min="0" step="0.01" placeholder="0.00" value="${a.haber || ""}">
      <button class="cont-as-x" data-cont-as-del title="Quitar línea">✕</button></div>`;
  }
  function recalcCuadre() {
    let debe = 0, haber = 0;
    cbody.querySelectorAll(".cont-asiento").forEach((row) => {
      debe += num(row.querySelector(".cont-as-debe").value);
      haber += num(row.querySelector(".cont-as-haber").value);
    });
    debe = round2(debe); haber = round2(haber);
    const dif = round2(debe - haber);
    const elD = cbody.querySelector("[data-tot-debe]"), elH = cbody.querySelector("[data-tot-haber]");
    const elE = cbody.querySelector("[data-cuadre]"), btn = cbody.querySelector("[data-cont-guardar-pol]");
    if (elD) elD.textContent = "$" + fmt(debe);
    if (elH) elH.textContent = "$" + fmt(haber);
    const cuadra = Math.abs(dif) < 0.01 && debe > 0;
    if (elE) {
      elE.textContent = cuadra ? "✓ Cuadrada" : (debe === 0 && haber === 0 ? "Captura los importes" : `Diferencia $${fmt(Math.abs(dif))}`);
      elE.className = "cont-cuadre " + (cuadra ? "is-ok" : "is-bad");
    }
    if (btn) btn.disabled = !cuadra;
  }
  function openPolizaForm() {
    openModal("Nueva póliza");
    cbody.innerHTML = `
      <div class="cont-grid3">
        <div class="field"><label>Tipo</label><select class="input" id="pol-tipo">
          <option>Ingreso</option><option>Egreso</option><option selected>Diario</option></select></div>
        <div class="field"><label>Fecha</label><input class="input" id="pol-fecha" type="date" value="${hoyISO()}"></div>
      </div>
      <div class="field"><label>Concepto</label><input class="input" id="pol-concepto" placeholder="Ej. Provisión de nómina 2a quincena"></div>
      <div class="cont-asientos-head"><span>Cuenta</span><span>Debe</span><span>Haber</span><span></span></div>
      <div data-cont-asientos>${asientoRow()}${asientoRow()}</div>
      <button class="btn btn--ghost btn--sm" data-cont-as-add style="margin-top:.4rem">+ Agregar línea</button>
      <div class="cont-totales">
        <div class="cont-totales-row"><span>Total Debe</span><b data-tot-debe>$0.00</b></div>
        <div class="cont-totales-row"><span>Total Haber</span><b data-tot-haber>$0.00</b></div>
        <div class="cont-cuadre is-bad" data-cuadre>Captura los importes</div></div>
      <div data-cont-msg></div>
      <div class="cont-foot">
        <button class="btn btn--ghost" data-cont-close>Cancelar</button>
        <button class="btn btn--primary" data-cont-guardar-pol disabled>Guardar póliza</button></div>`;
    recalcCuadre();
  }
  function guardarPolizaForm() {
    const tipo = cbody.querySelector("#pol-tipo").value;
    const fecha = cbody.querySelector("#pol-fecha").value || hoyISO();
    const concepto = cbody.querySelector("#pol-concepto").value.trim();
    const msg = cbody.querySelector("[data-cont-msg]");
    if (!concepto) { msg.innerHTML = `<div class="cont-err">Escribe un concepto para la póliza.</div>`; return; }
    const asientos = []; let debe = 0, haber = 0, faltaCuenta = false;
    cbody.querySelectorAll(".cont-asiento").forEach((row) => {
      const cod = row.querySelector(".cont-as-cta").value;
      const d = num(row.querySelector(".cont-as-debe").value), h = num(row.querySelector(".cont-as-haber").value);
      if (d === 0 && h === 0) return;
      if (!cod) { faltaCuenta = true; return; }
      const cta = getCuentaPorCodigo(cod);
      asientos.push({ codigo: cod, nombre: cta ? cta.nombre : "", debe: round2(d), haber: round2(h) });
      debe += d; haber += h;
    });
    if (faltaCuenta) { msg.innerHTML = `<div class="cont-err">Hay líneas con importe pero sin cuenta seleccionada.</div>`; return; }
    if (asientos.length < 2) { msg.innerHTML = `<div class="cont-err">Una póliza necesita al menos 2 movimientos.</div>`; return; }
    if (Math.abs(round2(debe - haber)) >= 0.01) { msg.innerHTML = `<div class="cont-err">La póliza no cuadra: Debe ≠ Haber.</div>`; return; }
    if (round2(debe) <= 0) { msg.innerHTML = `<div class="cont-err">El importe debe ser mayor a cero.</div>`; return; }
    savePoliza({ tipo, fecha, concepto, asientos });
    closeModal(); renderTodo();
  }

  /* ---------- Modal: ver póliza ---------- */
  function verPoliza(id) {
    const p = getPolizas().find((x) => x.id === id);
    if (!p) return;
    openModal(`Póliza ${p.folio}`);
    const filas = (p.asientos || []).map((a) => `<tr>
      <td class="num">${esc(a.codigo)}</td><td>${esc(a.nombre)}</td>
      <td class="num" style="text-align:right">${num(a.debe) ? "$" + fmt(a.debe) : "—"}</td>
      <td class="num" style="text-align:right">${num(a.haber) ? "$" + fmt(a.haber) : "—"}</td></tr>`).join("");
    const debe = (p.asientos || []).reduce((s, a) => s + num(a.debe), 0);
    const haber = (p.asientos || []).reduce((s, a) => s + num(a.haber), 0);
    cbody.innerHTML = `
      <div class="cont-verhead">
        <div><span>Tipo</span><b>${esc(p.tipo)}</b></div>
        <div><span>Fecha</span><b>${esc(fechaCorta(p.fecha))}</b></div>
        <div><span>Folio</span><b>${esc(p.folio)}</b></div></div>
      <p style="margin:.6rem 0 1rem;color:var(--muted)">${esc(p.concepto)}</p>
      <div style="overflow-x:auto">
      <table class="tbl"><thead><tr><th>Cuenta</th><th>Nombre</th><th style="text-align:right">Debe</th><th style="text-align:right">Haber</th></tr></thead>
      <tbody>${filas}</tbody>
      <tfoot><tr style="font-weight:700"><td colspan="2" style="text-align:right">Totales</td>
        <td class="num" style="text-align:right">$${fmt(debe)}</td><td class="num" style="text-align:right">$${fmt(haber)}</td></tr></tfoot></table></div>
      <div class="cont-foot"><button class="btn btn--ghost" data-cont-close>Cerrar</button></div>`;
  }

  /* ---------- Eventos ---------- */
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.closest("[data-cont-close]")) { closeModal(); return; }
    if (e.target.closest("[data-cont-as-add]")) {
      const cont = cbody.querySelector("[data-cont-asientos]");
      if (cont) { cont.insertAdjacentHTML("beforeend", asientoRow()); recalcCuadre(); }
      return;
    }
    const asDel = e.target.closest("[data-cont-as-del]");
    if (asDel) {
      const rows = cbody.querySelectorAll(".cont-asiento");
      const row = asDel.closest(".cont-asiento");
      if (rows.length > 2) row.remove();
      else { row.querySelector(".cont-as-debe").value = ""; row.querySelector(".cont-as-haber").value = ""; }
      recalcCuadre();
      return;
    }
    if (e.target.closest("[data-cont-guardar-pol]")) { guardarPolizaForm(); return; }
    const gCta = e.target.closest("[data-cont-guardar-cta]");
    if (gCta) { guardarCuentaForm(gCta.getAttribute("data-cont-guardar-cta")); return; }
  });
  cbody.addEventListener("input", (e) => {
    if (e.target.classList.contains("cont-as-debe") || e.target.classList.contains("cont-as-haber")) {
      const row = e.target.closest(".cont-asiento");
      if (row) {
        if (e.target.classList.contains("cont-as-debe") && num(e.target.value) > 0) row.querySelector(".cont-as-haber").value = "";
        if (e.target.classList.contains("cont-as-haber") && num(e.target.value) > 0) row.querySelector(".cont-as-debe").value = "";
      }
      recalcCuadre();
    }
  });
  // El selector del Libro Mayor vive en el dashboard (fuera del modal),
  // por eso la delegación va en document, no en el cuerpo del modal.
  document.addEventListener("change", (e) => {
    if (e.target && e.target.matches && e.target.matches("[data-mayor-cuenta]")) renderMayor(e.target.value);
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest('[data-new="poliza"]')) { e.preventDefault(); openPolizaForm(); return; }
    if (e.target.closest("[data-cont-nueva-cta]")) { e.preventDefault(); openCuentaForm(); return; }
    const ver = e.target.closest("[data-cont-ver]");
    if (ver) { verPoliza(ver.getAttribute("data-cont-ver")); return; }
    const delPol = e.target.closest("[data-cont-del-pol]");
    if (delPol) {
      if (confirm("¿Eliminar esta póliza? Sus movimientos dejarán de afectar los saldos.")) { deletePoliza(delPol.getAttribute("data-cont-del-pol")); renderTodo(); }
      return;
    }
    const editCta = e.target.closest("[data-cont-edit-cta]");
    if (editCta) { openCuentaForm(editCta.getAttribute("data-cont-edit-cta")); return; }
    const delCta = e.target.closest("[data-cont-del-cta]");
    if (delCta) {
      if (confirm("¿Eliminar esta cuenta del catálogo?")) { deleteCuenta(delCta.getAttribute("data-cont-del-cta")); renderTodo(); }
      return;
    }
    const verMayor = e.target.closest("[data-cont-mayor]");
    if (verMayor) {
      const grupo = document.querySelector('[data-tabs="cont"]');
      if (grupo) {
        grupo.querySelectorAll(".tab").forEach((t) => t.classList.toggle("is-active", t.getAttribute("data-tab") === "mayor"));
        const view = grupo.closest(".view") || document;
        view.querySelectorAll(".tabpane").forEach((p) => p.classList.toggle("is-active", p.getAttribute("data-pane") === "mayor"));
      }
      renderMayor(verMayor.getAttribute("data-cont-mayor"));
      return;
    }
    const nav = e.target.closest('.nav-item[data-view="contabilidad"]');
    if (nav) setTimeout(renderTodo, 30);
  });

  /* ---------- Init ---------- */
  // Render inmediato: el script va al final del body, así que las tablas ya
  // existen y este render gana sobre el de ejemplo de app.js (sin parpadeo).
  function init() { renderTodo(); }
  init();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);

  window.CTCont.render = renderTodo;
  window.__CT_CONT_READY = true;
})();
