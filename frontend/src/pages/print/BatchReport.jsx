import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Printer, ArrowLeft, Save } from "lucide-react";
import api from "../../api/axios";
import { usePrintData } from "../../hooks/usePrintData";

const MAX_BATCH = { "M1.25": 1.25, "CP30": 0.50 };

function calcBatches(qty, plantType) {
  const max = MAX_BATCH[plantType] || 1.25;
  const n   = Math.ceil(qty / max);
  const sz  = Math.round(qty / n * 1000) / 1000;
  return { numBatches: n, batchSize: sz };
}

// ── M1.25 column definitions — all 19 columns equal width (100/19 ≈ 5.263%)
const STD = "5.263%";
const SIL = "5.263%";

const COLS_M125 = [
  // Aggregate (6)
  { key: "sand1",    hdr: "Sand1",      cat: "Aggregate",  w: STD },
  { key: "agg_20mm", hdr: "20MM",       cat: "Aggregate",  w: STD },
  { key: "sand2",    hdr: "Sand2",      cat: "Aggregate",  w: STD },
  { key: "agg_12mm", hdr: "12MM",       cat: "Aggregate",  w: STD },
  { key: "agg_6mm",  hdr: "6MM",        cat: "Aggregate",  w: STD },
  { key: "agg6",     hdr: "Agg6",       cat: "Aggregate",  w: STD },
  // Cement (5)
  { key: "cem1",     hdr: "Cem1",       cat: "Cement",     w: STD },
  { key: "cem2",     hdr: "Cem2",       cat: "Cement",     w: STD },
  { key: "cem3",     hdr: "Cem3",       cat: "Cement",     w: STD },
  { key: "cem4",     hdr: "Cem4",       cat: "Cement",     w: STD },
  { key: "fly",      hdr: "CEM5",       cat: "Cement",     w: STD },
  // Water/Ice (3)
  { key: "wtr1",     hdr: "Wtr1",       cat: "Water/Ice",  w: STD },
  { key: "wtr2",     hdr: "Wtr2",       cat: "Water/Ice",  w: STD },
  { key: "wtr3",     hdr: "Wtr3",       cat: "Water/Ice",  w: STD },
  // Admixture (4)
  { key: "adx1",     hdr: "Adx 1",      cat: "Admixture",  w: STD, dec: 2 },
  { key: "adx2",     hdr: "Adx 2",      cat: "Admixture",  w: STD, dec: 2 },
  { key: "adx3",     hdr: "Adx 3",      cat: "Admixture",  w: STD, dec: 2 },
  { key: "adx4",     hdr: "Adx 4",      cat: "Admixture",  w: STD, dec: 2 },
  // Silica (1) — wider in Excel
  { key: "silica",   hdr: "Silica",     cat: "Silica",     w: SIL },
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

// ── Tolerance bands per material key (from PDF spec) ─────────────────────────
const TOLERANCE = {
  sand1:25, agg_20mm:25, sand2:25, agg_12mm:25, agg_6mm:25, agg6:25,
  cem1:4,   cem2:4,      cem3:4,   cem4:4,      fly:4,
  wtr1:10,  wtr2:10,     wtr3:10,
  adx1:0.5, adx2:0.5,   adx3:0.5, adx4:0.5,
  silica:0,
  // CP30 extras
  moisture:2, filler:4, col1:5,
};

// RANDBETWEEN — if target=0 stays 0; integer cols round to int, decimal cols to dec places
function randBetween(tgt, tol, dec = 0) {
  if (tgt === 0 || tol === 0) return tgt;
  const raw = tgt - tol + Math.random() * 2 * tol;
  return dec > 0
    ? Math.round(raw * Math.pow(10, dec)) / Math.pow(10, dec)
    : Math.round(raw);
}

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
const GDOT = "1px dotted #aaa";
const TD   = { border: GDOT, padding: "1px 2px", fontSize: "9pt", textAlign: "center",
               fontFamily: FONT, whiteSpace: "nowrap" };
const TH   = { ...TD, textAlign: "center", fontWeight: "bold", fontSize: "7px",
               whiteSpace: "nowrap" };
const CAT  = { ...TH, fontSize: "9pt", borderBottom: GDOT };

// ── Schwing Stetter Logo — actual image file ─────────────────────────────────
function Logo({ size = 56 }) {
  return (
    <img src="/schwing-logo.jpg" alt="Schwing Stetter"
      width={size} height={size}
      style={{ display: "block", objectFit: "contain" }} />
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

// ═══════════════════════════════════════════════════════════════════════════
// M1.25 Print Template — faithful to "other Batching Slip.xlsx"
// Print area A1:U73 | White bg | Gray dotted borders | A4 Portrait
// ═══════════════════════════════════════════════════════════════════════════
function M125Print({ d, rows, onActualChange, batchEndStr, batchStartStr, weighmentStr }) {
  const cols   = COLS_M125;
  const dm     = d.design_mix;
  const { numBatches, batchSize } = calcBatches(parseFloat(d.quantity_m3), "M1.25");
  const cats   = catGroups(cols);
  const NCOLS  = cols.length;

  // ── Derived data ─────────────────────────────────────────────────────────
  const dateStr = d.delivery_date
    ? (() => {
        const dt = new Date(d.delivery_date + "T00:00:00");
        return `${dt.getMonth() + 1}/${String(dt.getDate()).padStart(2,"0")}/${dt.getFullYear()}`;
      })()
    : "—";
  const timeStr    = d.delivery_time?.slice(0, 8) || "—";
  const orderedQty = parseFloat(d.quantity_m3);
  const prodQty    = batchSize * numBatches;
  const withLoad   = parseFloat(d.cumulative_qty_m3 || 0);

  // Row 15: recipe per m³ (Design Mix base values)
  const recPerM3  = cols.map(c => parseFloat(dm?.[c.key] || 0));
  // Row 17: per-batch target = recipe per m³ × batch size
  const batchTgt  = cols.map(c => {
    const v = parseFloat(dm?.[c.key] || 0);
    return c.dec ? Math.round(v * batchSize * 100) / 100 : Math.round(v * batchSize);
  });
  const setTotals  = batchTgt.map(v => v * numBatches);
  const actTotals  = cols.map(c => rows.reduce((s, r) => s + parseFloat(r[c.key + "_actual"] || 0), 0));
  const massSet    = setTotals.reduce((a, b) => a + b, 0);
  const massAct    = actTotals.reduce((a, b) => a + b, 0);
  const massRecTgt = recPerM3.reduce((a, b) => a + b, 0) * batchSize;

  // Row 72: percentage difference (actual − set) / set × 100
  const diffPctVal = (s, a) => {
    if (s === 0) return "0";
    return ((a - s) / s * 100).toFixed(2);
  };

  // Aggregate column keys — row 3 shows 0.00, row 4 shows 0.00 only for these
  const AGG_KEYS = new Set(["sand1","agg_20mm","sand2","agg_12mm","agg_6mm","agg6"]);

  // ── Design tokens ─────────────────────────────────────────────────────────
  const F     = FONT;
  const fs    = "9pt";
  const INNER = "1px dotted #aaa";   // gray dotted — cell dividers
  const PAD   = "2pt 3pt";           // inner padding for values

  // Base data cell — inner border, proper padding, right-aligned value
  const tc  = { border: INNER, padding: PAD, fontSize: fs, textAlign: "center",
                fontFamily: F, whiteSpace: "nowrap", backgroundColor: "#fff" };
  // Header cells — bold, centered
  const thc = { ...tc, textAlign: "center", whiteSpace: "nowrap", fontWeight: "normal" };
  // Category row
  const chc = { ...thc };
  // Recipe per m³ row: bold
  const rtr = { ...tc, fontWeight: "bold" };
  // Label-band: left-aligned, italic
  const lbl = { ...tc, textAlign: "left", fontStyle: "italic" };
  // Section label (Total Set / Total Actual / Diff %): left, bold
  const sec = { ...tc, textAlign: "left", fontWeight: "bold" };

  return (
    <div style={{ fontFamily: F, fontSize: fs, backgroundColor: "#fff",
      padding: "4mm 15mm", boxSizing: "border-box" }}>
      <div style={{ border: INNER, padding: "3mm" }}>

      {/* ══ HEADER — Logo (top-left) + Company name (center) ════════════════ */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "3px" }}>
        {/* Logo — top-left */}
        <div style={{ flexShrink: 0, marginRight: "8px" }}>
          <Logo size={52} />
        </div>
        {/* Company name — centered, 16pt bold (matches Excel header) */}
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: "16pt", fontWeight: "bold", fontFamily: F,
            lineHeight: "1.2", letterSpacing: "0.5px" }}>
            SRI AMMAN READY MIX CONCRETE
          </div>
        </div>
      </div>

      {/* ══ INFO SECTION — rows 2,4,6,8,10,12 of Excel ═════════════════════ */}
      {/* 3 columns × 6 rows, white bg, bold labels, gray dotted borders     */}
      <table style={{ width: "100%", borderCollapse: "collapse",
        marginBottom: "3px" }}>
        <tbody>
          <tr>
            <IC label="Batch Date"        value={dateStr} />
            <IC label="Batch Start Time"  value={batchStartStr || timeStr} />
            <IC label="Batch End Time"    value={batchEndStr || "—"} />
          </tr>
          <tr>
            <IC label="Batch Number"   value={d.batch_number} />
            <IC label="Recipe Code"    value={d.grade_name} />
            <IC label="Ordered Qty"    value={orderedQty.toFixed(2)} />
          </tr>
          <tr>
            <IC label="Batcher Name"   value="Stetter" />
            <IC label="Recipe Name"    value={d.grade_name} />
            <IC label="Production Qty" value={prodQty.toFixed(2)} />
          </tr>
          <tr>
            <IC label="Order Number"   value={d.order_number ?? 0} />
            <IC label="Pour Type"      value={d.pour_type || "—"} />
            <IC label="Adj/Manual Qty" value="0.00" />
          </tr>
          <tr>
            <IC label="Customer"       value={d.customer_name} />
            <IC label="Truck Driver"   value={d.driver_name} />
            <IC label="With This Load" value={withLoad.toFixed(2)} />
          </tr>
          <tr>
            <IC label="Site"           value={d.site_location || d.site_name} />
            <IC label="Batch Size"     value={String(batchSize)} bold />
            <IC label="With This Load" value={withLoad.toFixed(2)} />
          </tr>
        </tbody>
      </table>

      {/* ══ MATERIAL TABLE ═══════════════════════════════════════════════════ */}
      <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
        <thead>
          {/* Row 13 — Category header — no borders at all */}
          <tr style={{ height: "16pt" }}>
            {cats.map((g, i) => (
              <th key={i} colSpan={g.span} style={{
                ...chc, border: "none",
              }}>{g.cat}</th>
            ))}
          </tr>
          {/* Row 14 — Column names — slightly taller for 2-line headers */}
          <tr style={{ height: "16pt" }}>
            {cols.map(c => (
              <th key={c.key} style={{ ...thc, width: c.w }}>{c.hdr}</th>
            ))}
          </tr>
          {/* Row 15 — Recipe per m³ — compact */}
          <tr style={{ height: "16pt" }}>
            {recPerM3.map((v, i) => (
              <td key={i} style={{ ...tc, width: cols[i].w }}>
                {v === 0 ? (cols[i].dec ? "0.00" : "0") : cols[i].dec ? v.toFixed(cols[i].dec) : fv(v)}
              </td>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Row 16 — Mass of Recipe Targets — label + value in one full-width cell */}
          <tr style={{ height: "16pt" }}>
            <td colSpan={NCOLS}
              style={{ ...tc, border: "none", fontSize: "8pt" }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingRight: "2px" }}>
                <span style={{ fontStyle: "italic" }}>Mass of Recipe Targets in Kgs.</span>
                <span style={{ fontWeight: "bold" }}>{massRecTgt.toFixed(2)}</span>
              </div>
            </td>
          </tr>

          {/* Row 17 — Per-batch target — compact */}
          <tr style={{ height: "16pt" }}>
            {batchTgt.map((v, i) => (
              <td key={i} style={{ ...tc, width: cols[i].w }}>
                {v === 0 ? (cols[i].dec ? "0.00" : "0") : cols[i].dec ? v.toFixed(cols[i].dec) : fv(v)}
              </td>
            ))}
          </tr>

          {/* Row 18 — Label band — height = 2 data rows */}
          <tr style={{ height: "16pt" }}>
            <td colSpan={NCOLS} style={lbl}>
              Target and Actual Value with moisture correction/absorption in % and other Corrections in Kgs.
            </td>
          </tr>

          {/* ── Rows 19–63: Per-batch groups (5 rows each) ───────────────── */}
          {rows.map((row, bIdx) => [

            /* Row 1 of 5 — Target — compact, integers only */
            <tr key={`t${bIdx}`} style={{ height: "16pt" }}>
              {cols.map((c, i) => (
                <td key={c.key} style={{ ...tc, width: c.w }}>
                  {batchTgt[i] === 0 ? (c.dec ? "0.00" : "0")
                    : c.dec ? batchTgt[i].toFixed(c.dec) : fv(batchTgt[i])}
                </td>
              ))}
            </tr>,

            /* Row 2 of 5 — Actual — compact, integers only */
            <tr key={`a${bIdx}`} style={{ height: "16pt" }}>
              {cols.map((c, i) => {
                const act   = parseFloat(row[c.key + "_actual"] || 0);
                const tgt   = batchTgt[i];
                const offBy = tgt > 0 ? Math.abs(act - tgt) / tgt : 0;
                const disp  = act === 0 ? (c.dec ? "0.00" : "0") : c.dec ? act.toFixed(c.dec) : fv(act);
                return (
                  <td key={c.key} style={{ ...tc, width: c.w,
                    color: offBy > 0.05 ? "red" : "black", padding: "0 2pt" }}>
                    <input
                      className="no-print"
                      type={c.dec ? "text" : "number"}
                      step={c.dec ? undefined : "0.001"}
                      value={c.dec ? disp : (row[c.key + "_actual"] ?? 0)}
                      onChange={e => onActualChange(bIdx, c.key, e.target.value)}
                      style={{ width: "100%", border: "none", textAlign: "center",
                        fontSize: fs, padding: 0, background: "transparent", outline: "none" }}
                    />
                    <span className="print-only" style={{ display: "none" }}>{disp}</span>
                  </td>
                );
              })}
            </tr>,

            /* Row 3 of 5 — Moisture correction row (PDF): always hardcoded.
               Aggregate + Admix cols → "0.00" | Cement/Water/Silica → "0"
               This is machine moisture data we don't track — never calculated. */
            <tr key={`c${bIdx}`} style={{ height: "16pt" }}>
              {cols.map((c) => (
                <td key={c.key} style={{ ...tc, width: c.w, color: "#555" }}>
                  {AGG_KEYS.has(c.key) || c.dec ? "0.00" : "0"}
                </td>
              ))}
            </tr>,

            /* Row 4 of 5 — Second correction row (from PDF):
               Only first 6 aggregate cols show "0.00" — rest are EMPTY  */
            <tr key={`z${bIdx}`} style={{ height: "16pt" }}>
              {cols.map((c, i) => (
                <td key={c.key} style={{ ...tc, width: c.w, color: "#aaa" }}>
                  {AGG_KEYS.has(c.key) ? "0.00" : ""}
                </td>
              ))}
            </tr>,

            /* Row 5 of 5 — Empty separator — 80% shorter than data rows */
            <tr key={`e${bIdx}`} style={{ height: "3pt" }}>
              {cols.map((c, i) => (
                <td key={c.key} style={{ ...tc, width: c.w, padding: "0" }} />
              ))}
            </tr>,
          ])}

          {/* ══ TOTALS SECTION — rows 64–72 of Excel ═══════════════════════ */}

          {/* Row 64 — Total Set Weight label */}
          <tr style={{ height: "16pt" }}><td colSpan={NCOLS} style={sec}>Total Set Weight in Kgs.</td></tr>
          {/* Row 65 — Total Set Weight values — compact, integers */}
          <tr style={{ height: "16pt" }}>
            {cols.map((c, i) => (
              <td key={c.key} style={{ ...tc, width: c.w, fontWeight: "bold" }}>
                {setTotals[i] === 0 ? (c.dec ? "0.00" : "0") : c.dec ? setTotals[i].toFixed(c.dec) : fv(setTotals[i])}
              </td>
            ))}
          </tr>
          {/* Row 66 — Mass of Total Set Weight */}
          <tr style={{ height: "16pt" }}>
            <td colSpan={NCOLS} style={{ ...tc, border: "none", fontSize: "8pt" }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingRight: "2px" }}>
                <span style={{ fontStyle: "italic" }}>Mass of Total Set Weight in Kgs.</span>
                <span style={{ fontWeight: "bold" }}>{massSet.toFixed(2)}</span>
              </div>
            </td>
          </tr>

          {/* Row 67 — Total Actual Weight label */}
          <tr style={{ height: "16pt" }}>
            <td colSpan={NCOLS} style={sec}>Total Actual Weight in Kgs.</td>
          </tr>
          {/* Row 68 — Total Actual Weight values — integers */}
          <tr style={{ height: "16pt" }}>
            {cols.map((c, i) => (
              <td key={c.key} style={{ ...tc, width: c.w, fontWeight: "bold" }}>
                {actTotals[i] === 0 ? (c.dec ? "0.00" : "0") : c.dec ? actTotals[i].toFixed(c.dec) : fv(actTotals[i])}
              </td>
            ))}
          </tr>
          {/* Row 69 — Mass of Total Actual Weight */}
          <tr style={{ height: "16pt" }}>
            <td colSpan={NCOLS} style={{ ...tc, border: "none", fontSize: "8pt" }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingRight: "2px" }}>
                <span style={{ fontStyle: "italic" }}>Mass of Total Actual Weight in Kgs.</span>
                <span style={{ fontWeight: "bold" }}>{massAct.toFixed(2)}</span>
              </div>
            </td>
          </tr>

          {/* Row 70 — Difference in Percentage label */}
          <tr style={{ height: "16pt" }}>
            <td colSpan={NCOLS} style={{ ...sec, color: "black" }}>Difference in Percentage</td>
          </tr>
          {/* Row 72 — Percentage values — 2 decimals */}
          <tr style={{ height: "16pt" }}>
            {cols.map((c, i) => {
              const pct = parseFloat(diffPctVal(setTotals[i], actTotals[i]));
              return (
                <td key={c.key} style={{ ...tc, width: c.w }}>
                  {pct === 0 ? (c.dec ? "0.00" : "0") : pct.toFixed(2)}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
      <table style={{ width: "100%", borderCollapse: "collapse",
        borderTop: INNER, marginTop: "3px", paddingTop: "2px" }}>
        <tbody>
          <tr>
            <td style={{ width: "45%", fontFamily: F, fontSize: "7px", verticalAlign: "middle" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <Logo size={16} />
                <span style={{ fontWeight: "bold" }}>Schwing Stetter</span>
              </div>
              <div style={{ fontSize: "8pt", color: "#444" }}>
                MCI 550 ver 1.0 Statistical Report
              </div>
            </td>
            <td style={{ textAlign: "center", fontFamily: F, fontSize: "7px",
              fontWeight: "bold" }}>
              Page 1
            </td>
            <td style={{ width: "45%" }} />
          </tr>
        </tbody>
      </table>
      </div>{/* end gray outer border */}
    </div>
  );
}

// ── IC: Info cell helper — flex layout, fixed label width = perfect colon alignment
function IC({ label, value, bold }) {
  return (
    <td style={{ padding: "1pt 4pt", fontFamily: FONT, fontSize: "10pt",
      verticalAlign: "top", width: "33%" }}>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <span style={{ fontWeight: "bold", width: "100px", flexShrink: 0,
          whiteSpace: "nowrap", overflow: "hidden" }}>{label}</span>
        <span style={{ flexShrink: 0, marginRight: "1px" }}>:</span>
        <span style={{ fontWeight: bold ? "bold" : "normal",
          overflowWrap: "break-word", wordBreak: "break-all", paddingLeft: "1px" }}>{value ?? "—"}</span>
      </div>
    </td>
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
    <div style={{ fontFamily: FONT, fontSize: "8px", backgroundColor: "#fff", padding: "4mm 15mm" }}>

      {/* Header */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4px" }}>
        <tbody>
          <tr>
            <td style={{ width: "60px", verticalAlign: "top" }}>
              <Logo size={44} />
              <div style={{ fontSize: "8pt", color: "#444" }}>SCHWING</div>
              <div style={{ fontSize: "8pt", color: "#444" }}>Stetter</div>
            </td>
            <td style={{ textAlign: "center" }}>
              <div style={{ fontSize: "14px", fontWeight: "bold" }}>SRI AMMAN</div>
              <div style={{ fontSize: "9pt" }}>MCI 70 N Control System Ver 3.1</div>
              <div style={{ fontSize: "9px", fontWeight: "bold", marginTop: "2px" }}>
                Docket / Batch Report / Autographic Record
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Date row */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: GDOT, marginBottom: "3px" }}>
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
      <table style={{ width: "100%", borderCollapse: "collapse", border: GDOT, marginBottom: "4px" }}>
        <tbody>
          {[
            ["Batch Number / Docket Number", d.batch_number || "—", "Ordered Quantity",    `${parseFloat(d.quantity_m3).toFixed(2)} M³`],
            ["Customer",                     d.customer_name,        "Production Quantity", `${(batchSize * numBatches).toFixed(2)} M³`],
            ["Site",                         d.site_location,        "Adj/Manual Quantity", "0.00 M³"],
            ["Recipe Code",                  d.grade_name,           "With This Load",      `${parseFloat(d.cumulative_qty_m3||0).toFixed(2)} M³`],
            ["Recipe Name",                  d.grade_name,           "Mixer Capacity",      `${MAX_BATCH["CP30"]} M³`],
            ["Truck Number",                 d.vehicle_number,       "Batch Size",          <b>{batchSize} M³</b>],
            ["Truck Driver",                 d.driver_name,          "", ""],
            ["Order Number",                 d.order_number ?? 0,    "", ""],
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
          <tr>{cols.map(c => <th key={c.key} style={{ ...TH, width: c.w }}>{c.hdr}</th>)}</tr>
          <tr>
            {cols.map((c, i) => (
              <td key={c.key} style={{ ...TD, width: c.w }}>
                {c.isMoi ? "in %" : batchTgt[i] === 0 ? "0" : c.dec ? batchTgt[i].toFixed(c.dec) : batchTgt[i]}
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={NCOLS} style={{ ...TD, textAlign: "left", fontStyle: "italic", fontSize: "9pt" }}>
              Actual in Kgs.
            </td>
          </tr>
          {rows.map((row, bIdx) => (
            <tr key={bIdx} style={{ backgroundColor: bIdx % 2 === 0 ? "#fff" : "#fafafa" }}>
              {cols.map(c => {
                const act = parseFloat(row[c.key + "_actual"] || 0);
                return (
                  <td key={c.key} style={{ ...TD, width: c.w, padding: "0 1px" }}>
                    <input
                      className="no-print"
                      type="number" step="0.001"
                      value={row[c.key + "_actual"] ?? 0}
                      onChange={e => onActualChange(bIdx, c.key, e.target.value)}
                      style={{ width: "100%", border: "none", textAlign: "center",
                        fontSize: "9pt", padding: 0, background: "transparent", outline: "none" }}
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
              fontSize: "9pt", borderTop: GDOT }}>
              Total Set Weight in Kgs.
            </td>
          </tr>
          <tr style={{ fontWeight: "bold" }}>
            {setTotals.map((v, i) => (
              <td key={i} style={{ ...TD, width: cols[i].w, fontWeight: "bold" }}>
                {v === 0 ? "0" : cols[i].dec ? v.toFixed(cols[i].dec) : Math.round(v)}
              </td>
            ))}
          </tr>
          <tr>
            <td colSpan={NCOLS} style={{ ...TD, textAlign: "left", fontStyle: "italic",
              fontSize: "9pt", borderTop: GDOT }}>
              Total Actual in Kgs.
            </td>
          </tr>
          <tr style={{ fontWeight: "bold" }}>
            {actTotals.map((v, i) => (
              <td key={i} style={{ ...TD, width: cols[i].w, fontWeight: "bold" }}>
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
  const { data: tolData = [] } = useQuery({
    queryKey: ["tolerances"],
    queryFn: () => api.get("/admin/tolerances").then(r => r.data),
    staleTime: 60000,
  });
  const { data: timingData = [] } = useQuery({
    queryKey: ["timing-settings"],
    queryFn: () => api.get("/admin/timing-settings").then(r => r.data),
    staleTime: 60000,
  });

  // Build tolerance lookup
  const TOL = tolData.length
    ? Object.fromEntries(tolData.map(t => [t.key, parseFloat(t.tolerance)]))
    : TOLERANCE;

  // Build timing lookup  { batch_end_min:2, batch_end_max:4, ... }
  const TIM = Object.fromEntries(timingData.map(t => [t.key, t.value]));

  const printRef      = useRef();
  const randRowsRef   = useRef({ id: null, rows: null });
  const timingRef     = useRef(null); // cache computed times per delivery

  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [actuals, setActuals] = useState(null);
  const [dcTime,  setDcTime]  = useState(null); // editable DC time (null = use now)

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

  // ── Compute times once per delivery (cached in timingRef) ─────────────────
  const fmt = (d) => d.toTimeString().slice(0, 8); // HH:MM:SS
  const fmtDT = (d) => d.toTimeString().slice(0, 5); // HH:MM for input

  if (!timingRef.current || timingRef.current.id !== data.id) {
    const endMin   = TIM.batch_end_min   ?? 2;
    const endMax   = TIM.batch_end_max   ?? 4;
    const durSec   = TIM.batch_per_duration ?? 69;
    const wMin     = TIM.weighment_min   ?? 2;
    const wMax     = TIM.weighment_max   ?? 4;

    const dc       = dcTime ? new Date(`1970-01-01T${dcTime}`) : new Date();
    const endOff   = (endMin + Math.random() * (endMax - endMin)) * 60 * 1000;
    const batchEnd = new Date(dc - endOff);
    const batchStart = new Date(batchEnd - numBatches * durSec * 1000);
    const wOff     = (wMin  + Math.random() * (wMax  - wMin))  * 60 * 1000;
    const weighment = new Date(batchEnd + wOff);

    timingRef.current = {
      id: data.id,
      batchEndStr:   fmt(batchEnd),
      batchStartStr: fmt(batchStart),
      weighmentStr:  fmt(weighment),
    };
  }
  const { batchEndStr, batchStartStr, weighmentStr } = timingRef.current;

  const getRows = () => {
    if (actuals) return actuals;
    // Return cached random rows for this delivery (don't re-randomize on every render)
    if (randRowsRef.current.id === data.id && randRowsRef.current.rows) {
      return randRowsRef.current.rows;
    }
    // Generate fresh RANDBETWEEN actuals for each batch
    const generated = Array.from({ length: numBatches }, (_, i) => {
      const saved = (data.batch_actuals || []).find(r => r.batch_sequence === i + 1);
      const row   = { batch_sequence: i + 1, batch_size_m3: batchSize };
      cols.forEach(c => {
        const perM3 = parseFloat(dm?.[c.key] || 0);
        const tgt   = c.dec ? Math.round(perM3 * batchSize * 100) / 100 : Math.round(perM3 * batchSize);
        row[c.key + "_actual"] = saved
          ? parseFloat(saved[c.key + "_actual"] || 0)
          : randBetween(tgt, TOL[c.key] ?? 0, c.dec || 0);
      });
      return row;
    });
    randRowsRef.current = { id: data.id, rows: generated };
    return generated;
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
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span>DC Time:</span>
          <input type="time" className="input py-1 text-xs w-28"
            value={dcTime ?? new Date().toTimeString().slice(0,5)}
            onChange={e => { setDcTime(e.target.value); timingRef.current = null; }} />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button className="btn-secondary flex items-center gap-1" onClick={saveActuals} disabled={saving}>
            <Save size={14} /> {saving ? "Saving…" : saved ? "Saved ✓" : "Save Actuals"}
          </button>
          <button className="btn-primary flex items-center gap-1" onClick={handlePrint}>
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      {/* Print area — A4 size on screen, exact A4 on print */}
      <div style={{ backgroundColor: "#e5e5e5", padding: "16px 0", minHeight: "100vh" }}
        className="no-print-bg">
        <style>{`
          @media print {
            @page { size: A4 portrait; margin: 4mm; }
            body { margin: 0; background: white; }
            .no-print      { display: none !important; }
            .no-print-bg   { background: white !important; padding: 0 !important; }
            .print-only    { display: inline !important; }
          }
          @media screen { .print-only { display: none !important; } }
        `}</style>
        {/* A4 page shadow on screen */}
        <div ref={printRef}
          style={{
            width: "210mm",
            minHeight: "297mm",
            margin: "0 auto",
            backgroundColor: "#fff",
            boxShadow: "0 2px 16px rgba(0,0,0,0.25)",
          }}>
          {data.plant_type === "M1.25"
            ? <M125Print d={data} rows={rows} onActualChange={handleActualChange}
                batchEndStr={batchEndStr} batchStartStr={batchStartStr} weighmentStr={weighmentStr} />
            : <CP30Print  d={data} rows={rows} onActualChange={handleActualChange}
                batchEndStr={batchEndStr} batchStartStr={batchStartStr} weighmentStr={weighmentStr} />
          }
        </div>
      </div>
    </div>
  );
}
