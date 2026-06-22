/* ============================================================
   CONTATECK · data.js
   Datos de demostración + configuración.
   Cuando conectes Firebase/Railway, reemplaza estos objetos
   por las respuestas reales de tu API. Nada de la UI cambia.
   ============================================================ */

const APP = {
  name: "CONTATECK",
  tagline: "Contabilidad, SAT y nómina con IA, para México.",
};

/* Empresas (Módulo 1 · multiempresa) */
const EMPRESAS = [
  { id: "tec",  nombre: "TEC CAPITAL Group",      rfc: "TCG230118AB9", regimen: "601 · General de Ley PM" },
  { id: "ipci", nombre: "Instituto IPCI",          rfc: "IIP210504QX2", regimen: "603 · Personas Morales no Lucrativas" },
  { id: "odon", nombre: "OdonTeck Consulting",     rfc: "ODT220915MP4", regimen: "626 · RESICO" },
];

/* Dashboard Ejecutivo (Módulo 14) — cifras del mes en curso, MXN */
const KPIS = [
  { id:"ventas",  label:"Ventas del mes",     valor:1284500, delta:+12.4, ico:"trend",   serie:[62,68,60,72,78,74,83,80,88,92,96,104] },
  { id:"gastos",  label:"Gastos del mes",     valor:742300,  delta:+4.1,  ico:"down",    serie:[40,42,44,41,45,43,48,47,50,49,52,55] },
  { id:"utilidad",label:"Utilidad neta",      valor:542200,  delta:+18.9, ico:"wallet",  serie:[20,24,18,28,30,29,33,32,36,40,43,49] },
  { id:"flujo",   label:"Flujo de efectivo",  valor:318900,  delta:-3.2,  ico:"flow",    serie:[30,28,33,31,29,34,32,30,35,33,31,29] },
];

/* Indicadores fiscales (Módulo 2) */
const FISCAL = [
  { label:"IVA a pagar (est.)",  valor:86420,  estado:"pend" },
  { label:"ISR a pagar (est.)",  valor:124800, estado:"pend" },
  { label:"Retenciones",         valor:31250,  estado:"ok"   },
];

/* Indicadores contables (balance) */
const BALANCE = [
  { label:"Activos",  valor:4820000, color:"var(--brand)" },
  { label:"Pasivos",  valor:1640000, color:"var(--gold)"  },
  { label:"Capital",  valor:3180000, color:"var(--up)"    },
];

/* Serie mensual ventas vs gastos (para el chart principal, MXN miles) */
const SERIE = {
  meses:  ["Jul","Ago","Sep","Oct","Nov","Dic","Ene","Feb","Mar","Abr","May","Jun"],
  ventas: [880, 920, 860, 1010, 1080, 1190, 1040, 980, 1120, 1210, 1248, 1284],
  gastos: [560, 580, 600, 590, 640, 700, 620, 600, 680, 710, 724, 742],
};

/* Composición de gastos (donut) */
const GASTOS_COMP = [
  { label:"Nómina",          valor:312000, color:"var(--brand)" },
  { label:"Proveedores",     valor:198000, color:"var(--gold)"  },
  { label:"Servicios",       valor:121000, color:"var(--up)"    },
  { label:"Impuestos",       valor:74300,  color:"var(--down)"  },
  { label:"Otros",           valor:37000,  color:"var(--faint)" },
];

/* Ledger Debe / Haber (firma) */
const LEDGER = { debe: 6460000, haber: 6460000 };

/* Próximas obligaciones SAT (Módulo 2) */
const OBLIGACIONES = [
  { obligacion:"Declaración mensual IVA",   periodo:"Jun 2026", vence:"17 Jul",  monto:86420,  estado:"pend" },
  { obligacion:"Declaración mensual ISR",   periodo:"Jun 2026", vence:"17 Jul",  monto:124800, estado:"pend" },
  { obligacion:"DIOT",                       periodo:"Jun 2026", vence:"31 Jul",  monto:null,   estado:"pend" },
  { obligacion:"Contabilidad electrónica",  periodo:"May 2026", vence:"03 Jul",  monto:null,   estado:"ok"   },
];

/* Alertas (Módulo 14) */
const ALERTAS = [
  { tipo:"danger", titulo:"3 CFDI cancelados sin sustituir", texto:"Facturas emitidas a 2 clientes fueron canceladas por el receptor. Revisa para reexpedir.", when:"hace 2 h" },
  { tipo:"warn",   titulo:"Liquidez por debajo del umbral",   texto:"El flujo proyectado a 30 días cae 3.2%. Considera adelantar cobranza.", when:"hoy 09:14" },
  { tipo:"info",   titulo:"DIOT lista para revisar",          texto:"La IA preparó el borrador de la DIOT de junio con 142 proveedores.", when:"ayer" },
];

/* Módulos del MVP (orden del PDF: 1,2,3,8,14,15) */
const MODULOS = [
  { id:"contabilidad", n:"01", nombre:"Contabilidad General", ico:"book",    desc:"Catálogo de cuentas configurable, pólizas, asientos automáticos y reportes financieros. Multiempresa y consolidación." },
  { id:"sat",          n:"02", nombre:"SAT y Fiscal México",  ico:"shield",  desc:"Descarga masiva de XML, validación de CFDI, cálculo de IVA, ISR y retenciones, DIOT y contabilidad electrónica." },
  { id:"facturacion",  n:"03", nombre:"Facturación",          ico:"receipt", desc:"CFDI 4.0, notas de crédito, REP y complementos. Timbrado masivo, cancelación y facturación recurrente." },
  { id:"nomina",       n:"08", nombre:"Nómina",               ico:"users",   desc:"Cálculo de sueldos, finiquitos y aguinaldos. ISR, IMSS, INFONAVIT y Fonacot. Timbrado de CFDI Nómina." },
  { id:"dashboard",    n:"14", nombre:"Dashboard Ejecutivo",  ico:"grid",    desc:"Indicadores de ventas, utilidad y liquidez. Comparativos mensuales y alertas en tiempo real." },
  { id:"ia",           n:"15", nombre:"IA Contable",          ico:"spark",   desc:"Chat contable, automatización XML → contabilidad, auditor inteligente y monitoreo para despachos." },
];

/* Usuario demo */
const USER = { nombre:"Jorge", rol:"Director General", iniciales:"JG", correo:"contateck@teccapital.mx" };
