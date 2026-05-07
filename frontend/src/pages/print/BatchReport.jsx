import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { useNavigate, useParams } from "react-router-dom";
import { Printer, ArrowLeft, Save, FileDown, AlertCircle } from "lucide-react";
import api from "../../api/axios";
import { usePrintData } from "../../hooks/usePrintData";

const MAX_BATCH = { "M1.25": 1.25, "CP30": 0.50 };

function calcBatches(qty, plantType) {
  const max = MAX_BATCH[plantType] || 1.25;
  const n   = Math.ceil(qty / max);
  const sz  = Math.round(qty / n * 1000) / 1000;
  return { numBatches: n, batchSize: sz };
}

// ── M1.25 column definitions ─────────────────────────────────────────────────
// Matches exactly: MSAN D, 20MM, MSAN D, 12MM, 6MM, Agg6 | Cem1-4, CEM5 | Wtr1-3 | Admix1-4 | Silica
const COLS_M125 = [
  // Aggregate (6)
  { key: "sand1",    hdr: "MSAN\nD",    cat: "Aggregate",  w: 34 },
  { key: "agg_20mm", hdr: "20MM",       cat: "Aggregate",  w: 32 },
  { key: "sand2",    hdr: "MSAN\nD",    cat: "Aggregate",  w: 34 },
  { key: "agg_12mm", hdr: "12MM",       cat: "Aggregate",  w: 32 },
  { key: "agg_6mm",  hdr: "6MM",        cat: "Aggregate",  w: 28 },
  { key: "agg6",     hdr: "Agg6",       cat: "Aggregate",  w: 28 },
  // Cement (5)
  { key: "cem1",     hdr: "Cem1",       cat: "Cement",     w: 28 },
  { key: "cem2",     hdr: "Cem2",       cat: "Cement",     w: 28 },
  { key: "cem3",     hdr: "Cem3",       cat: "Cement",     w: 28 },
  { key: "cem4",     hdr: "Cem4",       cat: "Cement",     w: 28 },
  { key: "fly",      hdr: "CEM5",       cat: "Cement",     w: 28 },
  // Water/Ice (3)
  { key: "wtr1",     hdr: "Wtr1",       cat: "Water/Ice",  w: 28 },
  { key: "wtr2",     hdr: "Wtr2",       cat: "Water/Ice",  w: 28 },
  { key: "wtr3",     hdr: "Wtr3",       cat: "Water/Ice",  w: 28 },
  // Admixture (4)
  { key: "adx1",     hdr: "Admix\n1",   cat: "Admixture",  w: 32, dec: 2 },
  { key: "adx2",     hdr: "Admix\n2",   cat: "Admixture",  w: 32, dec: 2 },
  { key: "adx3",     hdr: "Admix\n3",   cat: "Admixture",  w: 32, dec: 2 },
  { key: "adx4",     hdr: "Admix\n4",   cat: "Admixture",  w: 32, dec: 2 },
  // Silica (1)
  { key: "silica",   hdr: "Silica",     cat: "Silica",     w: 30 },
];

// ── CP30 column definitions ──────────────────────────────────────────────────
const COLS_CP30 = [
  { key: "agg_20mm", hdr: "20MM",    cat: "Aggregate", w: 38 },
  { key: "sand1",    hdr: "SAND",    cat: "Aggregate", w: 38 },
  { key: "moisture", hdr: "Moi",     cat: "Aggregate", w: 30, isMoi: true },
  { key: "agg_12mm", hdr: "10MM",    cat: "Aggregate", w: 38 },
  { key: "agg_6mm",  hdr: "0",       cat: "Aggregate", w: 26 },
  { key: "cem1",     hdr: "CEM 1",   cat: "Cement",    w: 38 },
  { key: "cem2",     hdr: "CEM 2",   cat: "Cement",    w: 38 },
  { key: "filler",   hdr: "FILLER",  cat: "Cement",    w: 38 },
  { key: "wtr1",     hdr: "WATER",   cat: "Water",     w: 38 },
  { key: "col1",     hdr: "-",       cat: "MS/ICE",    w: 26 },
  { key: "adx1",     hdr: "ADMIX1",  cat: "Admixture", w: 38, dec: 2 },
  { key: "adx2",     hdr: "-",       cat: "Admixture", w: 30, dec: 2 },
];

const COLS = { "M1.25": COLS_M125, "CP30": COLS_CP30 };

// Build category group spans
function catGroups(cols) {
  const g = [];
  cols.forEach(c => {
    const last = g[g.length - 1];
    if (last && last.cat === c.cat) last.span++;
    else g.push({ cat: c.cat, span: 1 });
  });
  return g;
}

// Format a number — integers show as integer, decimals to dec places
function fv(v, dec = 0) {
  const n = parseFloat(v || 0);
  if (n === 0) return "0";
  return dec > 0 ? n.toFixed(dec) : String(Math.round(n));
}
function fv2(v) { return parseFloat(v || 0).toFixed(2); }

// ── Shared cell / font styles ─────────────────────────────────────────────────
const FONT = "Arial, Helvetica, sans-serif";
const B1   = "1px solid #000";
const TD   = { border: B1, padding: "1px 2px", fontSize: "7.5px", textAlign: "right",
               fontFamily: FONT, whiteSpace: "nowrap" };
const TH   = { ...TD, textAlign: "center", fontWeight: "bold", fontSize: "7px",
               whiteSpace: "pre-line" };
const CAT  = { ...TH, fontSize: "7.5px", borderBottom: B1 };

// ── Schwing Stetter Logo ──────────────────────────────────────────────────────
function Logo({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ display: "block" }}>
      <rect width="48" height="48" fill="white" />
      <polygon points="5,43 16,5 28,5 17,43" fill="#1a6e1a" />
      <polygon points="22,43 33,5 45,5 34,43" fill="#2c9e2c" />
    </svg>
  );
}

// ── Info row helper ───────────────────────────────────────────────────────────
function IR({ label, value }) {
  return (
    <div style={{ fontFamily: FONT, fontSize: "8px", display: "flex", marginBottom: "1.5px" }}>
      <span style={{ minWidth: "98px" }}>{label}</span>
      <span> : {value ?? "—"}</span>
    </div>
  );
}
function IRR({ label, value, bold }) {
  return (
    <div style={{ fontFamily: FONT, fontSize: "8px", display: "flex", justifyContent: "space-between", marginBottom: "1.5px" }}>
      <span>{label}</span>
      <span style={{ fontWeight: bold ? "bold" : "normal", marginLeft: "6px" }}>: {value}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// M1.25 Print Template — matches MCI 550 Statistical Report exactly
// ══════════════════════════════════════════════════════════════════════════════
function M125Print({ d, rows, onActualChange }) {
  const cols  = COLS_M125;
  const dm    = d.design_mix;
  const { numBatches, batchSize } = calcBatches(parseFloat(d.quantity_m3), "M1.25");
  const cats  = catGroups(cols);
  const NCOLS = cols.length;

  // Date format: M/DD/YYYY  (matches PDF: 1/14/2026)
  const dateStr = d.delivery_date
    ? (() => {
        const dt = new Date(d.delivery_date + "T00:00:00");
        return `${dt.getMonth() + 1}/${String(dt.getDate()).padStart(2,"0")}/${dt.getFullYear()}`;
      })()
    : "—";
  const timeStr = d.delivery_time?.slice(0, 8) || "—";
  const printDate = (() => {
    const n = new Date();
    const mo = String(n.getMonth()+1).padStart(2,"0");
    const dy = String(n.getDate()).padStart(2,"0");
    const yr = n.getFullYear();
    const hh = String(n.getHours()).padStart(2,"0");
    const mm = String(n.getMinutes()).padStart(2,"0");
    const ss = String(n.getSeconds()).padStart(2,"0");
    const ap = n.getHours() >= 12 ? "PM" : "AM";
    return `${mo}/${dy}/${yr} ${hh}:${mm}:${ss} ${ap}`;
  })();

  // Recipe target per m³ (base values from design mix)
  const recPerM3 = cols.map(c => parseFloat(dm?.[c.key] || 0));

  // Per-batch target (recipe × batch size)
  const tgtPerBatch = recPerM3.map(v => c => {
    // find col index
    return true;
  });
  const batchTgt = cols.map(c => {
    const v = parseFloat(dm?.[c.key] || 0);
    return c.dec ? Math.round(v * batchSize * 100) / 100 : Math.round(v * batchSize);
  });

  // Set totals = batchTgt × numBatches
  const setTotals  = batchTgt.map(v => Math.round(v * numBatches * (Number.isInteger(v) ? 1 : 100)) / (Number.isInteger(v) ? 1 : 100));
  // Actual totals
  const actTotals  = cols.map(c => rows.reduce((s, r) => s + (parseFloat(r[c.key + "_actual"] || 0)), 0));
  const massSet    = setTotals.reduce((a, b) => a + b, 0);
  const massAct    = actTotals.reduce((a, b) => a + b, 0);
  const massRecTgt = recPerM3.reduce((a, b) => a + b, 0) * batchSize;

  function diffPct(s, a) {
    if (s === 0) return "0";
    return ((a - s) / s * 100).toFixed(2);
  }

  const orderedQty   = parseFloat(d.quantity_m3);
  const prodQty      = batchSize * numBatches;
  const withLoad     = parseFloat(d.cumulative_qty_m3 || 0);

  return (
    <div style={{ fontFamily: FONT, fontSize: "8px", backgroundColor: "#fff", padding: "4mm" }}>

      {/* ═══ HEADER ══════════════════════════════════════════════════════════ */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "3px" }}>
        <tbody>
          <tr>
            <td style={{ width: "52px", verticalAlign: "middle" }}>
              <Logo size={48} />
            </td>
            <td style={{ textAlign: "center", verticalAlign: "middle" }}>
              <div style={{ fontSize: "15px", fontWeight: "bold", fontFamily: FONT, lineHeight: "1.2" }}>
                SRI AMMAN READY MIX
              </div>
              <div style={{ fontSize: "14px", fontWeight: "bold", fontFamily: FONT }}>CONCRETE</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══ DATE / TIME ROW ════════════════════════════════════════════════ */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "3px" }}>
        <tbody>
          <tr>
            <td style={{ width: "33%", fontFamily: FONT, fontSize: "8.5px" }}>
              <b>Batch Date</b>&nbsp;&nbsp;: {dateStr}
            </td>
            <td style={{ width: "34%", textAlign: "center", fontFamily: FONT, fontSize: "8.5px" }}>
              <b>Batch Start Time</b>&nbsp;: {timeStr}
            </td>
            <td style={{ width: "33%", textAlign: "right", fontFamily: FONT, fontSize: "8.5px" }}>
              <b>Batch End Time</b>&nbsp;: —
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══ INFO TABLE ══════════════════════════════════════════════════════ */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: B1, marginBottom: "4px" }}>
        <tbody>
          <tr>
            <td style={{ border: B1, padding: "2px 5px", width: "30%", verticalAlign: "top" }}>
              <IR label="Batch Number"  value={d.batch_number} />
              <IR label="Batcher Name"  value="Stetter" />
              <IR label="Order Number"  value={d.dc_number} />
              <IR label="Customer"      value={d.customer_name} />
              <IR label="Site"          value={d.site_location || d.site_name} />
            </td>
            <td style={{ border: B1, padding: "2px 5px", width: "33%", verticalAlign: "top" }}>
              <IR label="Recipe Code"   value={d.grade_name} />
              <IR label="Recipe Name"   value={d.grade_name} />
              <IR label="Truck Number"  value={d.vehicle_number} />
              <IR label="Truck Driver"  value={d.driver_name} />
            </td>
            <td style={{ border: B1, padding: "2px 5px", width: "37%", verticalAlign: "top" }}>
              <IRR label="Ordered Qty"    value={orderedQty.toFixed(2)} />
              <IRR label="Production Qty" value={prodQty.toFixed(2)} />
              <IRR label="Adj/Manual Qty" value="0.00" />
              <IRR label="With This Load" value={withLoad.toFixed(2)} />
              <IRR label="Batch Size"     value={batchSize} bold />
              <IRR label="Mixer Capacity" value={MAX_BATCH["M1.25"]} />
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══ INGREDIENT TABLE ════════════════════════════════════════════════ */}
      <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
        <thead>
          {/* Category header row */}
          <tr>
            {cats.map((g, i) => (
              <th key={i} colSpan={g.span} style={CAT}>{g.cat}</th>
            ))}
          </tr>
          {/* Column name row */}
          <tr>
            {cols.map(c => (
              <th key={c.key} style={{ ...TH, width: c.w + "px" }}>{c.hdr}</th>
            ))}
          </tr>
          {/* Recipe target per m³ */}
          <tr>
            {recPerM3.map((v, i) => (
              <td key={i} style={{ ...TD, width: cols[i].w + "px" }}>
                {v === 0 ? "0" : cols[i].dec ? v.toFixed(cols[i].dec) : fv(v)}
              </td>
            ))}
          </tr>
        </thead>

        <tbody>

          {/* ── Mass of Recipe Targets ──────────────────────────────────── */}
          <tr>
            <td colSpan={NCOLS - 1}
              style={{ ...TD, textAlign: "right", fontStyle: "italic", fontSize: "7px", border: "none" }}>
              Mass of Recipe Targets in Kgs.
            </td>
            <td style={{ ...TD, fontWeight: "bold" }}>{massRecTgt.toFixed(2)}</td>
          </tr>

          {/* ── Total Set Weight ─────────────────────────────────────────── */}
          <tr>
            <td colSpan={NCOLS}
              style={{ ...TD, textAlign: "left", fontStyle: "italic", fontSize: "7.5px" }}>
              Total Set Weight in Kgs.
            </td>
          </tr>
          <tr>
            {cols.map((c, i) => (
              <td key={c.key} style={{ ...TD, width: c.w + "px", fontWeight: "bold" }}>
                {setTotals[i] === 0 ? "0" : c.dec ? setTotals[i].toFixed(c.dec) : fv(setTotals[i])}
              </td>
            ))}
          </tr>
          <tr>
            <td colSpan={NCOLS - 1}
              style={{ ...TD, textAlign: "right", fontStyle: "italic", fontSize: "7px", border: "none" }}>
              Mass of Total Set Weight in Kgs.
            </td>
            <td style={{ ...TD, fontWeight: "bold" }}>{massSet.toFixed(2)}</td>
          </tr>

          {/* ── Total Actual Weight ─────────────────────────────────────── */}
          <tr>
            <td colSpan={NCOLS}
              style={{ ...TD, textAlign: "left", fontStyle: "italic", fontSize: "7.5px" }}>
              Total Actual Weight in Kgs.
            </td>
          </tr>
          <tr>
            {cols.map((c, i) => (
              <td key={c.key} style={{ ...TD, width: c.w + "px", fontWeight: "bold" }}>
                {actTotals[i] === 0 ? "0" : c.dec ? actTotals[i].toFixed(c.dec) : fv(actTotals[i])}
              </td>
            ))}
          </tr>
          <tr>
            <td colSpan={NCOLS - 1}
              style={{ ...TD, textAlign: "right", fontStyle: "italic", fontSize: "7px", border: "none" }}>
              Mass of Total Actual Weight in Kgs.
            </td>
            <td style={{ ...TD, fontWeight: "bold" }}>{massAct.toFixed(2)}</td>
          </tr>

          {/* ── Difference in Percentage ─────────────────────────────────── */}
          <tr>
            <td colSpan={NCOLS}
              style={{ ...TD, textAlign: "left", fontStyle: "italic", fontSize: "7.5px" }}>
              Difference in Percentage
            </td>
          </tr>
          <tr>
            {cols.map((c, i) => {
              const pct = parseFloat(diffPct(setTotals[i], actTotals[i]));
              return (
                <td key={c.key} style={{
                  ...TD, width: c.w + "px",
                  color: Math.abs(pct) > 2 ? "red" : "black", fontWeight: "bold",
                }}>
                  {pct === 0 ? "0" : pct.toFixed(2)}
                </td>
              );
            })}
          </tr>

          {/* ── Target & Actual section header ───────────────────────────── */}
          <tr>
            <td colSpan={NCOLS}
              style={{ ...TD, textAlign: "left", fontSize: "7px", fontStyle: "italic",
                padding: "2px 3px", borderTop: "2px solid #000" }}>
              Target and Actual Value with moisture correction/absorption in % and other Corrections in Kgs.
            </td>
          </tr>

          {/* ── Per-batch rows (4 rows each) ─────────────────────────────── */}
          {rows.map((row, bIdx) => {
            const isLastBatch = bIdx === rows.length - 1;
            return [
              /* Row 1: Target (with moisture correction ≈ batchTgt) */
              <tr key={`t${bIdx}`}>
                {cols.map((c, i) => (
                  <td key={c.key} style={{ ...TD, width: c.w + "px",
                    borderTop: bIdx > 0 ? "0" : B1 }}>
                    {batchTgt[i] === 0 ? "0.00" : c.dec ? batchTgt[i].toFixed(c.dec) : batchTgt[i].toFixed(2)}
                  </td>
                ))}
              </tr>,

              /* Row 2: Actual (editable) */
              <tr key={`a${bIdx}`}>
                {cols.map((c, i) => {
                  const act = parseFloat(row[c.key + "_actual"] || 0);
                  const tgt = batchTgt[i];
                  const offBy = tgt > 0 ? Math.abs(act - tgt) / tgt : 0;
                  return (
                    <td key={c.key} style={{ ...TD, width: c.w + "px",
                      color: offBy > 0.05 ? "red" : "black", padding: "0 1px" }}>
                      <input
                        className="no-print"
                        type="number" step="0.001"
                        value={row[c.key + "_actual"] ?? 0}
                        onChange={e => onActualChange(bIdx, c.key, e.target.value)}
                        style={{ width: "100%", border: "none", textAlign: "right",
                          fontSize: "7.5px", padding: 0, background: "transparent", outline: "none" }}
                      />
                      <span className="print-only" style={{ display: "none" }}>
                        {act === 0 ? "0" : c.dec ? act.toFixed(c.dec) : act.toFixed(2)}
                      </span>
                    </td>
                  );
                })}
              </tr>,

              /* Row 3: Moisture correction % */
              <tr key={`c${bIdx}`}>
                {cols.map((c, i) => (
                  <td key={c.key} style={{ ...TD, width: c.w + "px", color: "#444", fontSize: "7px" }}>
                    0.00
                  </td>
                ))}
              </tr>,

              /* Row 4: Empty / spacer */
              <tr key={`e${bIdx}`}
                style={{ borderBottom: isLastBatch ? "none" : "1px solid #888" }}>
                {cols.slice(0, 6).map((c, i) => (
                  <td key={c.key} style={{ ...TD, width: c.w + "px", color: "#aaa", fontSize: "6.5px" }}>
                    0.00
                  </td>
                ))}
                {cols.slice(6).map((c, i) => (
                  <td key={c.key} style={{ border: B1, padding: "1px 2px",
                    fontSize: "6.5px", textAlign: "right", color: "#aaa" }}>
                  </td>
                ))}
              </tr>,
            ];
          })}
        </tbody>
      </table>

      {/* ═══ FOOTER ══════════════════════════════════════════════════════════ */}
      <table style={{ width: "100%", borderCollapse: "collapse",
        borderTop: "1px solid #000", marginTop: "4px", fontSize: "7px", fontFamily: FONT }}>
        <tbody>
          <tr>
            <td style={{ width: "30%", verticalAlign: "middle" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Logo size={18} />
                <span style={{ fontWeight: "bold" }}>Schwing Stetter</span>
              </div>
            </td>
            <td style={{ textAlign: "center" }}>
              Page1&nbsp;&nbsp;&nbsp;&nbsp;MCI 550 ver 1.0 Statistical Report
            </td>
            <td style={{ textAlign: "right" }}>
              Print Date : {printDate}
            </td>
            <td style={{ textAlign: "right", fontWeight: "bold" }}>
              SRI AMMAN READY MIX CONCRETE
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CP30 Print Template — matches MCI 70 N Docket format
// ══════════════════════════════════════════════════════════════════════════════
function CP30Print({ d, rows, onActualChange }) {
  const cols = COLS_CP30;
  const dm   = d.design_mix;
  const { numBatches, batchSize } = calcBatches(parseFloat(d.quantity_m3), "CP30");
  const cats = catGroups(cols);
  const NCOLS = cols.length;

  const dateStr = d.delivery_date
    ? (() => {
        const dt = new Date(d.delivery_date + "T00:00:00");
        return `${String(dt.getDate()).padStart(2,"0")}-${dt.toLocaleString("en-GB",{month:"short"})}-${String(dt.getFullYear()).slice(-2)}`;
      })()
    : "—";

  const batchTgt = cols.map(c => {
    const v = parseFloat(dm?.[c.key] || 0);
    return c.dec ? Math.round(v * batchSize * 100) / 100 : Math.round(v * batchSize);
  });

  const setTotals = batchTgt.map(v => v * numBatches);
  const actTotals = cols.map(c => rows.reduce((s, r) => s + (parseFloat(r[c.key + "_actual"] || 0)), 0));

  return (
    <div style={{ fontFamily: FONT, fontSize: "8px", backgroundColor: "#fff", padding: "5mm" }}>

      {/* Header */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4px" }}>
        <tbody>
          <tr>
            <td style={{ width: "60px", verticalAlign: "top" }}>
              <Logo size={44} />
              <div style={{ fontSize: "6.5px", color: "#444" }}>SCHWING</div>
              <div style={{ fontSize: "6.5px", color: "#444" }}>Stetter</div>
            </td>
            <td style={{ textAlign: "center" }}>
              <div style={{ fontSize: "14px", fontWeight: "bold" }}>SRI AMMAN</div>
              <div style={{ fontSize: "7.5px" }}>MCI 70 N Control System Ver 3.1</div>
              <div style={{ fontSize: "9px", fontWeight: "bold", marginTop: "2px" }}>
                Docket / Batch Report / Autographic Record
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Date row */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: B1, marginBottom: "3px" }}>
        <tbody>
          <tr>
            <td style={{ padding: "2px 5px", width: "50%", fontFamily: FONT, fontSize: "8px" }}>
              <b>Batch Date</b>&nbsp;&nbsp;&nbsp;: {dateStr}
            </td>
            <td style={{ padding: "2px 5px", textAlign: "right", fontFamily: FONT, fontSize: "8px" }}>
              <b>Plant Serial Number:</b>&nbsp;3794
            </td>
          </tr>
          <tr>
            <td style={{ padding: "1px 5px", fontFamily: FONT, fontSize: "8px" }}>
              <b>Batch Start Time</b>&nbsp;: {d.delivery_time?.slice(0,8) || "—"}
            </td><td></td>
          </tr>
          <tr>
            <td style={{ padding: "1px 5px", fontFamily: FONT, fontSize: "8px" }}>
              <b>Batch End Time</b>&nbsp;&nbsp;&nbsp;: —
            </td><td></td>
          </tr>
        </tbody>
      </table>

      {/* Info grid */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: B1, marginBottom: "4px" }}>
        <tbody>
          {[
            ["Batch Number / Docket Number", d.batch_number || "—", "Ordered Quantity",    `${parseFloat(d.quantity_m3).toFixed(2)} M³`],
            ["Customer",                     d.customer_name,        "Production Quantity", `${(batchSize * numBatches).toFixed(2)} M³`],
            ["Site",                         d.site_location,        "Adj/Manual Quantity", "0.00 M³"],
            ["Recipe Code",                  d.grade_name,           "With This Load",      `${parseFloat(d.cumulative_qty_m3||0).toFixed(2)} M³`],
            ["Recipe Name",                  d.grade_name,           "Mixer Capacity",      `${MAX_BATCH["CP30"]} M³`],
            ["Truck Number",                 d.vehicle_number,       "Batch Size",          <b>{batchSize} M³</b>],
            ["Truck Driver",                 d.driver_name,          "", ""],
            ["Order Number",                 d.dc_number,            "", ""],
            ["Batcher Name",                 "Stetter",              "", ""],
          ].map(([l1,v1,l2,v2], i) => (
            <tr key={i}>
              <td style={{ padding: "1px 4px", width: "24%", fontWeight: "bold", fontFamily: FONT, fontSize: "8px" }}>{l1}</td>
              <td style={{ padding: "1px 4px", width: "26%", fontFamily: FONT, fontSize: "8px" }}>: {v1}</td>
              <td style={{ padding: "1px 4px", width: "24%", fontWeight: "bold", fontFamily: FONT, fontSize: "8px" }}>{l2}</td>
              <td style={{ padding: "1px 4px", width: "26%", fontFamily: FONT, fontSize: "8px" }}>{l2 ? ": " : ""}{v2}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Ingredient table */}
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>{cats.map((g,i) => <th key={i} colSpan={g.span} style={CAT}>{g.cat}</th>)}</tr>
          <tr>{cols.map(c => <th key={c.key} style={{ ...TH, width: c.w + "px" }}>{c.hdr}</th>)}</tr>
          <tr>
            {cols.map((c, i) => (
              <td key={c.key} style={{ ...TD, width: c.w + "px" }}>
                {c.isMoi ? "in %" : batchTgt[i] === 0 ? "0" : c.dec ? batchTgt[i].toFixed(c.dec) : batchTgt[i]}
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={NCOLS} style={{ ...TD, textAlign: "left", fontStyle: "italic", fontSize: "7.5px" }}>
              Actual in Kgs.
            </td>
          </tr>
          {rows.map((row, bIdx) => (
            <tr key={bIdx} style={{ backgroundColor: bIdx % 2 === 0 ? "#fff" : "#fafafa" }}>
              {cols.map(c => {
                const act = parseFloat(row[c.key + "_actual"] || 0);
                return (
                  <td key={c.key} style={{ ...TD, width: c.w + "px", padding: "0 1px" }}>
                    <input
                      className="no-print"
                      type="number" step="0.001"
                      value={row[c.key + "_actual"] ?? 0}
                      onChange={e => onActualChange(bIdx, c.key, e.target.value)}
                      style={{ width: "100%", border: "none", textAlign: "right",
                        fontSize: "7.5px", padding: 0, background: "transparent", outline: "none" }}
                    />
                    <span className="print-only" style={{ display: "none" }}>
                      {act === 0 ? "0" : c.dec ? act.toFixed(c.dec) : act.toFixed(0)}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td colSpan={NCOLS} style={{ ...TD, textAlign: "left", fontStyle: "italic",
              fontSize: "7.5px", borderTop: "1px solid #000" }}>
              Total Set Weight in Kgs.
            </td>
          </tr>
          <tr style={{ fontWeight: "bold" }}>
            {setTotals.map((v, i) => (
              <td key={i} style={{ ...TD, width: cols[i].w + "px", fontWeight: "bold" }}>
                {v === 0 ? "0" : cols[i].dec ? v.toFixed(cols[i].dec) : Math.round(v)}
              </td>
            ))}
          </tr>
          <tr>
            <td colSpan={NCOLS} style={{ ...TD, textAlign: "left", fontStyle: "italic",
              fontSize: "7.5px", borderTop: "1px solid #000" }}>
              Total Actual in Kgs.
            </td>
          </tr>
          <tr style={{ fontWeight: "bold" }}>
            {actTotals.map((v, i) => (
              <td key={i} style={{ ...TD, width: cols[i].w + "px", fontWeight: "bold" }}>
                {v === 0 ? "0" : cols[i].dec ? v.toFixed(cols[i].dec) : Math.round(v)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════════════════════════════
export default function BatchReport() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { data, isLoading, error } = usePrintData();
  const printRef  = useRef();
  const [saving,       setSaving]      = useState(false);
  const [saved,        setSaved]       = useState(false);
  const [actuals,      setActuals]     = useState(null);
  const [pdfLoading,   setPdfLoading]  = useState(false);
  const [pdfError,     setPdfError]    = useState("");

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: data ? `BatchReport_${data.batch_number}_${data.plant_type}` : "Batch_Report",
  });

  if (isLoading) return <div className="p-8 text-gray-400">Loading…</div>;
  if (error)     return <div className="p-8 text-red-500">Failed to load delivery data.</div>;
  if (!data.plant_type || data.plant_type === "None")
    return <div className="p-8 text-gray-500">No batch report for this delivery (no plant type selected).</div>;

  const cols = COLS[data.plant_type] || COLS_M125;
  const dm   = data.design_mix;
  const { numBatches, batchSize } = calcBatches(parseFloat(data.quantity_m3), data.plant_type);

  const getRows = () => {
    if (actuals) return actuals;
    return Array.from({ length: numBatches }, (_, i) => {
      const saved = (data.batch_actuals || []).find(r => r.batch_sequence === i + 1);
      const row   = { batch_sequence: i + 1, batch_size_m3: batchSize };
      // For M1.25, default actual = batchTgt (per-batch target)
      // For CP30, default actual = per-m³ target × batch size
      cols.forEach(c => {
        const perM3  = parseFloat(dm?.[c.key] || 0);
        const tgt    = c.dec ? Math.round(perM3 * batchSize * 100) / 100 : Math.round(perM3 * batchSize);
        row[c.key + "_actual"] = saved ? parseFloat(saved[c.key + "_actual"] || 0) : tgt;
      });
      return row;
    });
  };

  const rows = getRows();

  function handleActualChange(bIdx, key, value) {
    setActuals(prev => {
      const r = prev || rows.map(x => ({ ...x }));
      return r.map((row, i) => i === bIdx ? { ...row, [key + "_actual"]: parseFloat(value) || 0 } : row);
    });
    setSaved(false);
  }

  async function saveActuals() {
    setSaving(true);
    try {
      await api.post(`/deliveries/${id}/batch-actuals`, { rows });
      setSaved(true);
    } finally { setSaving(false); }
  }

  async function downloadExcelPdf() {
    setPdfLoading(true);
    setPdfError("");
    try {
      const res = await api.get(`/batch-pdf/${id}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a   = document.createElement("a");
      a.href    = url;
      a.target  = "_blank";
      a.rel     = "noopener noreferrer";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e.response?.status === 503
        ? "Excel template not found. Place New_Batching_Slip.xlsx in backend/templates/"
        : e.response?.data
            ? await e.response.data.text?.() || "PDF generation failed."
            : "PDF generation failed.";
      setPdfError(msg);
    } finally { setPdfLoading(false); }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="no-print flex items-center gap-3 p-4 bg-white border-b sticky top-0 z-10">
        <button className="btn-secondary flex items-center gap-1" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Back
        </button>
        <span className="text-sm font-semibold text-primary">
          Batch Report — {data.plant_type} | Batch #{data.batch_number} | {data.grade_name}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <button className="btn-secondary flex items-center gap-1" onClick={saveActuals} disabled={saving}>
            <Save size={14} /> {saving ? "Saving…" : saved ? "Saved ✓" : "Save Actuals"}
          </button>
          {/* Excel → PDF via LibreOffice (exact template output) */}
          {data.plant_type === "M1.25" && (
            <button
              className="btn-accent flex items-center gap-1"
              onClick={downloadExcelPdf}
              disabled={pdfLoading}
              title="Generate PDF from Excel template (New_Batching_Slip.xlsx)"
            >
              <FileDown size={15} />
              {pdfLoading ? "Generating…" : "Excel PDF"}
            </button>
          )}
          <button className="btn-primary flex items-center gap-1" onClick={handlePrint}>
            <Printer size={15} /> Print
          </button>
        </div>
      </div>
      {pdfError && (
        <div className="no-print flex items-center gap-2 px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm">
          <AlertCircle size={14} />
          {pdfError}
        </div>
      )}

      {/* Print area */}
      <div ref={printRef} style={{ backgroundColor: "#fff" }}>
        <style>{`
          @media print {
            @page { size: A4 landscape; margin: 4mm; }
            body { margin: 0; }
            .no-print  { display: none !important; }
            .print-only { display: inline !important; }
          }
          @media screen { .print-only { display: none !important; } }
        `}</style>
        {data.plant_type === "M1.25"
          ? <M125Print d={data} rows={rows} onActualChange={handleActualChange} />
          : <CP30Print  d={data} rows={rows} onActualChange={handleActualChange} />
        }
      </div>
    </div>
  );
}
