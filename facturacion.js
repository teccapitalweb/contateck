/* ============================================================
   CONTATECK · Facturación CFDI 4.0 (conexión con el backend)
   - Abre un formulario para capturar receptor + conceptos.
   - Llama al backend en Railway para timbrar de verdad.
   - Muestra el UUID (folio fiscal) y permite ver el PDF/XML.
   ============================================================ */
(function () {
  "use strict";

  // URL del backend de timbrado en Railway.
  const BACKEND = "https://contateck-backend-production.up.railway.app";

  // Catálogo corto de Uso de CFDI (los más comunes).
  const USOS = [
    ["G03", "G03 · Gastos en general"],
    ["G01", "G01 · Adquisición de mercancías"],
    ["P01", "P01 · Por definir"],
    ["S01", "S01 · Sin obligaciones fiscales"],
    ["I01", "I01 · Construcciones"],
    ["D01", "D01 · Honorarios médicos"],
  ];

  // ---- Estilos propios mínimos (lo demás reusa las clases de CONTATECK) ----
  const css = `
    .fac-modal{position:fixed;inset:0;z-index:120;display:none;align-items:center;justify-content:center;padding:1.2rem}
    .fac-modal.is-open{display:flex}
    .fac-scrim{position:absolute;inset:0;background:rgba(3,6,15,.66);backdrop-filter:blur(5px)}
    .fac-card{position:relative;width:min(680px,100%);max-height:90vh;overflow:auto;background:var(--surface,#0d1322);
      border:1px solid var(--line-strong,#22304d);border-radius:18px;box-shadow:0 40px 90px -30px rgba(0,0,0,.7)}
    .fac-head{display:flex;align-items:center;justify-content:space-between;padding:1.15rem 1.4rem;border-bottom:1px solid var(--line,#1a2540)}
    .fac-head h3{margin:0;font-size:1.12rem}
    .fac-x{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;border:1px solid var(--line,#1a2540);
      background:transparent;color:var(--muted,#8a96ad);cursor:pointer}
    .fac-x:hover{color:var(--text,#fff);border-color:var(--brand,#6E8BFF)}
    .fac-body{padding:1.3rem 1.4rem}
    .fac-foot{display:flex;gap:.7rem;justify-content:flex-end;padding:1.1rem 1.4rem;border-top:1px solid var(--line,#1a2540)}
    .fac-grid{display:grid;grid-template-columns:1fr 1fr;gap:.9rem}
    .fac-concepto{display:grid;grid-template-columns:1fr 80px 120px 36px;gap:.6rem;align-items:end;margin-bottom:.7rem}
    .fac-concepto .fac-del{height:42px;border-radius:9px;border:1px solid var(--line,#1a2540);background:transparent;
      color:var(--neg,#FB7185);cursor:pointer;display:grid;place-items:center}
    .fac-add{margin-top:.2rem;font-size:.86rem;background:transparent;border:1px dashed var(--line-strong,#22304d);
      color:var(--brand,#6E8BFF);padding:.6rem;border-radius:10px;width:100%;cursor:pointer}
    .fac-add:hover{background:var(--brand-soft,rgba(110,139,255,.08))}
    .fac-total{display:flex;justify-content:space-between;align-items:baseline;margin-top:1rem;padding-top:.9rem;
      border-top:1px dashed var(--line,#1a2540);font-family:var(--mono,monospace)}
    .fac-total b{font-size:1.3rem}
    .fac-result{text-align:center;padding:.5rem 0}
    .fac-result .uuid{font-family:var(--mono,monospace);font-size:.95rem;background:var(--brand-soft,rgba(110,139,255,.1));
      padding:.7rem 1rem;border-radius:10px;word-break:break-all;margin:.7rem 0;color:var(--text,#fff)}
    .fac-badge{display:inline-block;padding:.3rem .8rem;border-radius:999px;font-size:.8rem;font-weight:600;
      background:rgba(52,211,153,.14);color:var(--pos,#34D399);margin-bottom:.4rem}
    .fac-spin{display:inline-block;width:18px;height:18px;border:2.5px solid rgba(255,255,255,.25);
      border-top-color:#fff;border-radius:50%;animation:facspin .7s linear infinite;vertical-align:middle}
    @keyframes facspin{to{transform:rotate(360deg)}}
    .fac-err{background:rgba(251,113,133,.12);border:1px solid rgba(251,113,133,.3);color:var(--neg,#FB7185);
      padding:.8rem 1rem;border-radius:10px;font-size:.88rem;margin-top:.8rem}
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // ---- Inyectar el modal ----
  const modal = document.createElement("div");
  modal.className = "fac-modal";
  modal.innerHTML = `
    <div class="fac-scrim" data-fac-close></div>
    <div class="fac-card">
      <div class="fac-head">
        <h3 data-fac-title>Timbrar CFDI 4.0</h3>
        <button class="fac-x" data-fac-close aria-label="Cerrar">✕</button>
      </div>
      <div class="fac-body" data-fac-content></div>
    </div>`;
  document.body.appendChild(modal);
  const content = modal.querySelector("[data-fac-content]");

  const money = (n) => "$" + Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function conceptoRow(c = {}) {
    return `
      <div class="fac-concepto">
        <div class="field" style="margin:0">
          <label>Descripción</label>
          <input class="input fac-desc" placeholder="Ej. Consultoría contable" value="${c.descripcion || ""}">
        </div>
        <div class="field" style="margin:0">
          <label>Cant.</label>
          <input class="input fac-cant" type="number" min="1" step="1" value="${c.cantidad || 1}">
        </div>
        <div class="field" style="margin:0">
          <label>P. unitario</label>
          <input class="input fac-precio" type="number" min="0" step="0.01" placeholder="0.00" value="${c.precioUnitario || ""}">
        </div>
        <button class="fac-del" title="Quitar">✕</button>
      </div>`;
  }

  function recalcTotal() {
    let sub = 0;
    content.querySelectorAll(".fac-concepto").forEach((row) => {
      const cant = parseFloat(row.querySelector(".fac-cant").value) || 0;
      const precio = parseFloat(row.querySelector(".fac-precio").value) || 0;
      sub += cant * precio;
    });
    const iva = sub * 0.16;
    const tot = sub + iva;
    const el = content.querySelector("[data-fac-total]");
    if (el) el.textContent = money(tot);
    const elSub = content.querySelector("[data-fac-sub]");
    if (elSub) elSub.textContent = money(sub) + " + IVA " + money(iva);
  }

  function renderForm() {
    content.innerHTML = `
      <div class="fac-grid">
        <div class="field">
          <label>RFC del receptor</label>
          <input class="input" id="fac-rfc" placeholder="XAXX010101000" value="EKU9003173C9" style="text-transform:uppercase">
        </div>
        <div class="field">
          <label>Uso de CFDI</label>
          <select class="input" id="fac-uso">
            ${USOS.map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="field">
        <label>Nombre / Razón social del receptor</label>
        <input class="input" id="fac-nombre" placeholder="Razón social" value="ESCUELA KEMPER URGATE" style="text-transform:uppercase">
      </div>

      <div class="field" style="margin-bottom:.5rem"><label>Conceptos</label></div>
      <div data-fac-conceptos>${conceptoRow()}</div>
      <button class="fac-add" data-fac-add>+ Agregar concepto</button>

      <div class="fac-total">
        <span style="color:var(--muted)">Subtotal: <span data-fac-sub>$0.00</span></span>
        <span>Total: <b data-fac-total>$0.00</b></span>
      </div>

      <div data-fac-msg></div>

      <div class="fac-foot" style="border:0;padding:1.2rem 0 0">
        <button class="btn btn--ghost" data-fac-close>Cancelar</button>
        <button class="btn btn--primary" data-fac-timbrar>
          <svg viewBox="0 0 24 24" width="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4L19 6"/></svg>
          Timbrar factura
        </button>
      </div>`;

    // Nota de pruebas
    const nota = document.createElement("p");
    nota.style.cssText = "font-size:.78rem;color:var(--faint,#6b7a99);margin-top:.9rem;text-align:center";
    nota.textContent = "Ambiente de pruebas · emisor de prueba del SAT · sin validez fiscal";
    content.appendChild(nota);

    recalcTotal();
  }

  async function timbrar() {
    const rfc = content.querySelector("#fac-rfc").value.trim().toUpperCase();
    const nombre = content.querySelector("#fac-nombre").value.trim().toUpperCase();
    const usoCfdi = content.querySelector("#fac-uso").value;

    const conceptos = [];
    content.querySelectorAll(".fac-concepto").forEach((row) => {
      const descripcion = row.querySelector(".fac-desc").value.trim();
      const cantidad = parseFloat(row.querySelector(".fac-cant").value) || 0;
      const precioUnitario = parseFloat(row.querySelector(".fac-precio").value) || 0;
      if (descripcion && cantidad > 0 && precioUnitario > 0) {
        conceptos.push({ descripcion, cantidad, precioUnitario });
      }
    });

    const msg = content.querySelector("[data-fac-msg]");
    if (!rfc) { msg.innerHTML = `<div class="fac-err">Falta el RFC del receptor.</div>`; return; }
    if (!conceptos.length) { msg.innerHTML = `<div class="fac-err">Agrega al menos un concepto con descripción, cantidad y precio.</div>`; return; }

    const btn = content.querySelector("[data-fac-timbrar]");
    btn.disabled = true;
    btn.innerHTML = `<span class="fac-spin"></span> Timbrando…`;
    msg.innerHTML = "";

    try {
      const resp = await fetch(BACKEND + "/api/facturar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receptor: { rfc, nombre, usoCfdi }, conceptos }),
      });
      const data = await resp.json();

      if (data.ok) {
        // Persistir la factura timbrada en la tabla de CFDIs (Firestore).
        try {
          if (window.CTData && typeof window.CTData.addCfdi === "function") {
            window.CTData.addCfdi({
              uuid: data.uuid,
              cliente: nombre || (data.cfdi && data.cfdi.receptorNombre) || rfc,
              total: data.total,
              serie: (data.cfdi && data.cfdi.serie) || "CT",
              cfdiId: data.id,
            });
          }
        } catch (e) { /* la persistencia no debe romper el flujo de timbrado */ }
        renderResult(data);
      } else {
        btn.disabled = false;
        btn.innerHTML = "Timbrar factura";
        msg.innerHTML = `<div class="fac-err"><b>El PAC rechazó la factura:</b><br>${data.error || "Error desconocido"}${data.details ? "<br><small>" + String(data.details).slice(0, 300) + "</small>" : ""}</div>`;
      }
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = "Timbrar factura";
      msg.innerHTML = `<div class="fac-err">No se pudo conectar con el servidor de timbrado.<br><small>${err.message}</small></div>`;
    }
  }

  function renderResult(data) {
    content.innerHTML = `
      <div class="fac-result">
        <div class="fac-badge">✓ TIMBRADO</div>
        <h3 style="margin:.3rem 0">¡Factura timbrada con éxito!</h3>
        <p style="color:var(--muted);font-size:.9rem">Folio fiscal (UUID) asignado por el SAT:</p>
        <div class="uuid">${data.uuid || "—"}</div>
        <p style="font-size:.95rem">Total: <b>${money(data.total)}</b></p>
        <div style="display:flex;gap:.6rem;justify-content:center;margin-top:1.2rem;flex-wrap:wrap">
          <button class="btn btn--ghost" data-fac-pdf>Ver PDF</button>
          <button class="btn btn--ghost" data-fac-xml>Ver XML</button>
          <button class="btn btn--primary" data-fac-otra>Timbrar otra</button>
        </div>
        <div data-fac-dl style="margin-top:.8rem"></div>
        <p style="font-size:.76rem;color:var(--faint);margin-top:1rem">Sin validez fiscal (ambiente de pruebas)</p>
      </div>`;

    const id = data.id;
    content.querySelector("[data-fac-otra]").onclick = renderForm;
    content.querySelector("[data-fac-pdf]").onclick = () => descargar(id, "pdf");
    content.querySelector("[data-fac-xml]").onclick = () => descargar(id, "xml");
  }

  function descargar(id, tipo) {
    const dl = content.querySelector("[data-fac-dl]");
    if (!id) {
      if (dl) dl.innerHTML = `<div class="fac-err">No llegó el ID de la factura; no se puede abrir el ${tipo.toUpperCase()}.</div>`;
      return;
    }
    // El backend devuelve el archivo directo; el navegador lo abre en otra pestaña.
    // Si algo falla, esa pestaña mostrará el error exacto de Fiscalapi.
    window.open(`${BACKEND}/api/cfdi/${id}/${tipo}`, "_blank");
  }

  // ---- Abrir / cerrar ----
  function open() { setTitle("Timbrar CFDI 4.0"); renderForm(); modal.classList.add("is-open"); }
  function close() { modal.classList.remove("is-open"); }
  function setTitle(t) { const el = modal.querySelector("[data-fac-title]"); if (el) el.textContent = t; }

  // ---------- Cancelación de CFDI ----------
  const MOTIVOS = [
    ["02", "02 · Comprobante emitido con errores sin relación"],
    ["03", "03 · No se llevó a cabo la operación"],
    ["04", "04 · Operación nominativa relacionada en factura global"],
    ["01", "01 · Comprobante con errores con relación (requiere sustituto)"],
  ];

  function openCancel(cfdiId, rowId) {
    setTitle("Cancelar CFDI");
    content.innerHTML = `
      <p style="color:var(--muted);font-size:.9rem;margin-top:0">
        Cancelar este CFDI ante el SAT. Elige el motivo según el catálogo oficial.
      </p>
      <div class="field">
        <label>Motivo de cancelación</label>
        <select class="input" id="fac-motivo">
          ${MOTIVOS.map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}
        </select>
      </div>
      <div class="field" id="fac-sustituto-wrap" style="display:none">
        <label>UUID de la factura que lo sustituye</label>
        <input class="input" id="fac-sustituto" placeholder="UUID del CFDI que reemplaza a éste">
      </div>
      <div data-fac-msg></div>
      <div class="fac-foot" style="border:0;padding:1.2rem 0 0">
        <button class="btn btn--ghost" data-fac-close>Volver</button>
        <button class="btn btn--primary" style="background:#FB7185;border-color:#FB7185" data-fac-cancelar="${cfdiId}::${rowId}">
          Cancelar CFDI
        </button>
      </div>`;
    // Mostrar campo de sustituto solo si el motivo es 01
    const sel = content.querySelector("#fac-motivo");
    const wrap = content.querySelector("#fac-sustituto-wrap");
    sel.addEventListener("change", () => { wrap.style.display = sel.value === "01" ? "" : "none"; });
    modal.classList.add("is-open");
  }

  async function ejecutarCancelacion(cfdiId, rowId) {
    const motivo = content.querySelector("#fac-motivo").value;
    const sustituto = (content.querySelector("#fac-sustituto") || {}).value || "";
    const msg = content.querySelector("[data-fac-msg]");

    if (motivo === "01" && !sustituto.trim()) {
      msg.innerHTML = `<div class="fac-err">El motivo 01 requiere el UUID de la factura que lo sustituye.</div>`;
      return;
    }

    const btn = content.querySelector("[data-fac-cancelar]");
    btn.disabled = true;
    btn.innerHTML = `<span class="fac-spin"></span> Cancelando…`;
    msg.innerHTML = "";

    try {
      const resp = await fetch(BACKEND + "/api/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cfdiId, cancellationReasonCode: motivo, replacementUuid: sustituto.trim() || undefined }),
      });
      const data = await resp.json();

      if (data.ok) {
        // Marcar como cancelada en la tabla y Firestore
        try {
          if (window.CTData && typeof window.CTData.markCfdiCancelled === "function") {
            await window.CTData.markCfdiCancelled(rowId);
          }
        } catch (e) { /* no romper el flujo */ }
        content.innerHTML = `
          <div class="fac-result">
            <div class="fac-badge" style="background:rgba(251,113,133,.14);color:#FB7185">✓ CANCELADO</div>
            <h3 style="margin:.3rem 0">CFDI cancelado</h3>
            <p style="color:var(--muted);font-size:.9rem">El comprobante quedó cancelado ante el SAT y se actualizó en tu tabla.</p>
            <div style="margin-top:1.2rem"><button class="btn btn--primary" data-fac-close>Cerrar</button></div>
          </div>`;
      } else {
        btn.disabled = false;
        btn.innerHTML = "Cancelar CFDI";
        msg.innerHTML = `<div class="fac-err"><b>No se pudo cancelar:</b><br>${data.error || "Error desconocido"}${data.details ? "<br><small>" + String(data.details).slice(0, 300) + "</small>" : ""}</div>`;
      }
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = "Cancelar CFDI";
      msg.innerHTML = `<div class="fac-err">No se pudo conectar con el servidor.<br><small>${err.message}</small></div>`;
    }
  }

  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-fac-close]")) close();
    if (e.target.closest("[data-fac-add]")) {
      const cont = content.querySelector("[data-fac-conceptos]");
      cont.insertAdjacentHTML("beforeend", conceptoRow());
      recalcTotal();
    }
    if (e.target.closest(".fac-del")) {
      const rows = content.querySelectorAll(".fac-concepto");
      if (rows.length > 1) { e.target.closest(".fac-concepto").remove(); recalcTotal(); }
    }
    if (e.target.closest("[data-fac-timbrar]")) timbrar();
    const cancelarBtn = e.target.closest("[data-fac-cancelar]");
    if (cancelarBtn) {
      const parts = cancelarBtn.getAttribute("data-fac-cancelar").split("::");
      ejecutarCancelacion(parts[0], parts[1]);
    }
  });
  modal.addEventListener("input", (e) => {
    if (e.target.classList.contains("fac-cant") || e.target.classList.contains("fac-precio")) recalcTotal();
  });

  // ---- Conectar el botón "Timbrar CFDI" del módulo de Facturación ----
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-facturar]")) { e.preventDefault(); open(); }
    const cancelTrigger = e.target.closest("[data-cancelar-cfdi]");
    if (cancelTrigger) {
      e.preventDefault();
      const parts = cancelTrigger.getAttribute("data-cancelar-cfdi").split("::");
      openCancel(parts[0], parts[1]);
    }
  });

  console.log("[CONTATECK] Módulo de facturación cargado · backend:", BACKEND);
})();
