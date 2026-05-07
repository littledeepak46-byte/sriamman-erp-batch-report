import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Plus, Printer, Trash2, Scale } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import api from "../../api/axios";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";

const TABS = ["OUTWARD", "INWARD"];
const today = format(new Date(), "yyyy-MM-dd");
const nowTime = format(new Date(), "HH:mm");

// ── Shared Weighment Slip (identical format for INWARD and OUTWARD) ──────────
function WeighSlip({ rec }) {
  if (!rec) return null;

  const dt = rec.weigh_date ? new Date(rec.weigh_date + "T00:00:00") : null;
  const dateStr = dt
    ? `${String(dt.getDate()).padStart(2,"0")}-${String(dt.getMonth()+1).padStart(2,"0")}-${dt.getFullYear()}`
    : "—";

  const t = rec.weigh_time?.slice(0, 5) || "";
  const [h, m] = t.split(":");
  const hr = parseInt(h || 0);
  const timeStr = t ? `${String(hr % 12 || 12).padStart(2,"0")}:${m} ${hr >= 12 ? "PM" : "AM"}` : "—";

  const loadedWt = rec.gross_weight_kg ? Number(rec.gross_weight_kg).toLocaleString("en-IN") : "—";
  const tare     = rec.tare_weight_kg  ? Number(rec.tare_weight_kg).toLocaleString("en-IN")  : "—";
  const netWt    = rec.net_weight_kg   ? Number(rec.net_weight_kg).toLocaleString("en-IN")   : "—";

  const R = { fontFamily: "Arial, sans-serif" };
  const lbl = { ...R, fontSize: "10px", color: "#333", paddingBottom: "6px" };
  const val = { ...R, fontSize: "10px", fontWeight: "500", paddingBottom: "6px" };

  return (
    <div style={{ ...R, maxWidth: "175mm", margin: "0 auto", border: "1px solid #ccc" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "5mm 6mm 4mm", borderBottom: "2px solid #000" }}>
        <svg width="58" height="58" viewBox="0 0 60 60">
          <rect width="60" height="60" fill="white" />
          <polygon points="8,52 30,8 52,52 44,52 30,22 16,52" fill="#2d7a2d" />
          <polygon points="16,52 30,24 44,52 37,52 30,32 23,52" fill="white" />
        </svg>
        <div style={{ marginLeft: "8px" }}>
          <div style={{ ...R, fontSize: "16px", fontWeight: "bold" }}>SRI AMMAN CONSTRUCTION AND EQUIPMENTS</div>
          <div style={{ ...R, fontSize: "10px", marginTop: "2px" }}>CHINNAR ,SHOOLAGIRI</div>
          <div style={{ ...R, fontSize: "10px" }}>KRISHNAGIRI-635117</div>
        </div>
      </div>

      <div style={{ padding: "4mm 6mm" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={lbl}>Date:</td>
              <td style={val}>{dateStr}</td>
              <td style={{ width: "8px" }}></td>
              <td style={lbl}></td><td style={val}></td>
            </tr>
            <tr>
              <td style={lbl}>Time:</td>
              <td style={val}>{timeStr}</td>
              <td></td>
              <td style={lbl}></td><td style={val}></td>
            </tr>
            <tr>
              <td style={lbl}>Ticket Number:</td>
              <td style={{ ...val, fontFamily: "monospace" }}>{rec.ticket_number}</td>
              <td></td>
              <td style={lbl}>Material:</td>
              <td style={val}>{(rec.material_description || "—").toUpperCase()}</td>
            </tr>
            <tr>
              <td style={lbl}>Challan No:</td>
              <td style={{ ...val, fontSize: "9px", fontFamily: "monospace" }}>{rec.dc_number || "—"}</td>
              <td></td>
              <td style={lbl}>Supplier:</td>
              <td style={val}>{rec.supplier || "SRI AMMAN"}</td>
            </tr>
            <tr>
              <td style={lbl}>Vehicle Number:</td>
              <td style={{ ...val, fontWeight: "bold", fontSize: "11px" }}>{rec.vehicle_number?.toUpperCase() || "—"}</td>
              <td></td>
              <td style={lbl}>Driver:</td>
              <td style={{ ...val, textTransform: "uppercase" }}>{rec.driver_name || "—"}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ margin: "3mm 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ ...lbl, width: "38%", paddingBottom: "8px" }}>Loaded Weight:</td>
                <td style={{ paddingBottom: "8px" }}>
                  <strong style={{ ...R, fontSize: "13px" }}>{loadedWt}</strong>
                  <span style={{ ...R, fontSize: "10px", marginLeft: "8px" }}>kg</span>
                </td>
                <td style={{ width: "8px" }}></td>
                <td style={{ ...lbl, width: "28%" }}></td>
                <td></td>
              </tr>
              <tr>
                <td style={{ ...lbl, paddingBottom: "8px" }}>Empty Weight:</td>
                <td style={{ paddingBottom: "8px" }}>
                  <span style={{ ...R, fontSize: "11px" }}>{tare}</span>
                  <span style={{ ...R, fontSize: "10px", marginLeft: "8px" }}>kg</span>
                </td>
                <td></td>
                <td style={lbl}>Grade of material:</td>
                <td style={val}></td>
              </tr>
              <tr>
                <td style={{ ...lbl, paddingBottom: "8px" }}>
                  <strong style={{ fontSize: "11px" }}>Net Weight:</strong>
                </td>
                <td style={{ paddingBottom: "8px" }}>
                  <strong style={{ ...R, fontSize: "15px" }}>{netWt}</strong>
                  <span style={{ ...R, fontSize: "10px", marginLeft: "8px" }}>kg</span>
                </td>
                <td></td>
                <td style={lbl}>Operator&nbsp; Name:</td>
                <td style={{ ...val, textTransform: "uppercase" }}>ADMIN</td>
              </tr>
            </tbody>
          </table>
        </div>

        {rec.remarks && (
          <div style={{ ...R, fontSize: "9px", color: "#555", marginBottom: "3mm" }}>
            Remarks: {rec.remarks}
          </div>
        )}

        <table style={{ width: "100%", marginTop: "8mm" }}>
          <tbody>
            <tr>
              <td style={{ width: "40%", ...lbl }}>Client Signature</td>
              <td style={{ width: "20%" }}></td>
              <td style={{ width: "40%", ...lbl, textAlign: "right" }}>Operator Signature</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ borderTop: "1px solid #ccc" }}></div>
    </div>
  );
}

// keep alias for backward compat
function InwardSlip({ rec }) { return <WeighSlip rec={rec} />; }


// ── Outward Tab ───────────────────────────────────────────────────────────────
function OutwardTab() {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [applied, setApplied] = useState({ date_from: today, date_to: today });

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ["deliveries-weighment", applied],
    queryFn: () => api.get(`/deliveries?date_from=${applied.date_from}&date_to=${applied.date_to}&limit=200`).then(r => r.data),
  });

  const outward = deliveries.filter(d => d.generate_weighment === 1);

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-4">
        <div>
          <label className="label">Date From</label>
          <input className="input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">Date To</label>
          <input className="input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={() => setApplied({ date_from: dateFrom, date_to: dateTo })}>
          Load
        </button>
      </div>

      {isLoading ? <p className="text-gray-400">Loading…</p> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600">DC Number</th>
                <th className="text-left px-4 py-3 text-gray-600">Date</th>
                <th className="text-left px-4 py-3 text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 text-gray-600">Vehicle</th>
                <th className="text-right px-4 py-3 text-gray-600">Gross (kg)</th>
                <th className="text-right px-4 py-3 text-gray-600">Empty (kg)</th>
                <th className="text-right px-4 py-3 text-gray-600">Net (kg)</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {outward.map(d => (
                <tr key={d.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-primary font-semibold">{d.dc_number}</td>
                  <td className="px-4 py-2 text-gray-500">{d.delivery_date}</td>
                  <td className="px-4 py-2">{d.customer_name}</td>
                  <td className="px-4 py-2 font-mono text-xs">{d.vehicle_number}</td>
                  <td className="px-4 py-2 text-right">{d.gross_weight_kg ? Number(d.gross_weight_kg).toLocaleString() : "—"}</td>
                  <td className="px-4 py-2 text-right text-gray-500">{d.empty_weight_kg ? Number(d.empty_weight_kg).toLocaleString() : "—"}</td>
                  <td className="px-4 py-2 text-right font-semibold text-green-700">
                    {d.net_weight_kg ? Number(d.net_weight_kg).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <button className="text-gray-400 hover:text-primary" title="Print Weighment Slip"
                      onClick={() => navigate(`/delivery/${d.id}/weighment`)}>
                      <Printer size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {!outward.length && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No outward weighments for selected dates.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Inward Tab ────────────────────────────────────────────────────────────────
function InwardTab() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [printRec, setPrintRec] = useState(null);
  const [error, setError] = useState("");
  const printRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printRec ? `Weighment_${printRec.ticket_number}` : "Weighment",
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["weighments-inward"],
    queryFn: () => api.get("/weighments?type=INWARD").then(r => r.data),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => api.get("/vehicles").then(r => r.data),
  });

  const create = useMutation({
    mutationFn: d => api.post("/weighments", d),
    onSuccess: () => { qc.invalidateQueries(["weighments-inward"]); setModal(false); setError(""); },
    onError: e => setError(e.response?.data?.detail || "Error saving weighment."),
  });

  const del = useMutation({
    mutationFn: id => api.delete(`/weighments/${id}`),
    onSuccess: () => { qc.invalidateQueries(["weighments-inward"]); setConfirm(null); },
  });

  function handleSubmit(e) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    setError("");
    create.mutate({
      type: "INWARD",
      vehicle_number: fd.vehicle_number,
      driver_name: fd.driver_name,
      material_description: fd.material_description,
      supplier: fd.supplier,
      gross_weight_kg: parseFloat(fd.gross_weight_kg),
      tare_weight_kg: parseFloat(fd.tare_weight_kg),
      weigh_date: fd.weigh_date,
      weigh_time: fd.weigh_time + ":00",
      remarks: fd.remarks || null,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary flex items-center gap-1" onClick={() => { setError(""); setModal(true); }}>
          <Plus size={15} /> New Inward Entry
        </button>
      </div>

      {isLoading ? <p className="text-gray-400">Loading…</p> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600">Ticket No</th>
                <th className="text-left px-4 py-3 text-gray-600">Date</th>
                <th className="text-left px-4 py-3 text-gray-600">Vehicle</th>
                <th className="text-left px-4 py-3 text-gray-600">Material</th>
                <th className="text-left px-4 py-3 text-gray-600">Supplier</th>
                <th className="text-right px-4 py-3 text-gray-600">Net Wt (kg)</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-primary font-semibold">{r.ticket_number}</td>
                  <td className="px-4 py-2 text-gray-500">{r.weigh_date}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.vehicle_number}</td>
                  <td className="px-4 py-2">{r.material_description || "—"}</td>
                  <td className="px-4 py-2 text-gray-500">{r.supplier || "—"}</td>
                  <td className="px-4 py-2 text-right font-semibold text-green-700">
                    {Number(r.net_weight_kg).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button className="text-gray-400 hover:text-primary" title="Print slip"
                        onClick={() => { setPrintRec(r); setTimeout(handlePrint, 100); }}>
                        <Printer size={14} />
                      </button>
                      <button className="text-gray-400 hover:text-red-500"
                        onClick={() => setConfirm({ id: r.id, name: r.ticket_number })}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!records.length && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No inward weighments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Hidden print area */}
      <div style={{ display: "none" }}>
        <div ref={printRef}>
          <style>{`@media print { @page { size: A5 portrait; margin: 6mm; } }`}</style>
          <InwardSlip rec={printRec} />
        </div>
      </div>

      {/* Add Inward Modal */}
      {modal && (
        <Modal title="New Inward Weighment" onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Vehicle Number *</label>
                <input className="input" name="vehicle_number" list="veh-list"
                  placeholder="Type or select…" required />
                <datalist id="veh-list">
                  {vehicles.map(v => <option key={v.id} value={v.vehicle_number} />)}
                </datalist>
              </div>
              <div><label className="label">Driver Name</label>
                <input className="input" name="driver_name" /></div>
            </div>
            <div><label className="label">Material Description *</label>
              <input className="input" name="material_description" placeholder="e.g. 20MM Aggregate, River Sand" required /></div>
            <div><label className="label">Supplier</label>
              <input className="input" name="supplier" placeholder="Supplier / quarry name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Date *</label>
                <input className="input" type="date" name="weigh_date" defaultValue={today} required /></div>
              <div><label className="label">Time *</label>
                <input className="input" type="time" name="weigh_time" defaultValue={nowTime} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Gross Weight (kg) *</label>
                <input className="input" type="number" step="0.01" min="1" name="gross_weight_kg" required /></div>
              <div><label className="label">Tare / Empty Weight (kg) *</label>
                <input className="input" type="number" step="0.01" min="1" name="tare_weight_kg" required /></div>
            </div>
            <div><label className="label">Remarks</label>
              <input className="input" name="remarks" /></div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={create.isPending}>Save & Get Ticket</button>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog message={`Delete ticket "${confirm.name}"?`}
          onCancel={() => setConfirm(null)}
          onConfirm={() => del.mutate(confirm.id)} />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Weighment() {
  const [tab, setTab] = useState("OUTWARD");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Scale size={20} className="text-primary" />
        <h1 className="text-xl font-bold text-primary">Weighment</h1>
      </div>

      <div className="flex gap-1 border-b">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors
              ${tab === t ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t}
            {t === "OUTWARD" && <span className="ml-2 text-xs text-gray-400">(Concrete leaving plant)</span>}
            {t === "INWARD" && <span className="ml-2 text-xs text-gray-400">(Raw materials arriving)</span>}
          </button>
        ))}
      </div>

      {tab === "OUTWARD" && <OutwardTab />}
      {tab === "INWARD" && <InwardTab />}
    </div>
  );
}
