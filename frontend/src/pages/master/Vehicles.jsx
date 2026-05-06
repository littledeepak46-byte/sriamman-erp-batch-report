import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import api from "../../api/axios";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";

const TABS = ["Vehicles", "Drivers"];

export default function Vehicles() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("Vehicles");
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles"], queryFn: () => api.get("/vehicles?active_only=false").then(r => r.data) });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: () => api.get("/drivers?active_only=false").then(r => r.data) });

  const saveVehicle = useMutation({
    mutationFn: d => d.id ? api.put(`/vehicles/${d.id}`, d) : api.post("/vehicles", d),
    onSuccess: () => { qc.invalidateQueries(["vehicles"]); setModal(null); },
  });
  const delVehicle = useMutation({
    mutationFn: id => api.delete(`/vehicles/${id}`),
    onSuccess: () => { qc.invalidateQueries(["vehicles"]); setConfirm(null); },
  });
  const saveDriver = useMutation({
    mutationFn: d => d.id ? api.put(`/drivers/${d.id}`, d) : api.post("/drivers", d),
    onSuccess: () => { qc.invalidateQueries(["drivers"]); setModal(null); },
  });
  const delDriver = useMutation({
    mutationFn: id => api.delete(`/drivers/${id}`),
    onSuccess: () => { qc.invalidateQueries(["drivers"]); setConfirm(null); },
  });

  function handleSubmit(e) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    if (tab === "Vehicles") saveVehicle.mutate(modal.data?.id ? { ...fd, id: modal.data.id } : fd);
    else saveDriver.mutate(modal.data?.id ? { ...fd, id: modal.data.id } : fd);
  }

  const isVehicle = tab === "Vehicles";
  const error = (saveVehicle.error || saveDriver.error)?.response?.data?.detail;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">Vehicles & Drivers</h1>
        <button className="btn-primary flex items-center gap-1"
          onClick={() => setModal({ data: isVehicle ? { vehicle_number: "", empty_weight_kg: "" } : { name: "", phone: "" } })}>
          <Plus size={16} /> Add {tab.slice(0, -1)}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t} ({t === "Vehicles" ? vehicles.length : drivers.length})
          </button>
        ))}
      </div>

      {/* Vehicles table */}
      {isVehicle ? (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600">Vehicle Number</th>
                <th className="text-left px-4 py-3 text-gray-600">Empty Weight (kg)</th>
                <th className="text-left px-4 py-3 text-gray-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium">{v.vehicle_number}</td>
                  <td className="px-4 py-3">{Number(v.empty_weight_kg).toLocaleString()} kg</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${v.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {v.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button className="text-gray-400 hover:text-primary" onClick={() => setModal({ data: v })}><Pencil size={15} /></button>
                      <button className="text-gray-400 hover:text-red-500" onClick={() => setConfirm({ type: "vehicle", id: v.id, name: v.vehicle_number })}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!vehicles.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No vehicles added yet.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600">Driver Name</th>
                <th className="text-left px-4 py-3 text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 text-gray-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {drivers.map(d => (
                <tr key={d.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3 text-gray-500">{d.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${d.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {d.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button className="text-gray-400 hover:text-primary" onClick={() => setModal({ data: d })}><Pencil size={15} /></button>
                      <button className="text-gray-400 hover:text-red-500" onClick={() => setConfirm({ type: "driver", id: d.id, name: d.name })}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!drivers.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No drivers added yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={`${modal.data?.id ? "Edit" : "Add"} ${tab.slice(0, -1)}`} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isVehicle ? (
              <>
                <div><label className="label">Vehicle Number *</label><input className="input font-mono uppercase" name="vehicle_number" defaultValue={modal.data?.vehicle_number} required /></div>
                <div><label className="label">Empty Weight (kg) *</label><input className="input" type="number" step="0.01" name="empty_weight_kg" defaultValue={modal.data?.empty_weight_kg} required /></div>
              </>
            ) : (
              <>
                <div><label className="label">Driver Name *</label><input className="input" name="name" defaultValue={modal.data?.name} required /></div>
                <div><label className="label">Phone</label><input className="input" name="phone" defaultValue={modal.data?.phone} /></div>
              </>
            )}
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary">Save</button>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          message={`Delete "${confirm.name}"?`}
          onCancel={() => setConfirm(null)}
          onConfirm={() => confirm.type === "vehicle" ? delVehicle.mutate(confirm.id) : delDriver.mutate(confirm.id)}
        />
      )}
    </div>
  );
}
