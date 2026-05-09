import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import api from "../../api/axios";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";

const TABS = ["Material Types & Grades", "Pumping Types", "Ingredient Labels", "Batch Tolerances"];

export default function Materials() {
  const [tab, setTab] = useState("Material Types & Grades");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-primary">Materials Management</h1>
      <div className="flex gap-1 border-b">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
              ${tab === t ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Material Types & Grades" && <MaterialTypesTab />}
      {tab === "Pumping Types" && <PumpingTypesTab />}
      {tab === "Ingredient Labels" && <IngredientLabelsTab />}
      {tab === "Batch Tolerances" && <BatchTolerancesTab />}
    </div>
  );
}

// ── Material Types & Grades ───────────────────────────────────────────────────
function MaterialTypesTab() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState({});
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState("");

  const { data: types = [] } = useQuery({
    queryKey: ["material-types"],
    queryFn: () => api.get("/material-types").then(r => r.data),
  });

  const addType = useMutation({
    mutationFn: d => api.post("/material-types", d),
    onSuccess: () => { qc.invalidateQueries(["material-types"]); setModal(null); setError(""); },
    onError: e => setError(e.response?.data?.detail || "Error"),
  });

  const addGrade = useMutation({
    mutationFn: d => api.post("/material-grades", d),
    onSuccess: () => { qc.invalidateQueries(["material-types"]); setModal(null); setError(""); },
    onError: e => setError(e.response?.data?.detail || "Error"),
  });

  const delGrade = useMutation({
    mutationFn: id => api.delete(`/material-grades/${id}`),
    onSuccess: () => { qc.invalidateQueries(["material-types"]); setConfirm(null); },
  });

  function handleSubmit(e) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    setError("");
    if (modal.type === "material") addType.mutate({ name: fd.name });
    else addGrade.mutate({ grade_name: fd.grade_name, material_type_id: modal.typeId });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button className="btn-primary flex items-center gap-1"
          onClick={() => { setError(""); setModal({ type: "material" }); }}>
          <Plus size={15} /> Add Material Type
        </button>
      </div>
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 w-6"></th>
              <th className="text-left px-4 py-3 text-gray-600">Material Type</th>
              <th className="text-left px-4 py-3 text-gray-600">Grades</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {types.map(t => (
              <>
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button onClick={() => setExpanded(e => ({ ...e, [t.id]: !e[t.id] }))}
                      className="text-gray-400 hover:text-primary">
                      {expanded[t.id] ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-gray-500">{t.grades?.filter(g => g.is_active).length || 0} grades</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-xs text-primary hover:underline"
                      onClick={() => { setError(""); setModal({ type: "grade", typeId: t.id, typeName: t.name }); }}>
                      + Add Grade
                    </button>
                  </td>
                </tr>
                {expanded[t.id] && (
                  <tr key={`g-${t.id}`} className="bg-gray-50 border-b">
                    <td></td>
                    <td colSpan={3} className="px-6 py-3">
                      <div className="flex flex-wrap gap-2">
                        {t.grades?.filter(g => g.is_active).map(g => (
                          <span key={g.id}
                            className="flex items-center gap-1 bg-white border rounded-full px-3 py-1 text-xs font-medium">
                            {g.grade_name}
                            <button className="text-gray-300 hover:text-red-500 ml-1"
                              onClick={() => setConfirm({ id: g.id, name: g.grade_name })}>
                              <Trash2 size={11} />
                            </button>
                          </span>
                        ))}
                        {!t.grades?.filter(g => g.is_active).length && (
                          <span className="text-xs text-gray-400">No grades yet.</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.type === "material" ? "Add Material Type" : `Add Grade to ${modal.typeName}`}
          onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {modal.type === "material"
              ? <div><label className="label">Material Type Name *</label>
                  <input className="input" name="name" required autoFocus /></div>
              : <div><label className="label">Grade Name *</label>
                  <input className="input" name="grade_name" placeholder="e.g. M25, M30OPC" required autoFocus /></div>
            }
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary">Add</button>
            </div>
          </form>
        </Modal>
      )}
      {confirm && (
        <ConfirmDialog message={`Remove grade "${confirm.name}"?`}
          onCancel={() => setConfirm(null)}
          onConfirm={() => delGrade.mutate(confirm.id)} />
      )}
    </div>
  );
}

// ── Pumping Types ─────────────────────────────────────────────────────────────
function PumpingTypesTab() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState("");

  const { data: types = [] } = useQuery({
    queryKey: ["pumping-types"],
    queryFn: () => api.get("/pumping-types").then(r => r.data),
  });

  const add = useMutation({
    mutationFn: d => api.post("/pumping-types", d),
    onSuccess: () => { qc.invalidateQueries(["pumping-types"]); setModal(null); setError(""); },
    onError: e => setError(e.response?.data?.detail || "Error"),
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button className="btn-primary flex items-center gap-1"
          onClick={() => { setError(""); setModal(true); }}>
          <Plus size={15} /> Add Pumping Type
        </button>
      </div>
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600">Pumping Type</th>
              <th className="text-left px-4 py-3 text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {types.map(t => (
              <tr key={t.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {t.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
            {!types.length && <tr><td colSpan={2} className="px-4 py-8 text-center text-gray-400">No pumping types.</td></tr>}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title="Add Pumping Type" onClose={() => setModal(null)}>
          <form onSubmit={e => { e.preventDefault(); add.mutate({ name: Object.fromEntries(new FormData(e.target)).name }); }}
            className="space-y-4">
            <div><label className="label">Name *</label>
              <input className="input" name="name" placeholder="e.g. Boom Pump 2" required autoFocus /></div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary">Add</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Ingredient Labels ─────────────────────────────────────────────────────────
function IngredientLabelsTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState("");

  const { data: labels = [] } = useQuery({
    queryKey: ["ingredient-labels"],
    queryFn: () => api.get("/ingredient-labels").then(r => r.data),
  });

  const update = useMutation({
    mutationFn: ({ key, label }) => api.put(`/ingredient-labels/${key}`, { label }),
    onSuccess: () => { qc.invalidateQueries(["ingredient-labels"]); setEditing(null); setError(""); },
    onError: e => setError(e.response?.data?.detail || "Error"),
  });

  const grouped = labels.reduce((acc, l) => {
    if (!acc[l.group]) acc[l.group] = [];
    acc[l.group].push(l);
    return acc;
  }, {});

  const GROUP_LABELS = { COMMON: "Common (Both Plants)", M125: "M1.25 Extra", CP30: "CP30 Extra" };
  const GROUP_COLORS = { COMMON: "text-blue-700", M125: "text-green-700", CP30: "text-orange-700" };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Rename ingredient labels used in the Design Mix form and Batch Reports.</p>
      {["COMMON", "M125", "CP30"].map(grp => (
        <div key={grp} className="card p-0 overflow-hidden">
          <div className={`px-4 py-2 bg-gray-50 border-b font-semibold text-sm ${GROUP_COLORS[grp]}`}>
            {GROUP_LABELS[grp]}
          </div>
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 text-gray-500 w-32">Key</th>
                <th className="text-left px-4 py-2 text-gray-500">Display Label</th>
                <th className="px-4 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {(grouped[grp] || []).map(l => (
                <tr key={l.key} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-gray-400">{l.key}</td>
                  <td className="px-4 py-2">
                    {editing === l.key ? (
                      <input className="input text-sm py-1" value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        autoFocus onKeyDown={e => e.key === "Escape" && setEditing(null)} />
                    ) : (
                      <span className="font-medium">{l.label}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {editing === l.key ? (
                      <div className="flex gap-2 justify-end">
                        <button className="text-xs text-primary font-medium hover:underline"
                          onClick={() => update.mutate({ key: l.key, label: editValue })}>Save</button>
                        <button className="text-xs text-gray-400 hover:text-gray-600"
                          onClick={() => setEditing(null)}>Cancel</button>
                      </div>
                    ) : (
                      <button className="text-gray-400 hover:text-primary"
                        onClick={() => { setEditing(l.key); setEditValue(l.label); setError(""); }}>
                        <Pencil size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

// ── Batch Tolerances Tab ──────────────────────────────────────────────────────
function BatchTolerancesTab() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["tolerances"],
    queryFn: () => api.get("/admin/tolerances").then(r => r.data),
  });
  const [editing, setEditing] = useState({});
  const [saving, setSaving] = useState({});

  async function save(key) {
    setSaving(s => ({ ...s, [key]: true }));
    try {
      await api.put(`/admin/tolerances/${key}`, { tolerance: parseFloat(editing[key]) });
      qc.invalidateQueries(["tolerances"]);
      setEditing(e => { const n = { ...e }; delete n[key]; return n; });
    } finally {
      setSaving(s => ({ ...s, [key]: false }));
    }
  }

  if (isLoading) return <div className="p-4 text-gray-400">Loading…</div>;

  return (
    <div className="card">
      <p className="text-sm text-gray-500 mb-3">
        Tolerance used in <strong>RANDBETWEEN(target − tol, target + tol)</strong> formula for auto-generated actual weights in the Batch Report.
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-2 pr-4">Material</th>
            <th className="pb-2 pr-4">Key</th>
            <th className="pb-2 w-36">Tolerance (±&nbsp;kg)</th>
            <th className="pb-2 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const val = editing[row.key] !== undefined ? editing[row.key] : row.tolerance;
            const changed = editing[row.key] !== undefined;
            return (
              <tr key={row.key} className="border-b hover:bg-gray-50">
                <td className="py-2 pr-4 font-medium">{row.label}</td>
                <td className="py-2 pr-4 font-mono text-xs text-gray-400">{row.key}</td>
                <td className="py-2 pr-4">
                  <input
                    className="input w-full"
                    type="number" min="0" step="0.1"
                    value={val}
                    onChange={e => setEditing(ed => ({ ...ed, [row.key]: e.target.value }))}
                  />
                </td>
                <td className="py-2">
                  {changed && (
                    <button
                      className="btn-primary text-xs px-3 py-1"
                      disabled={saving[row.key]}
                      onClick={() => save(row.key)}>
                      {saving[row.key] ? "…" : "Save"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
