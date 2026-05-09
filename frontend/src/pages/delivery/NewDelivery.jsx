import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Printer, Save, RefreshCw } from "lucide-react";
import api from "../../api/axios";

const PLANT_TYPES = ["M1.25", "CP30", "None"];
const CONCRETE_NAME = "Concrete";

function Field({ label, required, children }) {
  return (
    <div>
      <label className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function ReadOnly({ label, value }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="border border-gray-200 rounded px-3 py-2 bg-gray-50 text-sm text-gray-700 min-h-[38px]">
        {value || <span className="text-gray-300">—</span>}
      </div>
    </div>
  );
}

export default function NewDelivery() {
  const navigate = useNavigate();

  // ── master data ───────────────────────────────────────────────────────────
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => api.get("/customers").then(r => r.data) });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles"], queryFn: () => api.get("/vehicles").then(r => r.data) });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: () => api.get("/drivers").then(r => r.data) });
  const { data: materialTypes = [] } = useQuery({ queryKey: ["material-types"], queryFn: () => api.get("/material-types").then(r => r.data) });
  const { data: pumpingTypes = [] } = useQuery({ queryKey: ["pumping-types"], queryFn: () => api.get("/pumping-types").then(r => r.data) });

  // ── form state ────────────────────────────────────────────────────────────
  const today = format(new Date(), "yyyy-MM-dd");
  const nowTime = format(new Date(), "HH:mm");

  const [customerId, setCustomerId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [plantType, setPlantType] = useState("M1.25");
  const [materialTypeId, setMaterialTypeId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [pumpingTypeId, setPumpingTypeId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(today);
  const [deliveryTime, setDeliveryTime] = useState(nowTime);
  const [grossWeight, setGrossWeight] = useState("");
  const [orderNumber, setOrderNumber] = useState(0);
  const [pourType, setPourType] = useState("");
  const [generateWeighment, setGenerateWeighment] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedDelivery, setSavedDelivery] = useState(null);

  // ── derived / auto-fill ───────────────────────────────────────────────────
  const selectedCustomer = customers.find(c => c.id === parseInt(customerId));
  const { data: sites = [] } = useQuery({
    queryKey: ["sites", customerId],
    queryFn: () => api.get(`/customers/${customerId}/sites`).then(r => r.data),
    enabled: !!customerId,
  });
  const selectedSite = sites.find(s => s.id === parseInt(siteId));
  const selectedVehicle = vehicles.find(v => v.id === parseInt(vehicleId));

  // Auto-fill default driver when vehicle changes
  useEffect(() => {
    if (selectedVehicle?.default_driver_id) {
      setDriverId(String(selectedVehicle.default_driver_id));
    }
  }, [vehicleId]);
  const selectedMaterial = materialTypes.find(m => m.id === parseInt(materialTypeId));
  const grades = selectedMaterial?.grades?.filter(g => g.is_active) ?? [];
  const isConcreteSelected = selectedMaterial?.name === CONCRETE_NAME;

  // Quantity unit & step based on material type
  const QTY_CONFIG = {
    Concrete: { unit: "m³",  step: "0.01",  min: "0.01" },
    Bitumen:  { unit: "ton", step: "0.001", min: "0.001" },
    Precast:  { unit: "nos", step: "1",     min: "1" },
  };
  const qtyConf = QTY_CONFIG[selectedMaterial?.name] ?? { unit: "m³", step: "0.01", min: "0.01" };

  // Auto-clear grade, plant type, order number when material changes
  useEffect(() => {
    setGradeId("");
    if (selectedMaterial?.name !== CONCRETE_NAME) {
      setPlantType("None");
      setOrderNumber(0);
    }
  }, [materialTypeId]);
  // Auto-clear site when customer changes
  useEffect(() => { setSiteId(""); }, [customerId]);
  // Auto-clear pumping if not concrete
  useEffect(() => { if (!isConcreteSelected) setPumpingTypeId(""); }, [isConcreteSelected]);
  // Default pumping type to "Manual" when list loads
  useEffect(() => {
    if (pumpingTypes.length && !pumpingTypeId) {
      const manual = pumpingTypes.find(p => p.name.toLowerCase() === "manual");
      if (manual) setPumpingTypeId(String(manual.id));
    }
  }, [pumpingTypes]);

  // Cumulative qty — live query
  const canCalcCumulative = customerId && siteId && gradeId && deliveryDate && quantity > 0;
  const { data: cumulativeData, isFetching: cumulativeFetching } = useQuery({
    queryKey: ["cumulative", customerId, siteId, gradeId, plantType, deliveryDate, quantity],
    queryFn: () => api.post("/deliveries/cumulative-qty", {
      customer_id: parseInt(customerId),
      site_id: parseInt(siteId),
      grade_id: parseInt(gradeId),
      plant_type: plantType === "None" ? null : plantType,
      delivery_date: deliveryDate,
      quantity_m3: parseFloat(quantity),
    }).then(r => r.data),
    enabled: !!canCalcCumulative && parseFloat(quantity) > 0,
  });

  const emptyWeight = selectedVehicle ? parseFloat(selectedVehicle.empty_weight_kg) : null;
  const netWeight = grossWeight && emptyWeight !== null ? parseFloat(grossWeight) - emptyWeight : null;

  // ── billing address display ───────────────────────────────────────────────
  const billingAddress = selectedCustomer
    ? [selectedCustomer.billing_address_line1, selectedCustomer.billing_address_line2, selectedCustomer.billing_city, selectedCustomer.billing_state, selectedCustomer.billing_pincode]
        .filter(Boolean).join(", ")
    : "";

  async function handleSubmit(e) {
    e.preventDefault();
    if (netWeight !== null && netWeight < 0) {
      setError("Net weight cannot be negative. Check gross weight.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        customer_id: parseInt(customerId),
        site_id: parseInt(siteId),
        plant_type: plantType === "None" ? null : plantType,
        material_type_id: parseInt(materialTypeId),
        grade_id: parseInt(gradeId),
        pumping_type_id: pumpingTypeId ? parseInt(pumpingTypeId) : null,
        quantity_m3: parseFloat(quantity),
        vehicle_id: parseInt(vehicleId),
        driver_id: parseInt(driverId),
        delivery_date: deliveryDate,
        delivery_time: deliveryTime + ":00",
        gross_weight_kg: grossWeight ? parseFloat(grossWeight) : null,
        generate_weighment: generateWeighment,
        order_number: parseInt(orderNumber) || 0,
        pour_type: pourType || null,
      };
      const { data } = await api.post("/deliveries", payload);
      setSavedDelivery(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Error saving delivery.");
    } finally {
      setSaving(false);
    }
  }

  // ── success screen ────────────────────────────────────────────────────────
  if (savedDelivery) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="card text-center space-y-3">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Save size={24} className="text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-primary">Delivery Saved</h2>
          <p className="text-gray-500 text-sm">DC Number generated successfully</p>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-lg font-bold text-primary tracking-wide">
            {savedDelivery.dc_number}
          </div>
          {savedDelivery.batch_number && (
            <p className="text-sm text-gray-600">Batch No: <strong>{savedDelivery.batch_number}</strong> ({savedDelivery.plant_type})</p>
          )}
          <div className="text-sm text-left space-y-1 text-gray-600">
            <p><span className="font-medium">Customer:</span> {savedDelivery.customer_name}</p>
            <p><span className="font-medium">Grade:</span> {savedDelivery.grade_name} | <span className="font-medium">Qty:</span> {savedDelivery.quantity_m3} m³</p>
            <p><span className="font-medium">Cumulative:</span> {savedDelivery.cumulative_qty_m3} m³</p>
            {savedDelivery.net_weight_kg && <p><span className="font-medium">Net Weight:</span> {Number(savedDelivery.net_weight_kg).toLocaleString()} kg</p>}
          </div>
        </div>

        {/* Print buttons */}
        <div className="flex flex-col gap-3">
          <button className="btn-primary flex items-center justify-center gap-2" onClick={() => navigate(`/delivery/${savedDelivery.id}/challan`)}>
            <Printer size={16} /> Print Delivery Challan (DC)
          </button>
          {savedDelivery.plant_type && savedDelivery.plant_type !== "None" && (
            <button className="btn-accent flex items-center justify-center gap-2" onClick={() => navigate(`/delivery/${savedDelivery.id}/batch-report`)}>
              <Printer size={16} /> Print Batch Report ({savedDelivery.plant_type})
            </button>
          )}
          {savedDelivery.generate_weighment === 1 && (
            <button className="btn-secondary flex items-center justify-center gap-2" onClick={() => navigate(`/delivery/${savedDelivery.id}/weighment`)}>
              <Printer size={16} /> Print Weighment Slip
            </button>
          )}
          <button className="btn-secondary flex items-center justify-center gap-2" onClick={() => { setSavedDelivery(null); setQuantity(""); setGrossWeight(""); }}>
            <RefreshCw size={16} /> New Delivery
          </button>
        </div>
      </div>
    );
  }

  // ── form ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-primary mb-5">New Delivery</h1>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Section 1: Customer ───────────────────────────────────────── */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-primary border-b pb-2">Customer Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Customer" required>
              <select className="input" value={customerId} onChange={e => setCustomerId(e.target.value)} required>
                <option value="">Select customer…</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <ReadOnly label="GST Number" value={selectedCustomer?.gst_number} />
          </div>
          <ReadOnly label="Billing Address" value={billingAddress} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Site Address" required>
              <select className="input" value={siteId} onChange={e => setSiteId(e.target.value)} required disabled={!customerId}>
                <option value="">Select site…</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.site_name} — {s.city}</option>)}
              </select>
            </Field>
            <ReadOnly label="Site Location (City)" value={selectedSite?.city} />
          </div>
        </div>

        {/* ── Section 2: Material ──────────────────────────────────────── */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-primary border-b pb-2">Material & Plant</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isConcreteSelected && (
              <Field label="Plant Type" required>
                <select className="input" value={plantType} onChange={e => setPlantType(e.target.value)} required>
                  {PLANT_TYPES.map(p => <option key={p}>{p}</option>)}
                </select>
              </Field>
            )}
            <Field label="Type of Material" required>
              <select className="input" value={materialTypeId} onChange={e => setMaterialTypeId(e.target.value)} required>
                <option value="">Select…</option>
                {materialTypes.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field label="Grade" required>
              <select className="input" value={gradeId} onChange={e => setGradeId(e.target.value)} required disabled={!materialTypeId}>
                <option value="">Select grade…</option>
                {grades.map(g => <option key={g.id} value={g.id}>{g.grade_name}</option>)}
              </select>
            </Field>
          </div>

          {/* Pumping type — only for Concrete */}
          {isConcreteSelected && (
            <Field label="Pumping Type">
              <select className="input" value={pumpingTypeId} onChange={e => setPumpingTypeId(e.target.value)}>
                <option value="">None / Not applicable</option>
                {pumpingTypes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={`Quantity (${qtyConf.unit})`} required>
              <input className="input" type="number" step={qtyConf.step} min={qtyConf.min}
                value={quantity} onChange={e => setQuantity(e.target.value)} required />
            </Field>
            <div>
              <label className="label">Cumulative Quantity ({qtyConf.unit})</label>
              <div className="border border-gray-200 rounded px-3 py-2 bg-gray-50 text-sm text-blue-700 font-semibold min-h-[38px]">
                {cumulativeFetching ? "Calculating…" : cumulativeData ? `${cumulativeData.cumulative_qty_m3} ${qtyConf.unit}` : <span className="text-gray-300 font-normal">Fill customer, site, grade & qty</span>}
              </div>
            </div>
          </div>

          {isConcreteSelected && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Order Number">
              <input className="input" type="number" min="0" value={orderNumber}
                onChange={e => setOrderNumber(e.target.value)} />
            </Field>
            <Field label="Pour Type">
              <select className="input" value={pourType} onChange={e => setPourType(e.target.value)}>
                <option value="">Select pour type…</option>
                <option>Footing</option>
                <option>Column</option>
                <option>Slab</option>
                <option>Flooring</option>
                <option>Beam</option>
                <option>Wall</option>
                <option>Raft</option>
                <option>Staircase</option>
                <option>Lintel</option>
                <option>Plinth Beam</option>
                <option>Others</option>
              </select>
            </Field>
          </div>}
        </div>

        {/* ── Section 3: Vehicle & Driver ──────────────────────────────── */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-primary border-b pb-2">Vehicle & Driver</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Vehicle Number" required>
              <select className="input" value={vehicleId} onChange={e => setVehicleId(e.target.value)} required>
                <option value="">Select vehicle…</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
              </select>
            </Field>
            <ReadOnly label="Empty Weight (kg)" value={emptyWeight !== null ? `${emptyWeight.toLocaleString()} kg` : ""} />
          </div>
          <Field label="Driver" required>
            <select className="input" value={driverId} onChange={e => setDriverId(e.target.value)} required>
              <option value="">Select driver…</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
        </div>

        {/* ── Section 4: Date, Time & Weight ───────────────────────────── */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="font-semibold text-primary">Date, Time & Weight</h2>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" className="w-4 h-4 accent-primary"
                checked={generateWeighment}
                onChange={e => setGenerateWeighment(e.target.checked)} />
              <span className="text-sm text-gray-600">Generate Weighment Slip</span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Date" required>
              <input className="input" type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} required />
            </Field>
            <Field label="Time" required>
              <input className="input" type="time" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} required />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Gross Weight (kg)">
              <input className="input" type="number" step="0.01" min="0" value={grossWeight}
                onChange={e => setGrossWeight(e.target.value)} />
            </Field>
            <ReadOnly label="Empty Weight (kg)" value={emptyWeight !== null ? emptyWeight.toLocaleString() : ""} />
            <div>
              <label className="label">Net Weight (kg)</label>
              <div className={`border rounded px-3 py-2 text-sm font-semibold min-h-[38px] ${netWeight !== null ? (netWeight < 0 ? "bg-red-50 border-red-300 text-red-600" : "bg-green-50 border-green-200 text-green-700") : "bg-gray-50 border-gray-200 text-gray-300"}`}>
                {netWeight !== null ? netWeight.toLocaleString() + " kg" : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* ── Auto-generated fields (info) ─────────────────────────────── */}
        <div className="card bg-blue-50 border border-blue-200 space-y-2">
          <h2 className="font-semibold text-primary text-sm">Auto-Generated on Save</h2>
          <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
            <div><span className="font-medium">DC Number</span><p className="text-xs text-gray-400">SARMC / FY / MON / NNNN</p></div>
            <div><span className="font-medium">Batching Number</span><p className="text-xs text-gray-400">{plantType !== "None" ? `Per-${plantType} global sequence` : "N/A (no plant selected)"}</p></div>
            <div><span className="font-medium">Weighment Ticket</span><p className="text-xs text-gray-400">WGH-NNNNN — resets every April</p></div>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded px-4 py-2">{error}</p>}

        <div className="flex justify-end gap-3 pb-6">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
            <Save size={16} /> {saving ? "Saving…" : "Save Delivery"}
          </button>
        </div>
      </form>
    </div>
  );
}
