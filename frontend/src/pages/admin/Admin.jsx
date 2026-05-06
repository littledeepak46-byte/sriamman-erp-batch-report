import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import api from "../../api/axios";
import Modal from "../../components/Modal";
import { useAuth } from "../../context/AuthContext";

const ROLES = ["operator", "supervisor", "admin"];
const TABS = ["Users", "DC Sequences", "Batch Sequences"];

const ROLE_BADGE = {
  admin:      "bg-purple-100 text-purple-700",
  supervisor: "bg-blue-100 text-blue-700",
  operator:   "bg-gray-100 text-gray-600",
};

export default function Admin() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("Users");
  const [modal, setModal] = useState(null); // {type: "create"|"edit"|"password", data}
  const [apiError, setApiError] = useState("");

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.get("/admin/users").then(r => r.data),
  });
  const { data: dcSeqs = [] } = useQuery({
    queryKey: ["dc-sequences"],
    queryFn: () => api.get("/reports/sequences/dc").then(r => r.data),
    enabled: tab === "DC Sequences",
  });
  const { data: batchSeqs = [] } = useQuery({
    queryKey: ["batch-sequences"],
    queryFn: () => api.get("/reports/sequences/batch").then(r => r.data),
    enabled: tab === "Batch Sequences",
  });

  const createUser = useMutation({
    mutationFn: d => api.post("/admin/users", d),
    onSuccess: () => { qc.invalidateQueries(["admin-users"]); setModal(null); setApiError(""); },
    onError: e => setApiError(e.response?.data?.detail || "Error creating user."),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/admin/users/${id}`, d),
    onSuccess: () => { qc.invalidateQueries(["admin-users"]); setModal(null); setApiError(""); },
    onError: e => setApiError(e.response?.data?.detail || "Error updating user."),
  });

  const resetPassword = useMutation({
    mutationFn: ({ id, new_password }) => api.post(`/admin/users/${id}/reset-password`, { new_password }),
    onSuccess: () => { setModal(null); setApiError(""); },
    onError: e => setApiError(e.response?.data?.detail || "Error resetting password."),
  });

  function handleSubmit(e) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    setApiError("");
    if (modal.type === "create") {
      createUser.mutate({ username: fd.username, password: fd.password, role: fd.role });
    } else if (modal.type === "edit") {
      updateUser.mutate({ id: modal.data.id, role: fd.role, is_active: fd.is_active === "true" });
    } else {
      resetPassword.mutate({ id: modal.data.id, new_password: fd.new_password });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">Admin Panel</h1>
        {tab === "Users" && (
          <button className="btn-primary flex items-center gap-1"
            onClick={() => { setApiError(""); setModal({ type: "create", data: {} }); }}>
            <Plus size={16} /> Add User
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
              ${tab === t ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Users tab ──────────────────────────────────────────────────────── */}
      {tab === "Users" && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600">Username</th>
                <th className="text-left px-4 py-3 text-gray-600">Role</th>
                <th className="text-left px-4 py-3 text-gray-600">Status</th>
                <th className="px-4 py-3 text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {u.username}
                    {u.username === me?.username && (
                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">you</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[u.role] || ""}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active
                      ? <span className="flex items-center gap-1 text-green-600 text-xs"><ShieldCheck size={13} /> Active</span>
                      : <span className="flex items-center gap-1 text-red-500 text-xs"><ShieldOff size={13} /> Inactive</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button className="text-gray-400 hover:text-primary" title="Edit role / status"
                        onClick={() => { setApiError(""); setModal({ type: "edit", data: u }); }}>
                        <Pencil size={15} />
                      </button>
                      <button className="text-gray-400 hover:text-orange-500" title="Reset password"
                        onClick={() => { setApiError(""); setModal({ type: "password", data: u }); }}>
                        <KeyRound size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── DC Sequences tab ───────────────────────────────────────────────── */}
      {tab === "DC Sequences" && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600">Financial Year</th>
                <th className="text-left px-4 py-3 text-gray-600">Month</th>
                <th className="text-right px-4 py-3 text-gray-600">Last Number</th>
                <th className="text-left px-4 py-3 text-gray-600">Last DC Number</th>
              </tr>
            </thead>
            <tbody>
              {dcSeqs.map((r, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.year_code}</td>
                  <td className="px-4 py-3">{r.month_code}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.last_number}</td>
                  <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">{r.preview}</td>
                </tr>
              ))}
              {!dcSeqs.length && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No DC sequences yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Batch Sequences tab ────────────────────────────────────────────── */}
      {tab === "Batch Sequences" && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600">Plant Type</th>
                <th className="text-right px-4 py-3 text-gray-600">Last Batch Number</th>
                <th className="text-left px-4 py-3 text-gray-600">Next Batch</th>
              </tr>
            </thead>
            <tbody>
              {batchSeqs.map(r => (
                <tr key={r.plant_type} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-primary">{r.plant_type}</td>
                  <td className="px-4 py-3 text-right font-mono text-lg">{r.last_batch_number}</td>
                  <td className="px-4 py-3 font-mono text-gray-500">{r.last_batch_number + 1}</td>
                </tr>
              ))}
              {!batchSeqs.length && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No batch sequences yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      {modal && (
        <Modal
          title={modal.type === "create" ? "Add User" : modal.type === "edit" ? `Edit — ${modal.data.username}` : `Reset Password — ${modal.data.username}`}
          onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {modal.type === "create" && (
              <>
                <div><label className="label">Username *</label>
                  <input className="input" name="username" required autoFocus /></div>
                <div><label className="label">Password *</label>
                  <input className="input" type="password" name="password" required minLength={6} /></div>
                <div><label className="label">Role *</label>
                  <select className="input" name="role" defaultValue="operator">
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </>
            )}
            {modal.type === "edit" && (
              <>
                <div><label className="label">Role</label>
                  <select className="input" name="role" defaultValue={modal.data.role}>
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div><label className="label">Status</label>
                  <select className="input" name="is_active" defaultValue={String(modal.data.is_active)}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </>
            )}
            {modal.type === "password" && (
              <div><label className="label">New Password *</label>
                <input className="input" type="password" name="new_password" required minLength={6} autoFocus />
                <p className="text-xs text-gray-400 mt-1">Minimum 6 characters.</p>
              </div>
            )}
            {apiError && <p className="text-red-500 text-sm">{apiError}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary"
                disabled={createUser.isPending || updateUser.isPending || resetPassword.isPending}>
                {modal.type === "password" ? "Reset Password" : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
