import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Plus, Printer, Trash2, Scale } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import api from "../../api/axios";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import { WeighSlipTemplate } from "../print/WeighmentSlip";

const today   = format(new Date(), "yyyy-MM-dd");
const nowTime = format(new Date(), "HH:mm");

// Convert a weighment record to the WeighSlipTemplate data shape
function toSlipData(rec) {
  return {
    ...rec,
    delivery_date:   rec.weigh_date,
    delivery_time:   rec.weigh_time,
    ticket_number:   rec.ticket_number,
    dc_number:       rec.dc_number || "",
    vehicle_number:  rec.vehicle_number,
    driver_name:     rec.driver_name,
    material_name:   rec.material_description || "MATERIAL",
    grade_name:      "",
    supplier:        rec.supplier || "SRI AMMAN",
    gross_weight_kg: rec.gross_weight_kg,
    empty_weight_kg: rec.tare_weight_kg,
    net_weight_kg:   rec.net_weight_kg,
    operator_name:   "ADMIN",
    id:              rec.id,
  };
}

// ── Shared weighment entry form (INWARD + OUTWARD) ────────────────────────────
function WeighmentForm({ type, vehicles, onCreate, error, saving, onClose }) {
  const [vehicleNo, setVehicleNo] = useState("");
  const [driverName, setDriverName] = useState("");
  const [grossWt, setGrossWt] = useState("");
  const [tare, setTare]       = useState("");
  const netWt = grossWt && tare ? (parseFloat(grossWt) - parseFloat(tare)).toFixed(2) : "";

  // Auto-fill driver from vehicle master when vehicle is selected
  function handleVehicleChange(val) {
    setVehicleNo(val);
    const found = vehicles.find(v => v.vehicle_number === val);
    if (found?.default_driver_name) setDriverName(found.default_driver_name);
    // Auto-fill tare from empty weight
    if (found?.empty_weight_kg) setTare(String(found.empty_weight_kg));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    onCreate({
      type,
      vehicle_number:       vehicleNo,
      driver_name:          driverName || null,
      material_description: fd.material_description || null,
      supplier:             fd.supplier || null,
      gross_weight_kg:      parseFloat(grossWt),
      tare_weight_kg:       parseFloat(tare),
      weigh_date:           fd.weigh_date,
      weigh_time:           fd.weigh_time + ":00",
      remarks:              fd.remarks || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Vehicle + Driver — the key auto-fill row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Vehicle Number *</label>
          <input
            className="input font-mono uppercase"
            name="vehicle_number"
            list="veh-list-form"
            placeholder="Type or select…"
            value={vehicleNo}
            onChange={e => handleVehicleChange(e.target.value)}
            required
          />
          <datalist id="veh-list-form">
            {vehicles.map(v => <option key={v.id} value={v.vehicle_number} />)}
          </datalist>
        </div>
        <div>
          <label className="label">Driver Name
            <span className="text-xs text-gray-400 ml-1 font-normal">(auto-fills, editable)</span>
          </label>
          <input
            className="input"
            name="driver_name"
            placeholder="Driver name"
            value={driverName}
            onChange={e => setDriverName(e.target.value)}
          />
        </div>
      </div>

      {/* Material + Supplier */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Material Description
            {type === "INWARD" && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            className="input"
            name="material_description"
            placeholder={type === "INWARD" ? "e.g. 20MM Aggregate, River Sand" : "e.g. CONCRETE M25"}
            required={type === "INWARD"}
          />
        </div>
        <div>
          <label className="label">Supplier</label>
          <input
            className="input"
            name="supplier"
            defaultValue={type === "OUTWARD" ? "SRI AMMAN" : ""}
            placeholder="Supplier / quarry name"
          />
        </div>
      </div>

      {/* Date + Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Date *</label>
          <input className="input" type="date" name="weigh_date" defaultValue={today} required />
        </div>
        <div>
          <label className="label">Time *</label>
          <input className="input" type="time" name="weigh_time" defaultValue={nowTime} required />
        </div>
      </div>

      {/* Gross + Tare + Net (live calc) */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Loaded Weight (kg) *</label>
          <input
            className="input"
            type="number" step="0.01" min="1"
            name="gross_weight_kg"
            placeholder="Gross weight"
            value={grossWt}
            onChange={e => setGrossWt(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Tare / Empty Weight (kg) *</label>
          <input
            className="input"
            type="number" step="0.01" min="1"
            name="tare_weight_kg"
            placeholder="Empty weight"
            value={tare}
            onChange={e => setTare(e.target.value)}
            required
          />
          <p className="text-xs text-gray-400 mt-0.5">Auto-filled from vehicle master</p>
        </div>
        <div>
          <label className="label">Net Weight (kg)</label>
          <div className={`border rounded px-3 py-2 text-sm font-bold min-h-[38px]
            ${netWt && parseFloat(netWt) > 0 ? "bg-green-50 border-green-300 text-green-700" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
            {netWt && parseFloat(netWt) > 0 ? `${parseFloat(netWt).toLocaleString()} kg` : "—"}
          </div>
        </div>
      </div>

      <div>
        <label className="label">Remarks</label>
        <input className="input" name="remarks" placeholder="Optional" />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save & Get Ticket"}
        </button>
      </div>
    </form>
  );
}

// ── Outward Tab ───────────────────────────────────────────────────────────────
function OutwardTab() {
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const printRef  = useRef();
  const [dateFrom, setDateFrom]     = useState(today);
  const [dateTo,   setDateTo]       = useState(today);
  const [applied,  setApplied]      = useState({ date_from: today, date_to: today });
  const [modal,    setModal]        = useState(false);
  const [confirm,  setConfirm]      = useState(null);
  const [printRec, setPrintRec]     = useState(null);
  const [error,    setError]        = useState("");

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printRec ? `WeighSlip_${printRec.ticket_number || printRec.dc_number}` : "WeighSlip",
  });

  // Deliveries with weighment
  const { data: deliveries = [], isLoading: loadingDel } = useQuery({
    queryKey: ["deliveries-weighment", applied],
    queryFn: () => api.get(`/deliveries?date_from=${applied.date_from}&date_to=${applied.date_to}&limit=200`).then(r => r.data),
  });
  // Standalone outward weighment records
  const { data: outwardRecs = [], isLoading: loadingRecs } = useQuery({
    queryKey: ["weighments-outward", applied],
    queryFn: () => api.get(`/weighments?type=OUTWARD&date_from=${applied.date_from}&date_to=${applied.date_to}`).then(r => r.data),
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => api.get("/vehicles").then(r => r.data),
  });

  const create = useMutation({
    mutationFn: d => api.post("/weighments", d),
    onSuccess: () => { qc.invalidateQueries(["weighments-outward"]); setModal(false); setError(""); },
    onError: e => setError(e.response?.data?.detail || "Error saving."),
  });
  const del = useMutation({
    mutationFn: id => api.delete(`/weighments/${id}`),
    onSuccess: () => { qc.invalidateQueries(["weighments-outward"]); setConfirm(null); },
  });

  const deliveryOutward = deliveries.filter(d => d.generate_weighment === 1);
  const isLoading = loadingDel || loadingRecs;

  function printDelivery(d) {
    setPrintRec({
      ticket_number:   `WS-${String(d.id).padStart(5, "0")}`,
      weigh_date:      d.delivery_date,
      weigh_time:      d.delivery_time,
      dc_number:       d.dc_number,
      vehicle_number:  d.vehicle_number,
      driver_name:     d.driver_name,
      material_description: d.material_name,
      supplier:        "SRI AMMAN",
      gross_weight_kg: d.gross_weight_kg,
      tare_weight_kg:  d.empty_weight_kg,
      net_weight_kg:   d.net_weight_kg,
      id:              d.id,
    });
    requestAnimationFrame(() => handlePrint());
  }

  function printRecord(r) {
    setPrintRec(r);
    requestAnimationFrame(() => handlePrint());
  }

  return (
    <div className="space-y-4">
      {/* Filter row + New Outward button */}
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
        <button className="btn-accent flex items-center gap-1 ml-auto"
          onClick={() => { setError(""); setModal(true); }}>
          <Plus size={15} /> New Outward Entry
        </button>
      </div>

      {isLoading ? <p className="text-gray-400">Loading…</p> : (
        <>
          {/* Delivery-linked outward weighments */}
          {deliveryOutward.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Linked to Deliveries
              </p>
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2 text-gray-600">DC Number</th>
                      <th className="text-left px-4 py-2 text-gray-600">Date</th>
                      <th className="text-left px-4 py-2 text-gray-600">Customer</th>
                      <th className="text-left px-4 py-2 text-gray-600">Vehicle</th>
                      <th className="text-left px-4 py-2 text-gray-600">Driver</th>
                      <th className="text-right px-4 py-2 text-gray-600">Loaded (kg)</th>
                      <th className="text-right px-4 py-2 text-gray-600">Empty (kg)</th>
                      <th className="text-right px-4 py-2 text-gray-600">Net (kg)</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryOutward.map(d => (
                      <tr key={d.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-xs text-primary font-semibold">{d.dc_number}</td>
                        <td className="px-4 py-2 text-gray-500">{d.delivery_date}</td>
                        <td className="px-4 py-2">{d.customer_name}</td>
                        <td className="px-4 py-2 font-mono text-xs font-semibold">{d.vehicle_number}</td>
                        <td className="px-4 py-2 text-gray-600">{d.driver_name}</td>
                        <td className="px-4 py-2 text-right">{d.gross_weight_kg ? Number(d.gross_weight_kg).toLocaleString() : "—"}</td>
                        <td className="px-4 py-2 text-right text-gray-500">{d.empty_weight_kg ? Number(d.empty_weight_kg).toLocaleString() : "—"}</td>
                        <td className="px-4 py-2 text-right font-semibold text-green-700">
                          {d.net_weight_kg ? Number(d.net_weight_kg).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <button className="text-gray-400 hover:text-primary" title="Print Slip"
                              onClick={() => printDelivery(d)}>
                              <Printer size={14} />
                            </button>
                            <button className="text-gray-400 hover:text-primary" title="View Slip"
                              onClick={() => navigate(`/delivery/${d.id}/weighment`)}>
                              <Scale size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Standalone outward weighments */}
          <div>
            {deliveryOutward.length > 0 && (
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Other Vehicles (Standalone)
              </p>
            )}
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2 text-gray-600">Ticket No</th>
                    <th className="text-left px-4 py-2 text-gray-600">Date</th>
                    <th className="text-left px-4 py-2 text-gray-600">Vehicle</th>
                    <th className="text-left px-4 py-2 text-gray-600">Driver</th>
                    <th className="text-left px-4 py-2 text-gray-600">Material</th>
                    <th className="text-right px-4 py-2 text-gray-600">Loaded (kg)</th>
                    <th className="text-right px-4 py-2 text-gray-600">Empty (kg)</th>
                    <th className="text-right px-4 py-2 text-gray-600">Net (kg)</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {outwardRecs.map(r => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs text-primary font-semibold">{r.ticket_number}</td>
                      <td className="px-4 py-2 text-gray-500">{r.weigh_date}</td>
                      <td className="px-4 py-2 font-mono text-xs font-semibold">{r.vehicle_number}</td>
                      <td className="px-4 py-2 text-gray-600">{r.driver_name || "—"}</td>
                      <td className="px-4 py-2">{r.material_description || "—"}</td>
                      <td className="px-4 py-2 text-right">{Number(r.gross_weight_kg).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-gray-500">{Number(r.tare_weight_kg).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right font-semibold text-green-700">
                        {Number(r.net_weight_kg).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button className="text-gray-400 hover:text-primary" title="Print Slip"
                            onClick={() => printRecord(r)}>
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
                  {!outwardRecs.length && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                      No standalone outward entries. Use "+ New Outward Entry" for other vehicles.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Hidden print area */}
      <div style={{ display: "none" }}>
        <div ref={printRef}>
          <style>{`@media print { @page { size: A5 portrait; margin: 4mm; } body { margin: 0; } }`}</style>
          {printRec && <WeighSlipTemplate data={toSlipData(printRec)} type="OUTWARD" />}
        </div>
      </div>

      {/* New Outward Entry Modal */}
      {modal && (
        <Modal title="New Outward Weighment" onClose={() => setModal(false)}>
          <p className="text-xs text-gray-500 mb-3">
            For vehicles not linked to a delivery entry (other plant vehicles, external trucks, etc.)
          </p>
          <WeighmentForm
            type="OUTWARD"
            vehicles={vehicles}
            onCreate={d => create.mutate(d)}
            error={error}
            saving={create.isPending}
            onClose={() => setModal(false)}
          />
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          message={`Delete ticket "${confirm.name}"?`}
          onCancel={() => setConfirm(null)}
          onConfirm={() => del.mutate(confirm.id)}
        />
      )}
    </div>
  );
}

// ── Inward Tab ────────────────────────────────────────────────────────────────
function InwardTab() {
  const qc       = useQueryClient();
  const printRef = useRef();
  const [modal,    setModal]    = useState(false);
  const [confirm,  setConfirm]  = useState(null);
  const [printRec, setPrintRec] = useState(null);
  const [error,    setError]    = useState("");

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printRec ? `Weighment_${printRec.ticket_number}` : "Weighment",
  });

  const { data: records  = [], isLoading } = useQuery({
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
                <th className="text-left px-4 py-2 text-gray-600">Ticket No</th>
                <th className="text-left px-4 py-2 text-gray-600">Date</th>
                <th className="text-left px-4 py-2 text-gray-600">Vehicle</th>
                <th className="text-left px-4 py-2 text-gray-600">Driver</th>
                <th className="text-left px-4 py-2 text-gray-600">Material</th>
                <th className="text-left px-4 py-2 text-gray-600">Supplier</th>
                <th className="text-right px-4 py-2 text-gray-600">Net Wt (kg)</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-primary font-semibold">{r.ticket_number}</td>
                  <td className="px-4 py-2 text-gray-500">{r.weigh_date}</td>
                  <td className="px-4 py-2 font-mono text-xs font-semibold">{r.vehicle_number}</td>
                  <td className="px-4 py-2 text-gray-600">{r.driver_name || "—"}</td>
                  <td className="px-4 py-2">{r.material_description || "—"}</td>
                  <td className="px-4 py-2 text-gray-500">{r.supplier || "—"}</td>
                  <td className="px-4 py-2 text-right font-semibold text-green-700">
                    {Number(r.net_weight_kg).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button className="text-gray-400 hover:text-primary" title="Print slip"
                        onClick={() => { setPrintRec(r); requestAnimationFrame(() => handlePrint()); }}>
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
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No inward weighments yet.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Hidden print */}
      <div style={{ display: "none" }}>
        <div ref={printRef}>
          <style>{`@media print { @page { size: A5 portrait; margin: 4mm; } body { margin: 0; } }`}</style>
          {printRec && <WeighSlipTemplate data={toSlipData(printRec)} type="INWARD" />}
        </div>
      </div>

      {modal && (
        <Modal title="New Inward Weighment" onClose={() => setModal(false)}>
          <WeighmentForm
            type="INWARD"
            vehicles={vehicles}
            onCreate={d => create.mutate(d)}
            error={error}
            saving={create.isPending}
            onClose={() => setModal(false)}
          />
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          message={`Delete ticket "${confirm.name}"?`}
          onCancel={() => setConfirm(null)}
          onConfirm={() => del.mutate(confirm.id)}
        />
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
        {["OUTWARD", "INWARD"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors
              ${tab === t ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t}
            <span className="ml-2 text-xs font-normal text-gray-400">
              {t === "OUTWARD" ? "(Concrete leaving)" : "(Materials arriving)"}
            </span>
          </button>
        ))}
      </div>
      {tab === "OUTWARD" && <OutwardTab />}
      {tab === "INWARD"  && <InwardTab  />}
    </div>
  );
}
