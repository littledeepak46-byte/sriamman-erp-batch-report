import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import api from "../../api/axios";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";

const DENSITY_MIN = 2410;
const PLANT_TYPES = ["M1.25", "CP30"];

const INGREDIENTS = [
  { key: "sand1",    label: "Sand 1" },
  { key: "agg_20mm", label: "20 MM" },
  { key: "sand2",    label: "Sand 2" },
  { key: "agg_12mm", label: "12 MM" },
  { key: "agg_6mm",  label: "6 MM" },
  { key: "agg6",     label: "Agg 6" },
  { key: "cem1",     label: "Cem 1" },
  { key: "cem2",     label: "Cem 2" },
  { key: "cem3",     label: "Cem 3" },
  { key: "cem4",     label: "Cem 4" },
  { key: "fly",      label: "Fly Ash" },
  { key: "wtr1",     label: "Water 1" },
  { key: "wtr2",     label: "Water 2" },
  { key: "wtr3",     label: "Water 3" },
  { key: "adx1",     label: "ADX 1" },
  { key: "adx2",     label: "ADX 2" },
  { key: "adx3",     label: "ADX 3" },
  { key: "adx4",     label: "ADX 4" },
  { key: "silica",   label: "Silica" },
  { key: "moisture", label: "Moisture" },
  { key: "filler",   label: "Filler" },
  { key: "col1",     label: "Col 1" },
  { key: "col2",     label: "Col 2" },
  { key: "col3",     label: "Col 3" },
];

function emptyForm(plantType = "M1.25", gradeId = "") {
  const base = { plant_type: plantType, grade_id: gradeId };
  INGREDIENTS.forEach(i => { base[i.key] = "0"; });
  return base;
}

function computeDensity(values) {
  return INGREDIENTS.reduce((sum, i) => sum + (parseFloat(values[i.key]) || 0), 0);
}

function IngredientInput({ ing, value, onChange }) {
  return (
    <div className="flex flex-col">
      <label className="text-xs text-gray-500 mb-0.5">{ing.label}</label>
      <input
        type="number" step="0.001" min="0"
        className="border rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-primary"
        value={value}
        onChange={e => onChange(ing.key, e.target.value)}
      />
    </div>
  );
}

export default function DesignMix() {
  const qc = useQueryClient();
  const [plantFilter, setPlantFilter] = useState("M1.25");
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [density, setDensity] = useState(0);
  const [apiError, setApiError] = useState("");

  const { data: materialTypes = [] } = useQuery({
    queryKey: ["material-types"],
    queryFn: () => api.get("/material-types").then(r => r.data),
  });

  const concreteType = materialTypes.find(m => m.name === "Concrete");
  const grades = concreteType?.grades?.filter(g => g.is_active) ?? [];

  const { data: mixes = [], isLoading } = useQuery({
    queryKey: ["design-mixes", plantFilter],
    queryFn: () => api.get(`/design-mixes?plant_type=${plantFilter}`).then(r => r.data),
  });

  const saveMix = useMutation({
    mutationFn: d => d.id ? api.put(`/design-mixes/${d.id}`, d) : api.post("/design-mixes", d),
    onSuccess: () => { qc.invalidateQueries(["design-mixes"]); setModal(null); setApiError(""); },
    onError: e => setApiError(e.response?.data?.detail || "Error saving design mix."),
  });
  const delMix = useMutation({
    mutationFn: id => api.delete(`/design-mixes/${id}`),
    onSuccess: () => { qc.invalidateQueries(["design-mixes"]); setConfirm(null); },
  });

  useEffect(() => {
    if (modal) setDensity(computeDensity(formValues));
  }, [formValues, modal]);

  function openModal(mix = null) {
    const initial = mix
      ? { ...mix, grade_id: mix.grade_id }
      : emptyForm(plantFilter, grades[0]?.id ?? "");
    setFormValues(initial);
    setDensity(computeDensity(initial));
    setApiError("");
    setModal({ data: mix });
  }

  function handleIngChange(key, val) {
    setFormValues(prev => ({ ...prev, [key]: val }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...formValues };
    INGREDIENTS.forEach(i => { payload[i.key] = parseFloat(payload[i.key]) || 0; });
    payload.grade_id = parseInt(payload.grade_id);
    if (modal.data?.id) payload.id = modal.data.id;
    saveMix.mutate(payload);
  }

  const densityOk = density >= DENSITY_MIN;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">Design Mix</h1>
        <button className="btn-primary flex items-center gap-1" onClick={() => openModal()}>
          <Plus size={16} /> Add Design Mix
        </button>
      </div>

      {/* Plant filter tabs */}
      <div className="flex gap-1 border-b">
        {PLANT_TYPES.map(p => (
          <button key={p} onClick={() => setPlantFilter(p)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${plantFilter === p ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {p} Plant
          </button>
        ))}
      </div>

      {isLoading ? <p className="text-gray-400">Loading…</p> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600">Grade</th>
                <th className="text-left px-4 py-3 text-gray-600">Plant</th>
                <th className="text-left px-4 py-3 text-gray-600">Version</th>
                <th className="text-left px-4 py-3 text-gray-600">Total Density</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {mixes.map(m => (
                <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{m.grade_name}</td>
                  <td className="px-4 py-3 text-gray-500">{m.plant_type}</td>
                  <td className="px-4 py-3 text-gray-500">v{m.version}</td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 font-mono text-sm ${parseFloat(m.total_density) >= DENSITY_MIN ? "text-green-700" : "text-red-600"}`}>
                      {parseFloat(m.total_density) >= DENSITY_MIN
                        ? <CheckCircle size={13} />
                        : <AlertTriangle size={13} />}
                      {parseFloat(m.total_density).toFixed(1)} kg/m³
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button className="text-gray-400 hover:text-primary" onClick={() => openModal(m)}><Pencil size={15} /></button>
                      <button className="text-gray-400 hover:text-red-500" onClick={() => setConfirm({ id: m.id, name: `${m.grade_name} / ${m.plant_type}` })}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!mixes.length && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No design mixes for {plantFilter}. Add one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Design Mix Modal */}
      {modal && (
        <Modal title={modal.data?.id ? "Edit Design Mix" : "Add Design Mix"} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Plant Type *</label>
                <select className="input" value={formValues.plant_type || "M1.25"}
                  onChange={e => setFormValues(v => ({ ...v, plant_type: e.target.value }))}>
                  {PLANT_TYPES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Grade *</label>
                <select className="input" value={formValues.grade_id || ""}
                  onChange={e => setFormValues(v => ({ ...v, grade_id: e.target.value }))} required>
                  <option value="">Select grade…</option>
                  {grades.map(g => <option key={g.id} value={g.id}>{g.grade_name}</option>)}
                </select>
              </div>
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ingredients (kg/m³)</p>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {INGREDIENTS.map(ing => (
                <IngredientInput key={ing.key} ing={ing} value={formValues[ing.key] ?? "0"} onChange={handleIngChange} />
              ))}
            </div>

            {/* Live density indicator */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded ${densityOk ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {densityOk ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
              <span className="text-sm font-medium">
                Total Density: <strong>{density.toFixed(1)} kg/m³</strong>
                {!densityOk && ` — minimum ${DENSITY_MIN} kg/m³ required`}
              </span>
            </div>

            {apiError && <p className="text-red-500 text-sm">{apiError}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saveMix.isPending || !densityOk}>Save</button>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          message={`Delete design mix "${confirm.name}"?`}
          onCancel={() => setConfirm(null)}
          onConfirm={() => delMix.mutate(confirm.id)}
        />
      )}
    </div>
  );
}
