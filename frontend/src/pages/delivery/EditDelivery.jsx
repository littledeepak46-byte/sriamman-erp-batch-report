import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import api from "../../api/axios";

const PLANT_TYPES = ["M1.25", "CP30", "None"];
const CONCRETE_NAME = "Concrete";

function Field({ label, required, children }) {
  return (
    <div>
      <label className="label">{label} {required && <span className="text-red-500">*</span>}</label>
      {children}
    </div>
  );
}

export default function EditDelivery() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: delivery, isLoading } = useQuery({
    queryKey: ["delivery", id],
    queryFn: () => api.get(`/deliveries/${id}`).then(r => r.data),
  });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles"], queryFn: () => api.get("/vehicles").then(r => r.data) });
  const { data: drivers  = [] } = useQuery({ queryKey: ["drivers"],  queryFn: () => api.get("/drivers").then(r => r.data) });
  const { data: materialTypes = [] } = useQuery({ queryKey: ["material-types"], queryFn: () => api.get("/material-types").then(r => r.data) });
  const { data: pumpingTypes  = [] } = useQuery({ queryKey: ["pumping-types"],  queryFn: () => api.get("/pumping-types").then(r => r.data) });

  const [vehicleId,    setVehicleId]    = useState("");
  const [driverId,     setDriverId]     = useState("");
  const [gradeId,      setGradeId]      = useState("");
  const [pumpingTypeId,setPumpingTypeId]= useState("");
  const [quantity,     setQuantity]     = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [grossWeight,  setGrossWeight]  = useState("");
  const [orderNumber,  setOrderNumber]  = useState(0);
  const [pourType,     setPourType]     = useState("");
  const [plantType,    setPlantType]    = useState("None");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  useEffect(() => {
    if (!delivery) return;
    setVehicleId(String(delivery.vehicle_id || ""));
    setDriverId(String(delivery.driver_id || ""));
    setGradeId(String(delivery.grade_id || ""));
    setPumpingTypeId(delivery.pumping_type_id ? String(delivery.pumping_type_id) : "");
    setQuantity(String(delivery.quantity_m3 || ""));
    setDeliveryDate(delivery.delivery_date || "");
    setDeliveryTime(delivery.delivery_time?.slice(0, 5) || "");
    setGrossWeight(delivery.gross_weight_kg ? String(delivery.gross_weight_kg) : "");
    setOrderNumber(delivery.order_number || 0);
    setPourType(delivery.pour_type || "");
    setPlantType(delivery.plant_type || "None");
  }, [delivery]);

  const selectedMat = materialTypes.find(m => m.grades?.some(g => g.id === parseInt(gradeId)));
  const isConcreteSelected = delivery?.material_name === CONCRETE_NAME || selectedMat?.name === CONCRETE_NAME;
  const selectedVehicle = vehicles.find(v => v.id === parseInt(vehicleId));
  const emptyWeight = selectedVehicle ? parseFloat(selectedVehicle.empty_weight_kg) : null;
  const netWeight = grossWeight && emptyWeight !== null ? parseFloat(grossWeight) - emptyWeight : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await api.put(`/deliveries/${id}`, {
        vehicle_id:      parseInt(vehicleId),
        driver_id:       parseInt(driverId),
        grade_id:        parseInt(gradeId),
        pumping_type_id: pumpingTypeId ? parseInt(pumpingTypeId) : null,
        quantity_m3:     parseFloat(quantity),
        delivery_date:   deliveryDate,
        delivery_time:   deliveryTime + ":00",
        gross_weight_kg: grossWeight ? parseFloat(grossWeight) : null,
        order_number:    parseInt(orderNumber) || 0,
        pour_type:       pourType || null,
        plant_type:      plantType === "None" ? null : plantType,
      });
      qc.invalidateQueries(["deliveries"]);
      navigate(-1);
    } catch (err) {
      setError(err.response?.data?.detail || "Error saving changes.");
    } finally { setSaving(false); }
  }

  if (isLoading) return <div className="p-8 text-gray-400">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button className="btn-secondary flex items-center gap-1" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Back
        </button>
        <h1 className="text-xl font-bold text-primary">Edit Delivery — {delivery?.dc_number}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card space-y-4">
          <h2 className="font-semibold text-primary border-b pb-2">Delivery Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date" required>
              <input className="input" type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} required />
            </Field>
            <Field label="Time" required>
              <input className="input" type="time" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} required />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Vehicle" required>
              <select className="input" value={vehicleId} onChange={e => setVehicleId(e.target.value)} required>
                <option value="">Select…</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
              </select>
            </Field>
            <Field label="Driver" required>
              <select className="input" value={driverId} onChange={e => setDriverId(e.target.value)} required>
                <option value="">Select…</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Quantity (m³)" required>
              <input className="input" type="number" step="0.01" min="0.01" value={quantity}
                onChange={e => setQuantity(e.target.value)} required />
            </Field>
            <Field label="Gross Weight (kg)">
              <input className="input" type="number" step="0.01" min="0" value={grossWeight}
                onChange={e => setGrossWeight(e.target.value)} />
            </Field>
          </div>
          {emptyWeight !== null && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Empty Weight (kg)</label>
                <div className="input bg-gray-50 text-gray-500">{emptyWeight.toLocaleString()}</div>
              </div>
              <div>
                <label className="label">Net Weight (kg)</label>
                <div className={`input font-semibold ${netWeight !== null ? (netWeight < 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700") : "bg-gray-50 text-gray-400"}`}>
                  {netWeight !== null ? netWeight.toLocaleString() + " kg" : "—"}
                </div>
              </div>
            </div>
          )}
          {isConcreteSelected && (
            <div className="grid grid-cols-3 gap-4">
              <Field label="Plant Type">
                <select className="input" value={plantType} onChange={e => setPlantType(e.target.value)}>
                  {PLANT_TYPES.map(p => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Order Number">
                <input className="input" type="number" min="0" value={orderNumber}
                  onChange={e => setOrderNumber(e.target.value)} />
              </Field>
              <Field label="Pour Type">
                <input className="input" list="pour-edit-opts" value={pourType}
                  onChange={e => setPourType(e.target.value)} placeholder="Select or type…" />
                <datalist id="pour-edit-opts">
                  {["Footing","Column","Slab","Flooring","Beam","Wall","Raft","Staircase","Lintel","Plinth Beam","Others"].map(p => <option key={p} value={p} />)}
                </datalist>
              </Field>
            </div>
          )}
          <Field label="Pumping Type">
            <select className="input" value={pumpingTypeId} onChange={e => setPumpingTypeId(e.target.value)}>
              <option value="">None</option>
              {pumpingTypes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        </div>

        {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded px-4 py-2">{error}</p>}

        <div className="flex justify-end gap-3 pb-6">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
            <Save size={15} /> {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
