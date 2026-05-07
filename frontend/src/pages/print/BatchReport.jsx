import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { useNavigate, useParams } from "react-router-dom";
import { Printer, ArrowLeft, Save } from "lucide-react";
import api from "../../api/axios";
import { usePrintData } from "../../hooks/usePrintData";

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_BATCH = { "M1.25": 1.25, "CP30": 0.50 };

function calcBatches(qty, plantType) {
  const max = MAX_BATCH[plantType] || 1.25;
  const n = Math.ceil(qty / max);
  const size = Math.round((qty / n) * 1000) / 1000;
  return { numBatches: n, batchSize: size };
}

// ── Ingredient column definitions per plant ───────────────────────────────────
// Each entry: { key, label, category }
const M125_COLS = [
  { key: "sand1",    label: "M.SAND",    cat: "Aggregate" },
  { key: "agg_20mm", label: "20MM",      cat: "Aggregate" },
  { key: "sand2",    label: "M.SAND 2",  cat: "Aggregate" },
  { key: "agg_12mm", label: "12MM",      cat: "Aggregate" },
  { key: "agg_6mm",  label: "6MM",       cat: "Aggregate" },
  { key: "agg6",     label: "Agg6",      cat: "Aggregate" },
  { key: "cem1",     label: "Cem1",      cat: "Cement" },
  { key: "cem2",     label: "Cem2",      cat: "Cement" },
  { key: "cem3",     label: "Cem3",      cat: "Cement" },
  { key: "cem4",     label: "Cem4",      cat: "Cement" },
  { key: "fly",      label: "Fly Ash",   cat: "Cement" },
  { key: "wtr1",     label: "Wtr1",      cat: "Water/Ice" },
  { key: "wtr2",     label: "Wtr2",      cat: "Water/Ice" },
  { key: "wtr3",     label: "Wtr3",      cat: "Water/Ice" },
  { key: "adx1",     label: "Admix1",    cat: "Admixture" },
  { key: "adx2",     label: "Admix2",    cat: "Admixture" },
  { key: "adx3",     label: "Admix3",    cat: "Admixture" },
  { key: "adx4",     label: "Admix4",    cat: "Admixture" },
  { key: "silica",   label: "Silica",    cat: "Silica" },
];

const CP30_COLS = [
  { key: "agg_20mm", label: "20MM",      cat: "Aggregate" },
  { key: "sand1",    label: "SAND",      cat: "Aggregate" },
  { key: "moisture", label: "Moi",       cat: "Aggregate" },
  { key: "agg_12mm", label: "10MM",      cat: "Aggregate" },
  { key: "cem1",     label: "CEM 1",     cat: "Cement" },
  { key: "cem2",     label: "CEM 2",     cat: "Cement" },
  { key: "filler",   label: "FILLER",    cat: "Cement" },
  { key: "wtr1",     label: "WATER",     cat: "Water" },
  { key: "adx1",     label: "ADMIX1",    cat: "Admixture" },
  { key: "adx2",     label: "ADMIX2",    cat: "Admixture" },
];

const COLS = { "M1.25": M125_COLS, "CP30": CP30_COLS };

// ── Cell styles ───────────────────────────────────────────────────────────────
const S = {
  base:    { border: "1px solid #ccc", padding: "2px 3px", fontSize: "8px", textAlign: "right", whiteSpace: "nowrap" },
  header:  { border: "1px solid #999", padding: "3px 3px", fontSize: "7.5px", textAlign: "center", fontWeight: "bold", backgroundColor: "#1e3a5f", color: "#fff" },
  catHead: { border: "1px solid #999", padding: "3px 3px", fontSize: "8px", textAlign: "center", fontWeight: "bold", backgroundColor: "#2d5f8a", color: "#fff" },
  label:   { border: "1px solid #ccc", padding: "2px 5px", fontSize: "8px", textAlign: "left", fontWeight: "bold", backgroundColor: "#f8fafc", whiteSpace: "nowrap" },
  target:  { border: "1px solid #ccc", padding: "2px 3px", fontSize: "8px", textAlign: "right", backgroundColor: "#eff6ff", color: "#1e3a5f" },
  actual:  { border: "1px solid #ccc", padding: "2px 3px", fontSize: "8px", textAlign: "right", backgroundColor: "#fff" },
  total:   { border: "1px solid #999", padding: "3px 3px", fontSize: "8px", textAlign: "right", fontWeight: "bold", backgroundColor: "#e8f0fe", color: "#1e3a5f" },
  diff:    { border: "1px solid #999", padding: "3px 3px", fontSize: "8px", textAlign: "right", fontWeight: "bold" },
};

function n(v, dec = 2) {
  const num = parseFloat(v || 0);
  return num === 0 ? "0" : num.toFixed(dec);
}
function nActual(v, dec = 2) {
  return parseFloat(v || 0).toFixed(dec);
}

// Group category headers
function buildCategorySpans(cols) {
  const groups = [];
  let cur = null;
  cols.forEach(c => {
    if (!cur || cur.cat !== c.cat) { cur = { cat: c.cat, span: 1 }; groups.push(cur); }
    else cur.span++;
  });
  return groups;
}

// ── Print Template ────────────────────────────────────────────────────────────
function BatchReportPrint({ d, cols, rows, onActualChange }) {
  if (!d) return null;

  const dm = d.design_mix;
  const { numBatches, batchSize } = calcBatches(parseFloat(d.quantity_m3), d.plant_type);
  const catSpans = buildCategorySpans(cols);

  const dateStr = d.delivery_date
    ? new Date(d.delivery_date + "T00:00:00").toLocaleDateString("en-IN",
        { day: "2-digit", month: "short", year: "numeric" })
    : "";
  const timeStr = d.delivery_time?.slice(0, 8) || "";

  // Totals
  const setTotals = cols.map(c => {
    const perM3 = parseFloat(dm?.[c.key] || 0);
    return Math.round(perM3 * batchSize * numBatches * 1000) / 1000;
  });
  const actualTotals = cols.map(c =>
    rows.reduce((s, r) => s + (parseFloat(r[c.key + "_actual"]) || 0), 0)
  );
  const massSetTotal = setTotals.reduce((a, b) => a + b, 0);
  const massActualTotal = actualTotals.reduce((a, b) => a + b, 0);

  function diffPct(set, actual) {
    if (set === 0) return "0";
    const p = ((actual - set) / set * 100);
    return (p === 0 ? "0.00" : p.toFixed(2));
  }

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "5mm", backgroundColor: "#fff" }}>

      {/* ── Company Header ───────────────────────────────────────────────── */}
      <div style={{ textAlign: "center", marginBottom: "6px" }}>
        <div style={{ fontSize: "14px", fontWeight: "bold", color: "#1e3a5f", letterSpacing: "0.5px" }}>
          SRI AMMAN READY MIX CONCRETE
        </div>
        <div style={{ fontSize: "9px", color: "#555" }}>
          198/1, Chennapalli Post, Chinnar, Krishnagiri, Tamil Nadu – 635117
        </div>
        <div style={{ fontSize: "10px", fontWeight: "bold", marginTop: "3px", letterSpacing: "1px", textTransform: "uppercase" }}>
          Docket / Batch Report / Autographic Record
        </div>
        <div style={{ borderBottom: "2px solid #1e3a5f", marginTop: "4px" }}></div>
      </div>

      {/* ── Batch Info Grid ──────────────────────────────────────────────── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6px", fontSize: "8.5px" }}>
        <tbody>
          <tr>
            <td style={{ width: "25%", verticalAlign: "top" }}>
              <InfoRow label="Batch Date" value={dateStr} />
              <InfoRow label="Batch Start Time" value={timeStr} />
              <InfoRow label="Batch End Time" value="—" />
            </td>
            <td style={{ width: "25%", verticalAlign: "top" }}>
              <InfoRow label="Batch Number / Docket No" value={`${d.batch_number || "—"}`} bold />
              <InfoRow label="Customer" value={d.customer_name} />
              <InfoRow label="Site" value={d.site_location || d.site_name} />
            </td>
            <td style={{ width: "25%", verticalAlign: "top" }}>
              <InfoRow label="Recipe Code" value={d.grade_name} />
              <InfoRow label="Recipe Name" value={d.grade_name} />
              <InfoRow label="Truck Number" value={d.vehicle_number} />
              <InfoRow label="Truck Driver" value={d.driver_name} />
              <InfoRow label="Batcher Name" value="Stetter" />
            </td>
            <td style={{ width: "25%", verticalAlign: "top" }}>
              <QtyRow label="Ordered Quantity" value={d.quantity_m3} />
              <QtyRow label="Production Quantity" value={batchSize * numBatches} />
              <QtyRow label="Adj/Manual Quantity" value="0.00" />
              <QtyRow label="With This Load" value={d.cumulative_qty_m3 ?? "0.00"} />
              <QtyRow label="Mixer Capacity" value={MAX_BATCH[d.plant_type]} />
              <QtyRow label="Batch Size" value={batchSize} bold />
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Ingredient Table ─────────────────────────────────────────────── */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>

          {/* Category row */}
          <thead>
            <tr>
              <th style={{ ...S.catHead, width: "70px", textAlign: "left" }}></th>
              {catSpans.map((g, i) => (
                <th key={i} colSpan={g.span} style={S.catHead}>{g.cat}</th>
              ))}
              <th style={{ ...S.catHead, width: "60px" }}>Total Wt (kg)</th>
            </tr>

            {/* Ingredient name row */}
            <tr>
              <th style={{ ...S.header, textAlign: "left", fontSize: "7px" }}>Row</th>
              {cols.map(c => (
                <th key={c.key} style={{ ...S.header, minWidth: "38px" }}>{c.label}</th>
              ))}
              <th style={S.header}>Mass (kg)</th>
            </tr>

            {/* Targets row (per batch size) */}
            <tr>
              <td style={{ ...S.label, fontSize: "7px", color: "#1e3a5f" }}>Target / batch</td>
              {cols.map(c => {
                const v = parseFloat(dm?.[c.key] || 0) * batchSize;
                return <td key={c.key} style={S.target}>{v === 0 ? "0" : v.toFixed(c.key.startsWith("adx") ? 3 : 0)}</td>;
              })}
              <td style={{ ...S.target, fontWeight: "bold" }}>
                {cols.reduce((s, c) => s + parseFloat(dm?.[c.key] || 0) * batchSize, 0).toFixed(2)}
              </td>
            </tr>
          </thead>

          {/* Actual rows per batch */}
          <tbody>
            <tr>
              <td colSpan={cols.length + 2}
                style={{ fontSize: "7px", color: "#555", padding: "2px 4px", fontStyle: "italic", borderBottom: "1px solid #ddd" }}>
                Actual in Kgs.
              </td>
            </tr>
            {rows.map((row, bIdx) => {
              const rowMass = cols.reduce((s, c) => s + (parseFloat(row[c.key + "_actual"]) || 0), 0);
              return (
                <tr key={bIdx} style={{ backgroundColor: bIdx % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ ...S.label, fontSize: "7px", color: "#555" }}>Batch {bIdx + 1}</td>
                  {cols.map(c => {
                    const tgt = parseFloat(dm?.[c.key] || 0) * batchSize;
                    const act = parseFloat(row[c.key + "_actual"] || 0);
                    const isAdx = c.key.startsWith("adx");
                    return (
                      <td key={c.key} style={{
                        ...S.actual,
                        color: tgt > 0 && Math.abs(act - tgt) / tgt > 0.05 ? "#c53030" : "#222",
                      }}>
                        <input
                          className="no-print"
                          type="number" step="0.001" min="0"
                          value={row[c.key + "_actual"] ?? tgt}
                          onChange={e => onActualChange(bIdx, c.key, e.target.value)}
                          style={{ width: "100%", border: "none", textAlign: "right", fontSize: "7.5px",
                            padding: "0 1px", background: "transparent", outline: "none" }}
                        />
                        <span className="print-only" style={{ display: "none", fontSize: "7.5px" }}>
                          {isAdx ? parseFloat(row[c.key + "_actual"] || 0).toFixed(3)
                                 : parseFloat(row[c.key + "_actual"] || 0).toFixed(0)}
                        </span>
                      </td>
                    );
                  })}
                  <td style={S.actual}>{rowMass.toFixed(2)}</td>
                </tr>
              );
            })}

            {/* Total Set Weight */}
            <tr>
              <td style={{ ...S.label, color: "#1e3a5f" }}>Total Set Wt (kg)</td>
              {cols.map((c, i) => (
                <td key={c.key} style={S.total}>{setTotals[i].toFixed(c.key.startsWith("adx") ? 2 : 0)}</td>
              ))}
              <td style={{ ...S.total, fontSize: "9px" }}>{massSetTotal.toFixed(2)}</td>
            </tr>

            {/* Total Actual Weight */}
            <tr>
              <td style={{ ...S.label, color: "#c45c00" }}>Total Actual Wt (kg)</td>
              {cols.map((c, i) => (
                <td key={c.key} style={{ ...S.total, backgroundColor: "#fff7ed", color: "#c45c00" }}>
                  {actualTotals[i].toFixed(c.key.startsWith("adx") ? 2 : 0)}
                </td>
              ))}
              <td style={{ ...S.total, backgroundColor: "#fff7ed", color: "#c45c00", fontSize: "9px" }}>
                {massActualTotal.toFixed(2)}
              </td>
            </tr>

            {/* Difference % */}
            <tr>
              <td style={S.label}>Difference %</td>
              {cols.map((c, i) => {
                const p = parseFloat(diffPct(setTotals[i], actualTotals[i]));
                return (
                  <td key={c.key} style={{ ...S.diff,
                    color: Math.abs(p) > 2 ? "#c53030" : "#276749",
                    backgroundColor: Math.abs(p) > 2 ? "#fff5f5" : "#f0fff4"
                  }}>
                    {diffPct(setTotals[i], actualTotals[i])}
                  </td>
                );
              })}
              <td style={{ ...S.diff,
                color: Math.abs((massActualTotal - massSetTotal) / (massSetTotal || 1) * 100) > 2 ? "#c53030" : "#276749",
              }}>
                {diffPct(massSetTotal, massActualTotal)}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <table style={{ width: "100%", marginTop: "8px", fontSize: "8px", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ width: "20%" }}><InfoRow label="Mixer Capacity" value={`${MAX_BATCH[d.plant_type]} m³`} /></td>
            <td style={{ width: "20%" }}><InfoRow label="No. of Batches" value={numBatches} /></td>
            <td style={{ width: "20%" }}><InfoRow label="Total Qty" value={`${d.quantity_m3} m³`} /></td>
            <td style={{ width: "20%" }}><InfoRow label="DC Number" value={d.dc_number} /></td>
            <td style={{ width: "20%", textAlign: "right" }}>
              <div style={{ borderTop: "1px solid #000", paddingTop: "3px", marginTop: "18px", fontSize: "7.5px", color: "#555" }}>
                Batch Controller Signature
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: "4px", fontSize: "7px", color: "#aaa", textAlign: "right" }}>
        SRI AMMAN RMC — MCI Control System | Print Date: {new Date().toLocaleString("en-IN")}
      </div>
    </div>
  );
}

function InfoRow({ label, value, bold }) {
  return (
    <div style={{ display: "flex", marginBottom: "2px", fontSize: "8.5px" }}>
      <span style={{ color: "#555", minWidth: "120px" }}>{label}</span>
      <span style={{ marginLeft: "4px", fontWeight: bold ? "bold" : "500" }}>: {value ?? "—"}</span>
    </div>
  );
}
function QtyRow({ label, value, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px", fontSize: "8.5px" }}>
      <span style={{ color: "#555" }}>{label}</span>
      <span style={{ fontWeight: bold ? "bold" : "normal", marginLeft: "8px" }}>
        : {parseFloat(value || 0).toFixed(2)} M³
      </span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
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
  if (error) return <div className="p-8 text-red-500">Failed to load delivery data.</div>;
  if (!data.plant_type || data.plant_type === "None") {
    return <div className="p-8 text-gray-500">No batch report — this delivery has no plant type selected.</div>;
  }

  const cols = COLS[data.plant_type] || M125_COLS;
  const { numBatches, batchSize } = calcBatches(parseFloat(data.quantity_m3), data.plant_type);
  const dm = data.design_mix;

  // initialise actuals
  const getRows = () => {
    if (actuals) return actuals;
    return Array.from({ length: numBatches }, (_, i) => {
      const saved_row = (data.batch_actuals || []).find(r => r.batch_sequence === i + 1);
      const row = { batch_sequence: i + 1, batch_size_m3: batchSize };
      cols.forEach(c => {
        const tgt = parseFloat(dm?.[c.key] || 0) * batchSize;
        row[c.key + "_actual"] = saved_row
          ? parseFloat(saved_row[c.key + "_actual"] || 0)
          : tgt;
      });
      return row;
    });
  };

  const rows = getRows();

  function handleActualChange(bIdx, key, value) {
    setActuals(prev => {
      const r = prev || rows;
      return r.map((row, i) => i === bIdx ? { ...row, [key + "_actual"]: parseFloat(value) || 0 } : row);
    });
    setSaved(false);
  }

  async function saveActuals() {
    setSaving(true);
    try {
      await api.post(`/deliveries/${id}/batch-actuals`, { rows });
      setSaved(true);
    } finally {
      setSaving(false);
    }
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
          <button className="btn-primary flex items-center gap-1" onClick={handlePrint}>
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      {/* Print area */}
      <div ref={printRef} style={{ backgroundColor: "#fff" }}>
        <style>{`
          @media print {
            @page { size: A4 landscape; margin: 5mm; }
            body { margin: 0; }
            .no-print { display: none !important; }
            .print-only { display: inline !important; }
          }
          @media screen { .print-only { display: none !important; } }
        `}</style>
        <BatchReportPrint
          d={data}
          cols={cols}
          rows={rows}
          onActualChange={handleActualChange}
        />
      </div>
    </div>
  );
}
