import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { useNavigate } from "react-router-dom";
import { Printer, ArrowLeft, Save } from "lucide-react";
import api from "../../api/axios";
import { usePrintData } from "../../hooks/usePrintData";
import { useParams } from "react-router-dom";

const MAX_BATCH = { "M1.25": 1.25, "CP30": 0.50 };

// Ingredients shown per plant type
// Common ingredients used in both plants
const COMMON = [
  { key: "sand1",    label: "Sand 1" },
  { key: "sand2",    label: "Sand 2" },
  { key: "agg_20mm", label: "20 MM" },
  { key: "agg_12mm", label: "12 MM" },
  { key: "cem1",     label: "Cement 1" },
  { key: "cem2",     label: "Cement 2" },
  { key: "fly",      label: "Fly Ash" },
  { key: "wtr1",     label: "Water 1" },
  { key: "adx1",     label: "Admix 1" },
  { key: "adx2",     label: "Admix 2" },
];
const M125_EXTRA = [
  { key: "agg_6mm", label: "6 MM" },
  { key: "agg6",    label: "Agg" },
  { key: "cem3",    label: "Cement 3" },
  { key: "cem4",    label: "Cement 4" },
  { key: "wtr2",    label: "Water 2" },
  { key: "wtr3",    label: "Water 3" },
  { key: "adx3",    label: "Admix 3" },
  { key: "adx4",    label: "Admix 4" },
  { key: "silica",  label: "Silica" },
];
const CP30_EXTRA = [
  { key: "moisture", label: "Moisture" },
  { key: "filler",   label: "Filler" },
  { key: "col1",     label: "1" },
  { key: "col2",     label: "2" },
  { key: "col3",     label: "3" },
];

const INGREDIENTS = {
  "M1.25": [...COMMON, ...M125_EXTRA],
  "CP30":  [...COMMON, ...CP30_EXTRA],
};

function calcBatches(qty, plantType) {
  const max = MAX_BATCH[plantType] || 1.25;
  const numBatches = Math.ceil(qty / max);
  const batchSize = qty / numBatches;
  return { numBatches, batchSize: Math.round(batchSize * 1000) / 1000 };
}

function targetForIngredient(dm, key, batchSize) {
  if (!dm) return 0;
  const perM3 = parseFloat(dm[key] || 0);
  return Math.round(perM3 * batchSize * 1000) / 1000;
}

function n(val) { return val != null ? Number(val).toFixed(3) : "0.000"; }

export default function BatchReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = usePrintData();
  const printRef = useRef();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // actuals state — one row per batch
  const [actuals, setActuals] = useState(null); // initialised after data loads

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: data ? `BatchReport_${data.batch_number}_${data.plant_type}` : "Batch_Report",
  });

  if (isLoading) return <div className="p-8 text-gray-400">Loading…</div>;
  if (error) return <div className="p-8 text-red-500">Failed to load delivery data.</div>;
  if (!data.plant_type || data.plant_type === "None") {
    return <div className="p-8 text-gray-500">No batch report — this delivery has no plant type selected.</div>;
  }

  const { numBatches, batchSize } = calcBatches(parseFloat(data.quantity_m3), data.plant_type);
  const ingredients = INGREDIENTS[data.plant_type] || INGREDIENTS["M1.25"];
  const dm = data.design_mix;

  // Initialise actuals from saved data or zeros
  const getActuals = () => {
    if (actuals) return actuals;
    const saved_rows = data.batch_actuals || [];
    return Array.from({ length: numBatches }, (_, i) => {
      const saved = saved_rows.find(r => r.batch_sequence === i + 1);
      const row = { batch_sequence: i + 1, batch_size_m3: batchSize };
      ingredients.forEach(ing => {
        row[ing.key + "_actual"] = saved ? parseFloat(saved[ing.key + "_actual"] || 0) : targetForIngredient(dm, ing.key, batchSize);
      });
      return row;
    });
  };

  const rows = getActuals();

  function updateActual(batchIdx, key, value) {
    const updated = rows.map((r, i) => i === batchIdx ? { ...r, [key + "_actual"]: parseFloat(value) || 0 } : r);
    setActuals(updated);
    setSaved(false);
  }

  async function saveActuals() {
    setSaving(true);
    try {
      await api.post(`/deliveries/${id}/batch-actuals`, { rows: rows.map(r => ({ ...r })) });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const dateStr = data.delivery_date ? new Date(data.delivery_date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

  // Column totals
  const setTotals = ingredients.map(ing => rows.reduce((s, _) => s + targetForIngredient(dm, ing.key, batchSize), 0));
  const actualTotals = ingredients.map(ing => rows.reduce((s, r) => s + (parseFloat(r[ing.key + "_actual"]) || 0), 0));
  const totalSetWeight = setTotals.reduce((a, b) => a + b, 0);
  const totalActualWeight = actualTotals.reduce((a, b) => a + b, 0);
  const diffPct = totalSetWeight > 0 ? ((totalActualWeight - totalSetWeight) / totalSetWeight * 100).toFixed(2) : "0.00";

  const S = { border: "1px solid #000", padding: "2px 4px", fontSize: "8px", textAlign: "right" };
  const SH = { ...S, backgroundColor: "#1e3a5f", color: "#fff", textAlign: "center", fontWeight: "bold" };
  const SL = { ...S, backgroundColor: "#f0f4f8", fontWeight: "bold", textAlign: "left" };

  return (
    <div>
      {/* Toolbar */}
      <div className="no-print flex items-center gap-3 p-4 bg-white border-b sticky top-0 z-10">
        <button className="btn-secondary flex items-center gap-1" onClick={() => navigate(-1)}><ArrowLeft size={15} /> Back</button>
        <span className="text-sm font-semibold text-primary">Batch Report — {data.plant_type} | Batch #{data.batch_number}</span>
        <div className="flex items-center gap-2 ml-auto">
          <button className="btn-secondary flex items-center gap-1" onClick={saveActuals} disabled={saving}>
            <Save size={14} /> {saving ? "Saving…" : saved ? "Saved ✓" : "Save Actuals"}
          </button>
          <button className="btn-primary flex items-center gap-1" onClick={handlePrint}><Printer size={15} /> Print</button>
        </div>
      </div>

      <div ref={printRef} style={{ padding: "8mm", backgroundColor: "#fff", maxWidth: "297mm", margin: "0 auto", overflowX: "auto" }}>
        <style>{`
          @media print {
            @page { size: A4 landscape; margin: 6mm; }
            body { margin: 0; font-size: 8px; }
          }
        `}</style>

        {/* Company header */}
        <div style={{ textAlign: "center", marginBottom: "6px", fontFamily: "Arial, sans-serif" }}>
          <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1e3a5f" }}>SRI AMMAN READY MIX CONCRETE</div>
          <div style={{ fontSize: "9px", color: "#555" }}>198/1, Chennapalli Post, Chinnar, Krishnagiri, Tamil Nadu – 635117</div>
          <div style={{ fontSize: "10px", fontWeight: "bold", marginTop: "3px" }}>BATCH REPORT — {data.plant_type} PLANT</div>
        </div>

        {/* Batch header info */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6px", fontSize: "9px", fontFamily: "Arial, sans-serif" }}>
          <tbody>
            <tr>
              <td style={{ width: "14%", paddingRight: "6px" }}>
                <InfoRow label="Batch Date" value={dateStr} />
                <InfoRow label="Batch No" value={data.batch_number} />
              </td>
              <td style={{ width: "14%", paddingRight: "6px" }}>
                <InfoRow label="DC Number" value={data.dc_number} mono />
                <InfoRow label="Plant" value={data.plant_type} />
              </td>
              <td style={{ width: "14%", paddingRight: "6px" }}>
                <InfoRow label="Grade" value={data.grade_name} />
                <InfoRow label="Pumping" value={data.pumping_name || "—"} />
              </td>
              <td style={{ width: "14%", paddingRight: "6px" }}>
                <InfoRow label="Customer" value={data.customer_name} />
                <InfoRow label="Site Location" value={data.site_location} />
              </td>
              <td style={{ width: "14%", paddingRight: "6px" }}>
                <InfoRow label="Ordered Qty" value={`${data.quantity_m3} m³`} />
                <InfoRow label="No. of Batches" value={numBatches} />
              </td>
              <td style={{ width: "14%", paddingRight: "6px" }}>
                <InfoRow label="Batch Size" value={`${batchSize} m³`} />
                <InfoRow label="Max Batch" value={`${MAX_BATCH[data.plant_type]} m³`} />
              </td>
              <td style={{ width: "16%" }}>
                <InfoRow label="Total Density" value={dm ? `${parseFloat(dm.total_density).toFixed(1)} kg/m³` : "—"} />
                <InfoRow label="Time" value={data.delivery_time?.slice(0, 5)} />
              </td>
            </tr>
          </tbody>
        </table>

        {/* Main batch table — ingredient rows, batch columns */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontSize: "8px", fontFamily: "Arial, sans-serif", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ ...SH, width: "70px", textAlign: "left" }}>Ingredient</th>
                <th style={{ ...SH, width: "55px" }}>Design Mix<br />(kg/m³)</th>
                {Array.from({ length: numBatches }, (_, i) => (
                  <th key={i} style={{ ...SH, minWidth: "70px" }} colSpan={2}>
                    Batch {i + 1}<br />({batchSize} m³)
                  </th>
                ))}
                <th style={{ ...SH, minWidth: "65px" }} colSpan={2}>Totals</th>
              </tr>
              <tr>
                <th style={SH}></th>
                <th style={SH}></th>
                {Array.from({ length: numBatches }, (_, i) => (
                  <>
                    <th key={`t${i}`} style={{ ...SH, backgroundColor: "#2d5f8a" }}>Target</th>
                    <th key={`a${i}`} style={{ ...SH, backgroundColor: "#c45c00" }}>Actual</th>
                  </>
                ))}
                <th style={{ ...SH, backgroundColor: "#2d5f8a" }}>Set Wt</th>
                <th style={{ ...SH, backgroundColor: "#c45c00" }}>Actual</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ing, iIdx) => (
                <tr key={ing.key} style={{ backgroundColor: iIdx % 2 === 0 ? "#fff" : "#f9fafb" }}>
                  <td style={{ ...S, textAlign: "left", fontWeight: "500" }}>{ing.label}</td>
                  <td style={S}>{dm ? n(dm[ing.key]) : "—"}</td>
                  {rows.map((row, bIdx) => {
                    const target = targetForIngredient(dm, ing.key, batchSize);
                    return (
                      <>
                        <td key={`t${bIdx}`} style={{ ...S, color: "#1e3a5f" }}>{n(target)}</td>
                        <td key={`a${bIdx}`} style={{ ...S, padding: "1px" }}>
                          <input
                            type="number" step="0.001" min="0"
                            className="no-print"
                            value={row[ing.key + "_actual"] ?? target}
                            onChange={e => updateActual(bIdx, ing.key, e.target.value)}
                            style={{ width: "100%", border: "none", textAlign: "right", fontSize: "8px", padding: "1px 2px", background: "transparent" }}
                          />
                          <span className="print-only" style={{ display: "none" }}>
                            {n(row[ing.key + "_actual"] ?? target)}
                          </span>
                        </td>
                      </>
                    );
                  })}
                  <td style={{ ...S, color: "#1e3a5f", fontWeight: "bold" }}>{n(setTotals[iIdx])}</td>
                  <td style={{ ...S, color: "#c45c00", fontWeight: "bold" }}>{n(actualTotals[iIdx])}</td>
                </tr>
              ))}

              {/* Totals row */}
              <tr style={{ backgroundColor: "#e8f0fe", fontWeight: "bold" }}>
                <td style={{ ...SL }} colSpan={2}>Total Weight (kg)</td>
                {Array.from({ length: numBatches }, (_, i) => {
                  const setW = ingredients.reduce((s, ing) => s + targetForIngredient(dm, ing.key, batchSize), 0);
                  const actW = ingredients.reduce((s, ing) => s + (parseFloat(rows[i]?.[ing.key + "_actual"]) || 0), 0);
                  return (
                    <>
                      <td key={`ts${i}`} style={{ ...S, fontWeight: "bold", color: "#1e3a5f" }}>{setW.toFixed(3)}</td>
                      <td key={`as${i}`} style={{ ...S, fontWeight: "bold", color: "#c45c00" }}>{actW.toFixed(3)}</td>
                    </>
                  );
                })}
                <td style={{ ...S, color: "#1e3a5f", fontWeight: "bold" }}>{totalSetWeight.toFixed(3)}</td>
                <td style={{ ...S, color: "#c45c00", fontWeight: "bold" }}>{totalActualWeight.toFixed(3)}</td>
              </tr>

              {/* Diff % row */}
              <tr style={{ backgroundColor: parseFloat(diffPct) > 2 || parseFloat(diffPct) < -2 ? "#fff3cd" : "#f0fff4" }}>
                <td style={{ ...SL }} colSpan={2 + numBatches * 2 + 1}>Difference %</td>
                <td style={{ ...S, fontWeight: "bold", color: parseFloat(diffPct) > 2 ? "#c53030" : "#276749" }}>
                  {diffPct}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <table style={{ width: "100%", marginTop: "8px", borderCollapse: "collapse", fontSize: "9px", fontFamily: "Arial, sans-serif" }}>
          <tbody>
            <tr>
              <td style={{ width: "25%", paddingRight: "8px" }}>
                <InfoRow label="Mixer Capacity" value={`${MAX_BATCH[data.plant_type]} m³`} />
              </td>
              <td style={{ width: "25%", paddingRight: "8px" }}>
                <InfoRow label="No. of Batches" value={numBatches} />
              </td>
              <td style={{ width: "25%", paddingRight: "8px" }}>
                <InfoRow label="Total Qty" value={`${data.quantity_m3} m³`} />
              </td>
              <td style={{ width: "25%", textAlign: "right" }}>
                <div style={{ borderTop: "1px solid #000", paddingTop: "4px", marginTop: "16px", fontSize: "8px" }}>Batch Controller Signature</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div style={{ marginBottom: "3px" }}>
      <span style={{ fontSize: "7px", color: "#888", textTransform: "uppercase" }}>{label}: </span>
      <span style={{ fontWeight: "bold", fontFamily: mono ? "monospace" : "inherit", fontSize: "8px" }}>{value ?? "—"}</span>
    </div>
  );
}
