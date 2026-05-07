import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { useNavigate, useParams } from "react-router-dom";
import { Printer, ArrowLeft, Save } from "lucide-react";
import api from "../../api/axios";
import { usePrintData } from "../../hooks/usePrintData";

const MAX_BATCH = { "M1.25": 1.25, "CP30": 0.50 };

function calcBatches(qty, plantType) {
  const max = MAX_BATCH[plantType] || 1.25;
  const n = Math.ceil(qty / max);
  const size = Math.round((qty / n) * 1000) / 1000;
  return { numBatches: n, batchSize: size };
}

// ── Schwing Stetter Logo SVG ──────────────────────────────────────────────────
function Logo({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <rect width="48" height="48" fill="white" />
      <polygon points="6,42 24,6 42,42 36,42 24,18 12,42" fill="#2d7a2d" />
      <polygon points="12,42 24,20 36,42 30,42 24,28 18,42" fill="white" />
    </svg>
  );
}

// ── Column definitions ────────────────────────────────────────────────────────
const M125_COLS = [
  { key: "sand1",    label: "M\nSAND",  cat: "Aggregate",  w: 36 },
  { key: "agg_20mm", label: "20MM",     cat: "Aggregate",  w: 34 },
  { key: "sand2",    label: "M\nSAND",  cat: "Aggregate",  w: 36 },
  { key: "agg_12mm", label: "12MM",     cat: "Aggregate",  w: 34 },
  { key: "agg_6mm",  label: "6MM",      cat: "Aggregate",  w: 28 },
  { key: "agg6",     label: "Agg6",     cat: "Aggregate",  w: 28 },
  { key: "cem1",     label: "Cem1",     cat: "Cement",     w: 30 },
  { key: "cem2",     label: "Cem2",     cat: "Cement",     w: 30 },
  { key: "cem3",     label: "Cem3",     cat: "Cement",     w: 30 },
  { key: "cem4",     label: "Cem4",     cat: "Cement",     w: 30 },
  { key: "fly",      label: "CEM5",     cat: "Cement",     w: 30 },
  { key: "wtr1",     label: "Wtr1",     cat: "Water/Ice",  w: 30 },
  { key: "wtr2",     label: "Wtr2",     cat: "Water/Ice",  w: 30 },
  { key: "wtr3",     label: "Wtr3",     cat: "Water/Ice",  w: 30 },
  { key: "adx1",     label: "Admix\n1", cat: "Admixture",  w: 34, dec: 2 },
  { key: "adx2",     label: "Admix\n2", cat: "Admixture",  w: 34, dec: 2 },
  { key: "adx3",     label: "Admix\n3", cat: "Admixture",  w: 34, dec: 2 },
  { key: "adx4",     label: "Admix\n4", cat: "Admixture",  w: 34, dec: 2 },
  { key: "silica",   label: "Silica",   cat: "Silica",     w: 32 },
];

const CP30_COLS = [
  { key: "agg_20mm", label: "20MM",    cat: "Aggregate", w: 38 },
  { key: "sand1",    label: "SAND",    cat: "Aggregate", w: 38 },
  { key: "moisture", label: "Moi",     cat: "Aggregate", w: 30, isMoi: true },
  { key: "agg_12mm", label: "10MM",    cat: "Aggregate", w: 38 },
  { key: "agg_6mm",  label: "0",       cat: "Aggregate", w: 24 },
  { key: "cem1",     label: "CEM 1",   cat: "Cement",    w: 38 },
  { key: "cem2",     label: "CEM 2",   cat: "Cement",    w: 38 },
  { key: "filler",   label: "FILLER",  cat: "Cement",    w: 38 },
  { key: "wtr1",     label: "WATER",   cat: "Water",     w: 38 },
  { key: "col1",     label: "-",       cat: "MS/ICE",    w: 24 },
  { key: "adx1",     label: "ADMIX1",  cat: "Admixture", w: 40, dec: 2 },
  { key: "adx2",     label: "-",       cat: "Admixture", w: 30, dec: 2 },
];

const COLS = { "M1.25": M125_COLS, "CP30": CP30_COLS };

function f(v, dec = 0) {
  const n = parseFloat(v || 0);
  return n === 0 ? "0" : dec > 0 ? n.toFixed(dec) : Math.round(n).toString();
}

function groupCols(cols) {
  const groups = [];
  cols.forEach(c => {
    const last = groups[groups.length - 1];
    if (last && last.cat === c.cat) last.span++;
    else groups.push({ cat: c.cat, span: 1 });
  });
  return groups;
}

// ── Border / cell styles ──────────────────────────────────────────────────────
const B = "1px solid #000";
const fs = "7.5px";
const TD = { border: B, padding: "1px 2px", textAlign: "right", fontSize: fs, whiteSpace: "nowrap", fontFamily: "Arial, sans-serif" };
const TDL = { ...TD, textAlign: "left", fontWeight: "bold" };
const TH = { ...TD, textAlign: "center", fontWeight: "bold", backgroundColor: "#fff" };

// ── M1.25 Print ───────────────────────────────────────────────────────────────
function M125Print({ d, cols, rows, onActualChange }) {
  const dm = d.design_mix;
  const { numBatches, batchSize } = calcBatches(parseFloat(d.quantity_m3), "M1.25");
  const groups = groupCols(cols);

  const dateStr = d.delivery_date
    ? new Date(d.delivery_date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "";

  const targetPerBatch = cols.map(c => {
    const v = parseFloat(dm?.[c.key] || 0);
    return c.dec ? Math.round(v * batchSize * 100) / 100 : Math.round(v * batchSize);
  });

  const setTotals = targetPerBatch.map(t => t * numBatches);
  const actTotals = cols.map((c, i) => rows.reduce((s, r) => s + (parseFloat(r[c.key + "_actual"] || 0)), 0));
  const massSet = setTotals.reduce((a, b) => a + b, 0);
  const massAct = actTotals.reduce((a, b) => a + b, 0);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", fontSize: "8px", padding: "4mm", backgroundColor: "#fff" }}>

      {/* ── Header ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "3px" }}>
        <tbody>
          <tr>
            <td style={{ width: "60px", verticalAlign: "top" }}>
              <Logo size={52} />
              <div style={{ fontSize: "6.5px", marginTop: "2px" }}>Schwing</div>
              <div style={{ fontSize: "6.5px" }}>Stetter</div>
            </td>
            <td style={{ textAlign: "center", verticalAlign: "middle" }}>
              <div style={{ fontSize: "15px", fontWeight: "bold" }}>SRI AMMAN READY MIX CONCRETE</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Batch info row 1 ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2px", fontSize: "8px" }}>
        <tbody>
          <tr>
            <td style={{ width: "33%" }}>
              <b>Batch Date</b>&nbsp;&nbsp;: {dateStr}
            </td>
            <td style={{ width: "33%", textAlign: "center" }}>
              <b>Batch Start Time</b>&nbsp;: {d.delivery_time?.slice(0, 8) || "—"}
            </td>
            <td style={{ width: "34%", textAlign: "right" }}>
              <b>Batch End Time</b>&nbsp;: —
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Batch info main table ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: B, marginBottom: "3px", fontSize: "8px" }}>
        <tbody>
          <tr>
            <td style={{ width: "16%", padding: "1px 3px", verticalAlign: "top" }}>
              <InfoL label="Batch Number" value={d.batch_number || "—"} />
              <InfoL label="Batcher Name" value="Stetter" />
              <InfoL label="Customer" value={d.customer_name} />
              <InfoL label="Site" value={d.site_location || d.site_name} />
              <InfoL label="Order Number" value={d.dc_number} />
            </td>
            <td style={{ width: "16%", padding: "1px 3px", verticalAlign: "top" }}>
              <InfoL label="Recipe Code" value={d.grade_name} />
              <InfoL label="Recipe Name" value={d.grade_name} />
              <InfoL label="Truck Number" value={d.vehicle_number} />
              <InfoL label="Truck Driver" value={d.driver_name} />
            </td>
            <td style={{ width: "17%", padding: "1px 3px", verticalAlign: "top" }}>
              <InfoR label="Ordered Qty" value={parseFloat(d.quantity_m3).toFixed(2)} />
              <InfoR label="Production Qty" value={(batchSize * numBatches).toFixed(2)} />
              <InfoR label="Adj/Manual Qty" value="0.00" />
              <InfoR label="With This Load" value={parseFloat(d.cumulative_qty_m3 || 0).toFixed(2)} />
              <InfoR label="Batch Size" value={batchSize} bold />
              <InfoR label="Mixer Capacity" value={MAX_BATCH["M1.25"]} />
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Recipe target row ── */}
      <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: "1px" }}>
        <tbody>
          <tr>
            <td style={{ ...TH, width: "80px", textAlign: "left", borderRight: "0" }}></td>
            {groups.map((g, i) => (
              <th key={i} colSpan={g.span} style={{ ...TH, borderBottom: "0" }}>{g.cat}</th>
            ))}
          </tr>
          <tr>
            <td style={{ ...TD, textAlign: "left", fontSize: "7px", fontWeight: "bold", width: "80px" }}></td>
            {cols.map(c => (
              <td key={c.key} style={{ ...TH, fontSize: "7px", whiteSpace: "pre-line", width: c.w + "px" }}>
                {c.label}
              </td>
            ))}
          </tr>
          <tr>
            <td style={{ ...TDL, fontSize: "7px" }}>Target / batch</td>
            {targetPerBatch.map((v, i) => (
              <td key={i} style={{ ...TD }}>{v === 0 ? "0" : cols[i].dec ? v.toFixed(cols[i].dec) : v}</td>
            ))}
          </tr>
        </tbody>
      </table>
      <div style={{ fontSize: "7px", fontStyle: "italic", marginBottom: "2px", marginLeft: "1px" }}>
        Mass of Recipe Targets in Kgs.&nbsp;&nbsp;
        <b>{targetPerBatch.reduce((a, b) => a + b, 0).toFixed(2)}</b>
      </div>

      {/* ── Per-batch target + actual ── */}
      <div style={{ fontSize: "7.5px", marginBottom: "1px" }}>
        Target and Actual Value with moisture correction/absorption in % and other Corrections in Kgs.
      </div>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          {rows.map((row, bIdx) => {
            const rowActMass = cols.reduce((s, c) => s + (parseFloat(row[c.key + "_actual"] || 0)), 0);
            const rowSetMass = targetPerBatch.reduce((a, b) => a + b, 0);
            return [
              /* Target row */
              <tr key={`t${bIdx}`} style={{ backgroundColor: bIdx % 2 === 0 ? "#f9f9f9" : "#fff" }}>
                {targetPerBatch.map((v, i) => (
                  <td key={i} style={{ ...TD, width: cols[i].w + "px" }}>
                    {v === 0 ? "0.00" : cols[i].dec ? v.toFixed(cols[i].dec) : v + ".00"}
                  </td>
                ))}
                <td style={{ ...TD }}>{rowSetMass.toFixed(2)}</td>
              </tr>,
              /* Actual row */
              <tr key={`a${bIdx}`} style={{ backgroundColor: bIdx % 2 === 0 ? "#f9f9f9" : "#fff" }}>
                {cols.map((c, i) => {
                  const tgt = targetPerBatch[i];
                  const act = parseFloat(row[c.key + "_actual"] || 0);
                  return (
                    <td key={c.key} style={{ ...TD, width: c.w + "px", color: tgt > 0 && Math.abs(act - tgt) / tgt > 0.05 ? "red" : "black" }}>
                      <input
                        className="no-print"
                        type="number" step="0.001"
                        value={row[c.key + "_actual"] ?? 0}
                        onChange={e => onActualChange(bIdx, c.key, e.target.value)}
                        style={{ width: "100%", border: "none", textAlign: "right", fontSize: "7.5px", padding: 0, background: "transparent", outline: "none" }}
                      />
                      <span className="print-only" style={{ display: "none" }}>
                        {c.dec ? act.toFixed(c.dec) : act.toFixed(2)}
                      </span>
                    </td>
                  );
                })}
                <td style={{ ...TD }}>{rowActMass.toFixed(2)}</td>
              </tr>,
              /* Correction % row */
              <tr key={`c${bIdx}`}>
                {cols.map((c, i) => (
                  <td key={c.key} style={{ ...TD, fontSize: "7px", color: "#555", width: c.w + "px" }}>0.00</td>
                ))}
                <td style={{ ...TD, fontSize: "7px" }}></td>
              </tr>,
              /* Spacer */
              <tr key={`s${bIdx}`}>
                {cols.map((c, i) => (
                  <td key={c.key} style={{ ...TD, fontSize: "7px", color: "#aaa", width: c.w + "px" }}>0.00</td>
                ))}
                <td style={{ ...TD }}></td>
              </tr>,
            ];
          })}

          {/* Total Set Weight */}
          <tr style={{ backgroundColor: "#eee", fontWeight: "bold" }}>
            {setTotals.map((v, i) => (
              <td key={i} style={{ ...TD, fontWeight: "bold", width: cols[i].w + "px" }}>
                {v === 0 ? "0" : cols[i].dec ? v.toFixed(cols[i].dec) : Math.round(v)}
              </td>
            ))}
            <td style={{ ...TD, fontWeight: "bold" }}>{massSet.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ fontSize: "7.5px", marginTop: "1px", marginBottom: "1px" }}>
        <b>Total Set Weight in Kgs.</b>
        &nbsp;&nbsp;&nbsp;Mass of Total Set Weight in Kgs.&nbsp;<b>{massSet.toFixed(2)}</b>
      </div>

      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          <tr style={{ backgroundColor: "#e8f0fe", fontWeight: "bold" }}>
            {actTotals.map((v, i) => (
              <td key={i} style={{ ...TD, fontWeight: "bold", width: cols[i].w + "px" }}>
                {v === 0 ? "0" : cols[i].dec ? v.toFixed(cols[i].dec) : Math.round(v)}
              </td>
            ))}
            <td style={{ ...TD, fontWeight: "bold" }}>{massAct.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ fontSize: "7.5px", marginTop: "1px", marginBottom: "1px" }}>
        <b>Total Actual Weight in Kgs.</b>
        &nbsp;&nbsp;&nbsp;Mass of Total Actual Weight in Kgs.&nbsp;<b>{massAct.toFixed(2)}</b>
      </div>

      {/* Difference % */}
      <div style={{ fontSize: "7.5px", marginBottom: "1px" }}><b>Difference in Percentage</b></div>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          <tr>
            {cols.map((c, i) => {
              const s = setTotals[i], a = actTotals[i];
              const p = s > 0 ? ((a - s) / s * 100) : 0;
              return (
                <td key={c.key} style={{ ...TD, width: c.w + "px", color: Math.abs(p) > 2 ? "red" : "black", fontWeight: "bold" }}>
                  {p.toFixed(2)}
                </td>
              );
            })}
            <td style={{ ...TD, fontWeight: "bold" }}>
              {massSet > 0 ? ((massAct - massSet) / massSet * 100).toFixed(2) : "0.00"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <table style={{ width: "100%", marginTop: "6px", fontSize: "7px", borderTop: B }}>
        <tbody>
          <tr>
            <td><Logo size={20} /> Schwing Stetter</td>
            <td style={{ textAlign: "center" }}>MCI 550 ver 1.0 Statistical Report</td>
            <td style={{ textAlign: "right" }}>
              Print Date : {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}&nbsp;
              {new Date().toLocaleTimeString("en-IN")}&nbsp;&nbsp;Page1
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── CP30 Print ────────────────────────────────────────────────────────────────
function CP30Print({ d, cols, rows, onActualChange }) {
  const dm = d.design_mix;
  const { numBatches, batchSize } = calcBatches(parseFloat(d.quantity_m3), "CP30");
  const groups = groupCols(cols);

  const dateStr = d.delivery_date
    ? new Date(d.delivery_date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })
    : "";

  const targetPerBatch = cols.map(c => {
    const v = parseFloat(dm?.[c.key] || 0);
    return c.dec ? Math.round(v * batchSize * 100) / 100 : Math.round(v * batchSize);
  });

  const setTotals = targetPerBatch.map(t => t * numBatches);
  const actTotals = cols.map(c => rows.reduce((s, r) => s + (parseFloat(r[c.key + "_actual"] || 0)), 0));

  return (
    <div style={{ fontFamily: "Arial, sans-serif", fontSize: "8px", padding: "5mm", backgroundColor: "#fff" }}>

      {/* ── Header ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4px" }}>
        <tbody>
          <tr>
            <td style={{ width: "70px", verticalAlign: "top" }}>
              <Logo size={44} />
              <div style={{ fontSize: "6.5px", marginTop: "2px", color: "#555" }}>SCHWING</div>
              <div style={{ fontSize: "6.5px", color: "#555" }}>Stetter</div>
            </td>
            <td style={{ textAlign: "center" }}>
              <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "2px" }}>SRI AMMAN</div>
              <div style={{ fontSize: "7.5px" }}>MCI 70 N Control System Ver 3.1</div>
              <div style={{ fontSize: "10px", fontWeight: "bold", marginTop: "3px" }}>
                Docket / Batch Report / Autographic Record
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Date/Time + Plant Serial ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "3px", fontSize: "8px", border: B }}>
        <tbody>
          <tr>
            <td style={{ padding: "1px 4px", width: "50%" }}>
              <b>Batch Date</b>&nbsp;&nbsp;&nbsp;: {dateStr}
            </td>
            <td style={{ padding: "1px 4px", textAlign: "right" }}>
              <b>Plant Serial Number:</b>&nbsp;&nbsp;3794
            </td>
          </tr>
          <tr>
            <td style={{ padding: "1px 4px" }}>
              <b>Batch Start Time</b>&nbsp;: {d.delivery_time?.slice(0, 8) || "—"}
            </td>
            <td></td>
          </tr>
          <tr>
            <td style={{ padding: "1px 4px" }}><b>Batch End Time</b>&nbsp;&nbsp;&nbsp;: —</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      {/* ── Batch info 2-column ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: B, marginBottom: "4px", fontSize: "8px" }}>
        <tbody>
          {[
            ["Batch Number / Docket Number", d.batch_number || "—", "Ordered Quantity", `${parseFloat(d.quantity_m3).toFixed(2)} M³`],
            ["Customer", d.customer_name, "Production Quantity", `${(batchSize * numBatches).toFixed(2)} M³`],
            ["Site", d.site_location || d.site_name, "Adj/Manual Quantity", "0.00 M³"],
            ["Recipe Code", d.grade_name, "With This Load", `${parseFloat(d.cumulative_qty_m3 || 0).toFixed(2)} M³`],
            ["Recipe Name", d.grade_name, "Mixer Capacity", `${MAX_BATCH["CP30"]} M³`],
            ["Truck Number", d.vehicle_number, "Batch Size", <b>{batchSize} M³</b>],
            ["Truck Driver", d.driver_name, "", ""],
            ["Order Number", d.dc_number, "", ""],
            ["Batcher Name", "Stetter", "", ""],
          ].map(([l1, v1, l2, v2], i) => (
            <tr key={i}>
              <td style={{ padding: "1px 4px", width: "25%", fontWeight: "bold" }}>{l1}</td>
              <td style={{ padding: "1px 4px", width: "25%" }}>: {v1}</td>
              <td style={{ padding: "1px 4px", width: "25%", fontWeight: "bold" }}>{l2}</td>
              <td style={{ padding: "1px 4px", width: "25%" }}>{l2 ? ": " : ""}{v2}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Ingredient table ── */}
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          {/* Category row */}
          <tr>
            <th style={{ ...TH, width: "20px" }}></th>
            {groups.map((g, i) => (
              <th key={i} colSpan={g.span} style={{ ...TH, borderBottom: "0" }}>{g.cat}</th>
            ))}
          </tr>
          {/* Column headers */}
          <tr>
            <th style={{ ...TH, fontSize: "7px" }}></th>
            {cols.map(c => (
              <th key={c.key} style={{ ...TH, fontSize: "7px", width: c.w + "px" }}>{c.label}</th>
            ))}
          </tr>
          {/* Targets based on batch size */}
          <tr>
            <td style={{ ...TD, textAlign: "left", fontSize: "7px", fontStyle: "italic" }}>Tgt</td>
            {cols.map((c, i) => (
              <td key={c.key} style={{ ...TD, width: c.w + "px" }}>
                {c.isMoi ? "in %" : targetPerBatch[i] === 0 ? "0" : c.dec ? targetPerBatch[i].toFixed(c.dec) : targetPerBatch[i]}
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={cols.length + 1}
              style={{ fontSize: "7px", fontStyle: "italic", padding: "1px 2px", borderBottom: "1px solid #ccc" }}>
              Actual in Kgs.
            </td>
          </tr>
          {rows.map((row, bIdx) => (
            <tr key={bIdx} style={{ backgroundColor: bIdx % 2 === 0 ? "#fff" : "#f8f8f8" }}>
              <td style={{ ...TD, fontSize: "7px", textAlign: "center" }}>{bIdx + 1}</td>
              {cols.map(c => {
                const tgt = targetPerBatch[cols.indexOf(c)];
                const act = parseFloat(row[c.key + "_actual"] || 0);
                return (
                  <td key={c.key} style={{ ...TD, width: c.w + "px", color: tgt > 0 && Math.abs(act - tgt) / tgt > 0.05 ? "red" : "black" }}>
                    <input
                      className="no-print"
                      type="number" step="0.001"
                      value={row[c.key + "_actual"] ?? 0}
                      onChange={e => onActualChange(bIdx, c.key, e.target.value)}
                      style={{ width: "100%", border: "none", textAlign: "right", fontSize: "7.5px", padding: 0, background: "transparent", outline: "none" }}
                    />
                    <span className="print-only" style={{ display: "none" }}>
                      {c.dec ? act.toFixed(c.dec) : act.toFixed(0)}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}

          {/* Total Set Weight */}
          <tr>
            <td colSpan={cols.length + 1}
              style={{ fontSize: "7px", fontStyle: "italic", padding: "1px 2px", borderTop: "1px solid #000" }}>
              Total Set Weight in Kgs.
            </td>
          </tr>
          <tr style={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}>
            <td style={{ ...TD }}></td>
            {setTotals.map((v, i) => (
              <td key={i} style={{ ...TD, fontWeight: "bold", width: cols[i].w + "px" }}>
                {v === 0 ? "0" : cols[i].dec ? v.toFixed(cols[i].dec) : Math.round(v)}
              </td>
            ))}
          </tr>

          {/* Total Actual */}
          <tr>
            <td colSpan={cols.length + 1}
              style={{ fontSize: "7px", fontStyle: "italic", padding: "1px 2px", borderTop: "1px solid #ccc" }}>
              Total Actual in Kgs.
            </td>
          </tr>
          <tr style={{ fontWeight: "bold", backgroundColor: "#e8f0fe" }}>
            <td style={{ ...TD }}></td>
            {actTotals.map((v, i) => (
              <td key={i} style={{ ...TD, fontWeight: "bold", width: cols[i].w + "px" }}>
                {v === 0 ? "0" : cols[i].dec ? v.toFixed(cols[i].dec) : Math.round(v)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────
function InfoL({ label, value }) {
  return (
    <div style={{ fontSize: "8px", marginBottom: "1px", display: "flex" }}>
      <span style={{ fontWeight: "bold", minWidth: "90px" }}>{label}</span>
      <span> : {value || "—"}</span>
    </div>
  );
}
function InfoR({ label, value, bold }) {
  return (
    <div style={{ fontSize: "8px", marginBottom: "1px", display: "flex", justifyContent: "space-between" }}>
      <span>{label}</span>
      <span style={{ fontWeight: bold ? "bold" : "normal" }}>: {value} M³</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BatchReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = usePrintData();
  const printRef = useRef();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [actuals, setActuals] = useState(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: data ? `BatchReport_${data.batch_number}_${data.plant_type}` : "Batch_Report",
  });

  if (isLoading) return <div className="p-8 text-gray-400">Loading…</div>;
  if (error)     return <div className="p-8 text-red-500">Failed to load delivery data.</div>;
  if (!data.plant_type || data.plant_type === "None")
    return <div className="p-8 text-gray-500">No batch report for this delivery.</div>;

  const cols = COLS[data.plant_type] || M125_COLS;
  const { numBatches, batchSize } = calcBatches(parseFloat(data.quantity_m3), data.plant_type);
  const dm = data.design_mix;

  const getRows = () => {
    if (actuals) return actuals;
    return Array.from({ length: numBatches }, (_, i) => {
      const saved_row = (data.batch_actuals || []).find(r => r.batch_sequence === i + 1);
      const row = { batch_sequence: i + 1, batch_size_m3: batchSize };
      cols.forEach(c => {
        const tgt = parseFloat(dm?.[c.key] || 0) * batchSize;
        row[c.key + "_actual"] = saved_row ? parseFloat(saved_row[c.key + "_actual"] || 0) : tgt;
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

  return (
    <div>
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
          <button className="btn-primary flex items-center gap-1" onClick={handlePrint}>
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      <div ref={printRef}>
        <style>{`
          @media print {
            @page { size: A4 landscape; margin: 4mm; }
            body { margin: 0; }
            .no-print { display: none !important; }
            .print-only { display: inline !important; }
          }
          @media screen { .print-only { display: none !important; } }
        `}</style>
        {data.plant_type === "M1.25"
          ? <M125Print d={data} cols={cols} rows={rows} onActualChange={handleActualChange} />
          : <CP30Print  d={data} cols={cols} rows={rows} onActualChange={handleActualChange} />
        }
      </div>
    </div>
  );
}
