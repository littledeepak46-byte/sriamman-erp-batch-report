import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, MapPin, ChevronDown, ChevronRight } from "lucide-react";
import api from "../../api/axios";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";

const EMPTY_CUSTOMER = {
  name: "", gst_number: "", billing_address_line1: "", billing_address_line2: "",
  billing_city: "", billing_state: "Tamil Nadu", billing_pincode: "",
};
const EMPTY_SITE = {
  site_name: "", door_no: "", street1: "", street2: "",
  city: "", state: "Tamil Nadu", pincode: "",
};

export default function Customers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // {type:"customer"|"site", data, customerId}
  const [confirm, setConfirm] = useState(null);
  const [expanded, setExpanded] = useState({});

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.get("/customers?active_only=false").then(r => r.data),
  });

  const saveCust = useMutation({
    mutationFn: (d) => d.id ? api.put(`/customers/${d.id}`, d) : api.post("/customers", d),
    onSuccess: () => { qc.invalidateQueries(["customers"]); setModal(null); },
  });
  const delCust = useMutation({
    mutationFn: (id) => api.delete(`/customers/${id}`),
    onSuccess: () => { qc.invalidateQueries(["customers"]); setConfirm(null); },
  });
  const saveSite = useMutation({
    mutationFn: ({ customerId, data }) =>
      data.id
        ? api.put(`/customers/${customerId}/sites/${data.id}`, data)
        : api.post(`/customers/${customerId}/sites`, data),
    onSuccess: (_, { customerId }) => {
      qc.invalidateQueries(["customers"]);
      qc.invalidateQueries(["sites", customerId]);
      setModal(null);
    },
  });
  const delSite = useMutation({
    mutationFn: ({ customerId, siteId }) => api.delete(`/customers/${customerId}/sites/${siteId}`),
    onSuccess: () => { qc.invalidateQueries(["customers"]); setConfirm(null); },
  });

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.gst_number || "").toLowerCase().includes(search.toLowerCase())
  );

  function toggle(id) { setExpanded(e => ({ ...e, [id]: !e[id] })); }

  function handleSubmit(e) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    if (modal.type === "customer") {
      saveCust.mutate(modal.data?.id ? { ...fd, id: modal.data.id } : fd);
    } else {
      saveSite.mutate({ customerId: modal.customerId, data: modal.data?.id ? { ...fd, id: modal.data.id } : fd });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">Customers</h1>
        <button className="btn-primary flex items-center gap-1" onClick={() => setModal({ type: "customer", data: EMPTY_CUSTOMER })}>
          <Plus size={16} /> Add Customer
        </button>
      </div>

      <input className="input max-w-xs" placeholder="Search by name or GST…" value={search} onChange={e => setSearch(e.target.value)} />

      {isLoading ? <p className="text-gray-400">Loading…</p> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 w-6"></th>
                <th className="text-left px-4 py-3 text-gray-600">Name</th>
                <th className="text-left px-4 py-3 text-gray-600 hidden md:table-cell">GST Number</th>
                <th className="text-left px-4 py-3 text-gray-600 hidden md:table-cell">City</th>
                <th className="text-left px-4 py-3 text-gray-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <>
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button onClick={() => toggle(c.id)} className="text-gray-400 hover:text-primary">
                        {expanded[c.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-500 font-mono text-xs">{c.gst_number || "—"}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-500">{c.billing_city || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button className="text-gray-400 hover:text-primary" onClick={() => setModal({ type: "site", customerId: c.id, data: EMPTY_SITE })}>
                          <MapPin size={15} title="Add site" />
                        </button>
                        <button className="text-gray-400 hover:text-primary" onClick={() => setModal({ type: "customer", data: c })}>
                          <Pencil size={15} />
                        </button>
                        <button className="text-gray-400 hover:text-red-500" onClick={() => setConfirm({ type: "customer", id: c.id, name: c.name })}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {expanded[c.id] && (
                    <tr key={`sites-${c.id}`} className="bg-blue-50 border-b">
                      <td></td>
                      <td colSpan={5} className="px-6 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-primary uppercase tracking-wide">Sites</span>
                          <button className="text-xs text-primary underline" onClick={() => setModal({ type: "site", customerId: c.id, data: EMPTY_SITE })}>
                            + Add Site
                          </button>
                        </div>
                        {c.sites?.length ? (
                          <div className="space-y-1">
                            {c.sites.map(s => (
                              <div key={s.id} className="flex items-center justify-between bg-white rounded px-3 py-2 text-sm">
                                <div>
                                  <span className="font-medium">{s.site_name}</span>
                                  <span className="text-gray-400 ml-2 text-xs">{[s.door_no, s.street1, s.city, s.pincode].filter(Boolean).join(", ")}</span>
                                </div>
                                <div className="flex gap-2">
                                  <button className="text-gray-400 hover:text-primary" onClick={() => setModal({ type: "site", customerId: c.id, data: s })}>
                                    <Pencil size={13} />
                                  </button>
                                  <button className="text-gray-400 hover:text-red-500" onClick={() => setConfirm({ type: "site", customerId: c.id, siteId: s.id, name: s.site_name })}>
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400">No sites added yet.</p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {!filtered.length && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No customers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Customer / Site Modal */}
      {modal && (
        <Modal title={modal.type === "customer" ? (modal.data?.id ? "Edit Customer" : "Add Customer") : (modal.data?.id ? "Edit Site" : "Add Site")} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            {modal.type === "customer" ? (
              <>
                <div><label className="label">Customer Name *</label><input className="input" name="name" defaultValue={modal.data?.name} required /></div>
                <div><label className="label">GST Number</label><input className="input font-mono" name="gst_number" defaultValue={modal.data?.gst_number} maxLength={15} /></div>
                <div><label className="label">Address Line 1</label><input className="input" name="billing_address_line1" defaultValue={modal.data?.billing_address_line1} /></div>
                <div><label className="label">Address Line 2</label><input className="input" name="billing_address_line2" defaultValue={modal.data?.billing_address_line2} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">City</label><input className="input" name="billing_city" defaultValue={modal.data?.billing_city} /></div>
                  <div><label className="label">Pincode</label><input className="input" name="billing_pincode" defaultValue={modal.data?.billing_pincode} /></div>
                </div>
                <div><label className="label">State</label><input className="input" name="billing_state" defaultValue={modal.data?.billing_state || "Tamil Nadu"} /></div>
              </>
            ) : (
              <>
                <div><label className="label">Site Name *</label><input className="input" name="site_name" defaultValue={modal.data?.site_name} required /></div>
                <div><label className="label">Door No</label><input className="input" name="door_no" defaultValue={modal.data?.door_no} /></div>
                <div><label className="label">Street</label><input className="input" name="street1" defaultValue={modal.data?.street1} /></div>
                <div><label className="label">Street 2</label><input className="input" name="street2" defaultValue={modal.data?.street2} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">City *</label><input className="input" name="city" defaultValue={modal.data?.city} required /></div>
                  <div><label className="label">Pincode</label><input className="input" name="pincode" defaultValue={modal.data?.pincode} /></div>
                </div>
                <div><label className="label">State</label><input className="input" name="state" defaultValue={modal.data?.state || "Tamil Nadu"} /></div>
              </>
            )}
            {(saveCust.error || saveSite.error) && (
              <p className="text-red-500 text-sm">{(saveCust.error || saveSite.error)?.response?.data?.detail || "Error saving."}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saveCust.isPending || saveSite.isPending}>Save</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm delete */}
      {confirm && (
        <ConfirmDialog
          message={`Delete "${confirm.name}"? This cannot be undone.`}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.type === "customer") delCust.mutate(confirm.id);
            else delSite.mutate({ customerId: confirm.customerId, siteId: confirm.siteId });
          }}
        />
      )}
    </div>
  );
}
