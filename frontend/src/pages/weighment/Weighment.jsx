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

// ── Inward Weighment Slip print component ─────────────────────────────────────
function InwardSlip({ rec }) {
  if (!rec) return null;
  const dateStr = rec.weigh_date
    ? new Date(rec.weigh_date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "";
  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "10mm", maxWidth: "140mm" }}>
      <div style={{ textAlign: "center", borderBottom: "2px solid #1e3a5f", paddingBottom: "8px", marginBottom: "10px" }}>
        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#1e3a5f" }}>SRI AMMAN CONSTRUCTION AND EQUIPMENTS</div>
        <div style={{ fontSize: "9px", color: "#555" }}>Chinnar, Shoolagiri, Krishnagiri – 635117</div>
        <div style={{ fontSize: "11px", fontWeight: "bold", marginTop: "4px", letterSpacing: "2px" }}>
          WEIGHMENT SLIP — {rec.type}
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
        <tbody>
          {[
            ["Ticket No", rec.ticket_number],
            ["Date", dateStr],
            ["Time", rec.weigh_time?.slice(0, 5)],
            ["Vehicle No", rec.vehicle_number],
            ["Driver", rec.driver_name || "—"],
            ["Material", rec.material_description || "—"],
            ["Supplier", rec.supplier || "—"],
          ].map(([l, v]) => (
            <tr key={l}>
              <td style={{ padding: "4px 8px", color: "#555", width: "40%", borderBottom: "1px solid #eee" }}>{l}</td>
              <td style={{ padding: "4px 8px", fontWeight: "500", borderBottom: "1px solid #eee" }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ border: "1px solid #1e3a5f", borderRadius: "3px", margin: "10px 0", overflow: "hidden" }}>
        <div style={{ background: "#1e3a5f", color: "#fff", padding: "4px 8px", fontSize: "9px", fontWeight: "bold" }}>
          WEIGHT DETAILS
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
          <tbody>
            {[
              ["Gross Weight", `${Number(rec.gross_weight_kg).toLocaleString()} kg`],
              ["Tare Weight", `${Number(rec.tare_weight_kg).toLocaleString()} kg`],
            ].map(([l, v]) => (
              <tr key={l}>
                <td style={{ padding: "5px 8px", color: "#555", width: "50%", borderBottom: "1px solid #eee" }}>{l}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", borderBottom: "1px solid #eee" }}>{v}</td>
              </tr>
            ))}
            <tr style={{ background: "#f0f4f8" }}>
              <td style={{ padding: "7px 8px", fontWeight: "bold", color: "#1e3a5f", fontSize: "11px" }}>Net Weight</td>
              <td style={{ padding: "7px 8px", fontWeight: "bold", color: "#1e3a5f", fontSize: "14px", textAlign: "right" }}>
                {Number(rec.net_weight_kg).toLocaleString()} kg
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {rec.remarks && <p style={{ fontSize: "9px", color: "#555", marginTop: "6px" }}>Remarks: {rec.remarks}</p>}
      <table style={{ width: "100%", marginTop: "20px" }}>
        <tbody>
          <tr>
            <td style={{ width: "50%", textAlign: "center" }}>
              <div style={{ borderTop: "1px solid #000", marginTop: "24px", paddingTop: "3px", fontSize: "8px", color: "#555" }}>
                Driver Signature
              </div>
            </td>
            <td style={{ width: "50%", textAlign: "center" }}>
              <div style={{ borderTop: "1px solid #000", marginTop: "24px", paddingTop: "3px", fontSize: "8px", color: "#555" }}>
                Weigh Bridge Operator
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

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
