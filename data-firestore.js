/* ============================================================
   CONTATECK · data-firestore.js  (módulo ES)
   Conecta el panel a Cloud Firestore:
   - Carga pólizas, CFDI y empleados desde Firestore.
   - Si una colección está vacía, la siembra con los datos demo
     (una sola vez; no duplica al recargar).
   - Maneja el modal "Nuevo …" y guarda de verdad en Firestore.
   Si no hay config o Firestore falla, degrada a guardado local
   en memoria (los datos demo siguen visibles, sin perder nada).
   ============================================================ */
const FB_VER = "12.15.0";
const cfg = window.FIREBASE_CONFIG || {};
const configured = !!cfg.apiKey && cfg.apiKey.indexOf("PEGA") === -1 && cfg.apiKey.indexOf("TU-") === -1;

/* ---------- Utilidades ---------- */
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
function hoyCorto() { const d = new Date(); return String(d.getDate()).padStart(2, "0") + " " + MESES[d.getMonth()]; }
function parseMoney(s) { const n = parseFloat(String(s).replace(/[^0-9.]/g, "")); return isNaN(n) ? 0 : Math.round(n * 100) / 100; }
function pad5(n) { return String(n).padStart(5, "0"); }
function hex(n) { let s = ""; for (let i = 0; i < n; i++) s += "0123456789ABCDEF"[Math.floor(Math.random() * 16)]; return s; }
function uuidShort() { return hex(4) + "…" + hex(4); }

/* ---------- Toasts ---------- */
const TICON = {
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  err: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
};
const toastWrap = document.querySelector("[data-toasts]");
function toast(msg, type = "info", ms = 3200) {
  if (!toastWrap) return;
  const el = document.createElement("div");
  el.className = "toast toast--" + type;
  el.innerHTML = (TICON[type] || TICON.info) + "<span>" + msg + "</span>";
  toastWrap.appendChild(el);
  setTimeout(() => { el.classList.add("is-out"); setTimeout(() => el.remove(), 320); }, ms);
}

/* ---------- Estado local (cache) ---------- */
const state = {
  polizas: (window.POLIZAS || []).slice(),
  cfdis: (window.CFDIS || []).slice(),
  empleados: (window.EMPLEADOS || []).slice(),
};
function render(name) {
  if (window.CTRender && typeof window.CTRender[name] === "function") window.CTRender[name](state[name]);
}

/* ---------- Esquemas de creación ---------- */
const SCHEMAS = {
  poliza: {
    title: "Nueva póliza", coll: "polizas",
    fields: [
      { k: "tipo", label: "Tipo de póliza", type: "seg", opts: ["Diario", "Ingreso", "Egreso"], def: "Diario" },
      { k: "concepto", label: "Concepto", type: "text", ph: "Ej. Pago a proveedor de servicios", req: true },
      { k: "monto", label: "Monto (MXN)", type: "money", ph: "0.00", req: true },
    ],
    build: (v) => ({
      folio: "IPC-" + v.tipo.charAt(0) + "-" + pad5(143 + state.polizas.length),
      tipo: v.tipo, fecha: hoyCorto(), concepto: v.concepto.trim(),
      monto: parseMoney(v.monto), estado: "ok", createdAt: Date.now(),
    }),
  },
  cfdi: {
    title: "Nuevo CFDI 4.0", coll: "cfdis",
    fields: [
      { k: "cliente", label: "Cliente (receptor)", type: "text", ph: "Razón social del cliente", req: true },
      { k: "total", label: "Total (MXN)", type: "money", ph: "0.00", req: true },
    ],
    build: (v) => ({
      folio: "A-" + (1044 + state.cfdis.length), uuid: uuidShort(), cliente: v.cliente.trim(),
      fecha: hoyCorto(), total: parseMoney(v.total), estado: "ok", createdAt: Date.now(),
    }),
  },
  empleado: {
    title: "Nuevo empleado", coll: "empleados",
    fields: [
      { k: "nombre", label: "Nombre completo", type: "text", ph: "Nombre del empleado", req: true },
      { k: "puesto", label: "Puesto", type: "text", ph: "Ej. Contadora", req: true },
      { k: "sueldo", label: "Sueldo mensual (MXN)", type: "money", ph: "0.00", req: true },
    ],
    build: (v) => ({
      nombre: v.nombre.trim(), puesto: v.puesto.trim(), sueldo: parseMoney(v.sueldo),
      estado: "ok", createdAt: Date.now(),
    }),
  },
};

/* ---------- Modal ---------- */
const modal = document.querySelector("[data-modal]");
const mTitle = modal && modal.querySelector("[data-modal-title]");
const mBody = modal && modal.querySelector("[data-modal-body]");
const mSave = modal && modal.querySelector("[data-modal-save]");
let current = null;

function fieldHTML(f) {
  if (f.type === "seg") {
    return '<div class="fld"><label>' + f.label + '</label><div class="seg" data-seg="' + f.k + '">' +
      f.opts.map((o) => '<button type="button" data-val="' + o + '" class="' + (o === f.def ? "is-active" : "") + '">' + o + "</button>").join("") +
      "</div></div>";
  }
  if (f.type === "money") {
    return '<div class="fld" data-fld="' + f.k + '"><label>' + f.label + '</label>' +
      '<div class="money-in"><input data-in="' + f.k + '" inputmode="decimal" placeholder="' + (f.ph || "") + '"></div>' +
      '<span class="err">Escribe un monto válido.</span></div>';
  }
  return '<div class="fld" data-fld="' + f.k + '"><label>' + f.label + '</label>' +
    '<input data-in="' + f.k + '" type="text" placeholder="' + (f.ph || "") + '"><span class="err">Este campo es obligatorio.</span></div>';
}

function openModal(key) {
  const s = SCHEMAS[key];
  if (!s || !modal) return;
  current = s;
  mTitle.textContent = s.title;
  mBody.innerHTML = s.fields.map(fieldHTML).join("");
  mBody.querySelectorAll(".seg").forEach((seg) => {
    seg.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      seg.querySelectorAll("button").forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
    }));
  });
  modal.classList.add("is-open");
  const first = mBody.querySelector("input");
  if (first) setTimeout(() => first.focus(), 50);
}
function closeModal() { if (modal) { modal.classList.remove("is-open"); current = null; } }

function readForm(s) {
  const v = {};
  let ok = true;
  s.fields.forEach((f) => {
    if (f.type === "seg") {
      const act = mBody.querySelector('[data-seg="' + f.k + '"] .is-active');
      v[f.k] = act ? act.getAttribute("data-val") : f.def;
    } else {
      const inp = mBody.querySelector('[data-in="' + f.k + '"]');
      const fld = mBody.querySelector('[data-fld="' + f.k + '"]');
      const val = (inp.value || "").trim();
      let bad = false;
      if (f.req && !val) bad = true;
      if (f.type === "money" && parseMoney(val) <= 0) bad = true;
      if (bad) { ok = false; if (fld) fld.classList.add("is-err"); }
      else if (fld) fld.classList.remove("is-err");
      v[f.k] = val;
    }
  });
  return ok ? v : null;
}

/* Firestore handles (se asignan al inicializar) */
let db = null, _collection = null, _addDoc = null;

async function saveCurrent() {
  if (!current) return;
  const v = readForm(current);
  if (!v) return;
  const obj = current.build(v);
  if (mSave) { mSave.disabled = true; mSave.textContent = "Guardando…"; }
  try {
    if (db && _collection && _addDoc) {
      const ref = await _addDoc(_collection(db, current.coll), obj);
      obj.id = ref.id;
      state[current.coll].unshift(obj);
      render(current.coll);
      toast("Guardado en Firestore", "ok");
    } else {
      state[current.coll].unshift(obj);
      render(current.coll);
      toast("Guardado localmente (Firebase no configurado)", "warn");
    }
    closeModal();
  } catch (e) {
    state[current.coll].unshift(obj); // no perder el dato
    render(current.coll);
    toast("No se pudo guardar en la nube (" + (e.code || e.message || "error") + "). Quedó local.", "err", 4800);
    closeModal();
  } finally {
    if (mSave) { mSave.disabled = false; mSave.textContent = "Guardar"; }
  }
}

/* Cerrar / guardar / atajos */
if (modal) {
  modal.querySelectorAll("[data-modal-close]").forEach((el) => el.addEventListener("click", closeModal));
  if (mSave) mSave.addEventListener("click", saveCurrent);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal(); });
}

/* Botones: abrir modal / avisar "siguiente fase" */
document.querySelectorAll("[data-new]").forEach((b) => b.addEventListener("click", () => openModal(b.getAttribute("data-new"))));
document.querySelectorAll("[data-soon]").forEach((b) => b.addEventListener("click", () => toast(b.getAttribute("data-soon") || "Disponible en la siguiente fase.", "info", 3600)));

/* ===== Firestore: init + carga + siembra ===== */
if (configured) {
  try {
    const [appMod, fsMod] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-firestore.js`),
    ]);
    const { initializeApp, getApps, getApp } = appMod;
    const { getFirestore, collection, getDocs, addDoc, query, orderBy } = fsMod;

    const app = getApps().length ? getApp() : initializeApp(cfg);
    db = getFirestore(app);
    _collection = collection;
    _addDoc = addDoc;

    async function loadColl(name, seed) {
      const snap = await getDocs(query(collection(db, name), orderBy("createdAt", "desc")));
      if (snap.empty && seed && seed.length) {
        const base = Date.now();
        for (let i = 0; i < seed.length; i++) {
          const item = Object.assign({}, seed[i], { createdAt: base - i * 1000 });
          await addDoc(collection(db, name), item);
        }
        const snap2 = await getDocs(query(collection(db, name), orderBy("createdAt", "desc")));
        return snap2.docs.map((d) => Object.assign({ id: d.id }, d.data()));
      }
      return snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
    }

    const [pol, cf, emp] = await Promise.all([
      loadColl("polizas", window.POLIZAS),
      loadColl("cfdis", window.CFDIS),
      loadColl("empleados", window.EMPLEADOS),
    ]);
    state.polizas = pol; state.cfdis = cf; state.empleados = emp;
    render("polizas"); render("cfdis"); render("empleados");
    toast("Datos sincronizados con Firestore", "ok", 2400);
  } catch (e) {
    toast("Firestore no disponible (" + (e.code || e.message || "error") + "). Mostrando datos demo.", "warn", 4800);
  }
}
