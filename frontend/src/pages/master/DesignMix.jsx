import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import api from "../../api/axios";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";

const DENSITY_MIN = 2410;

// step: "1" = integer (aggregates, cement, water), "0.1" = 1 decimal (admixtures)
const GROUPS = [
  {
    label: "Common Ingredients",
    subtitle: "Used in both M1.25 and CP30",
    color: "bg-blue-50 border-blue-200",
    headerColor: "text-blue-700",
    ingredients: [
      { key: "sand1",    label: "Sand 1",   step: "1" },
      { key: "sand2",    label: "Sand 2",   step: "1" },
      { key: "agg_20mm", label: "20 MM",    step: "1" },
      { key: "agg_12mm", label: "12 MM",    step: "1" },
      { key: "cem1",     label: "Cement 1", step: "1" },
      { key: "cem2",     label: "Cement 2", step: "1" },
      { key: "fly",      label: "Fly Ash",  step: "1" },
      { key: "wtr1",     label: "Water 1",  step: "1" },
      { key: "adx1",     label: "Admix 1",  step: "0.1" },
      { key: "adx2",     label: "Admix 2",  step: "0.1" },
    ],
  },
  {
    label: "M1.25 Extra Ingredients",
    subtitle: "Only for M1.25 plant batches",
    color: "bg-green-50 border-green-200",
    headerColor: "text-green-700",
    ingredients: [
      { key: "agg_6mm",  label: "6 MM",      step: "1" },
      { key: "agg6",     label: "Agg",        step: "1" },
      { key: "cem3",     label: "Cement 3",   step: "1" },
      { key: "cem4",     label: "Cement 4",   step: "1" },
      { key: "wtr2",     label: "Water 2",    step: "1" },
      { key: "wtr3",     label: "Water 3",    step: "1" },
      { key: "adx3",     label: "Admix 3",    step: "0.1" },
      { key: "adx4",     label: "Admix 4",    step: "0.1" },
      { key: "silica",   label: "Silica",     step: "1" },
    ],
  },
  {
    label: "CP30 Extra Ingredients",
    subtitle: "Only for CP30 plant batches",
    color: "bg-orange-50 border-orange-200",
    headerColor: "text-orange-700",
    ingredients: [
      { key: "moisture", label: "Moisture", step: "0.1" },
      { key: "filler",   label: "Filler",   step: "1" },
      { key: "col1",     label: "1",        step: "1" },
      { key: "col2",     label: "2",        step: "1" },
      { key: "col3",     label: "3",        step: "1" },
    ],
  },
];

const ALL_KEYS = GROUPS.flatMap(g => g.ingredients.map(i => i.key));

function emptyForm(customerId = "", gradeId = "") {
  const base = { customer_id: customerId, grade_id: gradeId };
  ALL_KEYS.forEach(k => { base[k] = "0"; });
  return base;
}

function computeDensity(values) {
  return ALL_KEYS.reduce((s, k) => s + (parseFloat(values[k]) || 0), 0);
}

export default function DesignMix() {
  const qc = useQueryClient();
  const [filterCustomerId, setFilterCustomerId] = useState("");
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [density, setDensity] = useState(0);
  const [apiError, setApiError] = useState("");

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.get("/customers").then(r => r.data),
  });

  const { data: materialTypes = [] } = useQuery({
    queryKey: ["material-types"],
    queryFn: () => api.get("/material-types").then(r => r.data),
  });

  const concreteType = materialTypes.find(m => m.name === "Concrete");
  const grades = concreteType?.grades?.filter(g => g.is_active) ?? [];

  const { data: mixes = [], isLoading } = useQuery({
    queryKey: ["design-mixes", filterCustomerId],
    queryFn: () => {
      const params = filterCustomerId ? `?customer_id=${filterCustomerId}` : "";
      return api.get(`/design-mixes${params}`).then(r => r.data);
    },
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
      ? { ...mix, customer_id: mix.customer_id, grade_id: mix.grade_id }
      : emptyForm(filterCustomerId, grades[0]?.id ?? "");
    setFormValues(initial);
    setDensity(computeDensity(initial));
    setApiError("");
    setModal({ data: mix });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...formValues };
    ALL_KEYS.forEach(k => { payload[k] = parseFloat(payload[k]) || 0; });
    payload.customer_id = parseInt(payload.customer_id);
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

      {/* Filter by customer */}
      <div className="flex items-center gap-3">
        <label className="label mb-0 whitespace-nowrap">Filter by Customer:</label>
        <select className="input max-w-xs" value={filterCustomerId}
          onChange={e => setFilterCustomerId(e.target.value)}>
          <option value="">All Customers</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {isLoading ? <p className="text-gray-400">Loading…</p> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 text-gray-600">Grade</th>
                <th className="text-left px-4 py-3 text-gray-600">Version</th>
                <th className="text-left px-4 py-3 text-gray-600">Total Density</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {mixes.map(m => (
                <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{m.customer_name}</td>
                  <td className="px-4 py-3">{m.grade_name}</td>
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
                      <button className="text-gray-400 hover:text-primary" onClick={() => openModal(m)}>
                        <Pencil size={15} />
                      </button>
                      <button className="text-gray-400 hover:text-red-500"
                        onClick={() => setConfirm({ id: m.id, name: `${m.customer_name} / ${m.grade_name}` })}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!mixes.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No design mixes found. Add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Design Mix Modal ──────────────────────────────────────────────── */}
      {modal && (
        <Modal
          title={modal.data?.id ? "Edit Design Mix" : "Add Design Mix"}
          onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Customer + Grade */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Customer *</label>
                <select className="input" value={formValues.customer_id || ""}
                  onChange={e => setFormValues(v => ({ ...v, customer_id: e.target.value }))} required>
                  <option value="">Select customer…</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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

            <p className="text-xs text-gray-400 -mt-2">
              This design mix applies to <strong>both M1.25 and CP30</strong> plants for the selected customer + grade.
            </p>

            {/* Ingredient groups */}
            {GROUPS.map(group => (
              <div key={group.label} className={`border rounded-lg p-4 space-y-3 ${group.color}`}>
                <div>
                  <p className={`text-sm font-semibold ${group.headerColor}`}>{group.label}</p>
                  <p className="text-xs text-gray-400">{group.subtitle}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {group.ingredients.map(ing => (
                    <div key={ing.key}>
                      <label className="text-xs text-gray-500 mb-0.5 block">{ing.label}</label>
                      <input
                        type="number" step={ing.step ?? "1"} min="0"
                        className="border rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                        value={formValues[ing.key] ?? "0"}
                        onChange={e => setFormValues(v => ({ ...v, [ing.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Live density indicator */}
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${densityOk ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {densityOk ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
              <span className="text-sm font-medium">
                Total Density: <strong>{density.toFixed(1)} kg/m³</strong>
                {!densityOk && <span className="text-xs ml-2">(minimum {DENSITY_MIN} kg/m³ required)</span>}
              </span>
            </div>

            {apiError && <p className="text-red-500 text-sm">{apiError}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saveMix.isPending || !densityOk}>
                {saveMix.isPending ? "Saving…" : "Save Design Mix"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          message={`Delete design mix for "${confirm.name}"?`}
          onCancel={() => setConfirm(null)}
          onConfirm={() => delMix.mutate(confirm.id)}
        />
      )}
    </div>
  );
}
