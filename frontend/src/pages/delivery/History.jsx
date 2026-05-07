import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, Printer, FlaskConical, Scale, Download } from "lucide-react";
import api from "../../api/axios";

export default function History() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ dc_number: "", date_from: "", date_to: "", plant_type: "" });
  const [applied, setApplied] = useState({});

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ["deliveries", applied],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "100" });
      if (applied.dc_number) params.set("dc_number", applied.dc_number);
      if (applied.date_from) params.set("date_from", applied.date_from);
      if (applied.date_to) params.set("date_to", applied.date_to);
      if (applied.plant_type) params.set("plant_type", applied.plant_type);
      return api.get(`/deliveries?${params}`).then(r => r.data);
    },
  });

  function applyFilters(e) {
    e.preventDefault();
    setApplied({ ...filters });
  }

  function exportCsv() {
    const headers = ["DC Number", "Date", "Customer", "Site", "Grade", "Plant", "Qty (m³)", "Cum Qty", "Vehicle", "Driver", "Net Weight (kg)"];
    const rows = deliveries.map(d => [
      d.dc_number, d.delivery_date, d.customer_name, d.site_name,
      d.grade_name, d.plant_type || "", d.quantity_m3, d.cumulative_qty_m3 || "",
      d.vehicle_number, d.driver_name, d.net_weight_kg || "",
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `deliveries_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">Delivery History</h1>
        <button className="btn-secondary text-sm" onClick={exportCsv} disabled={!deliveries.length}>Export CSV</button>
      </div>

      {/* Filters */}
      <form onSubmit={applyFilters} className="card flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">DC Number</label>
          <input className="input w-44" placeholder="Search…" value={filters.dc_number}
            onChange={e => setFilters(f => ({ ...f, dc_number: e.target.value }))} />
        </div>
        <div>
          <label className="label">Date From</label>
          <input className="input" type="date" value={filters.date_from}
            onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
        </div>
        <div>
          <label className="label">Date To</label>
          <input className="input" type="date" value={filters.date_to}
            onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
        </div>
        <div>
          <label className="label">Plant Type</label>
          <select className="input w-32" value={filters.plant_type}
            onChange={e => setFilters(f => ({ ...f, plant_type: e.target.value }))}>
            <option value="">All</option>
            <option>M1.25</option>
            <option>CP30</option>
          </select>
        </div>
        <button type="submit" className="btn-primary flex items-center gap-1">
          <Search size={14} /> Search
        </button>
      </form>

      {/* Results */}
      {isLoading ? <p className="text-gray-400">Loading…</p> : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600">DC Number</th>
                <th className="text-left px-4 py-3 text-gray-600">Date</th>
                <th className="text-left px-4 py-3 text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 text-gray-600">Grade</th>
                <th className="text-left px-4 py-3 text-gray-600">Plant</th>
                <th className="text-right px-4 py-3 text-gray-600">Qty (m³)</th>
                <th className="text-right px-4 py-3 text-gray-600">Cum (m³)</th>
                <th className="text-left px-4 py-3 text-gray-600">Vehicle</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map(d => (
                <tr key={d.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-primary font-semibold">{d.dc_number}</td>
                  <td className="px-4 py-2 text-gray-500">{d.delivery_date}</td>
                  <td className="px-4 py-2">{d.customer_name}</td>
                  <td className="px-4 py-2">{d.grade_name}</td>
                  <td className="px-4 py-2 text-gray-500">{d.plant_type || "—"}</td>
                  <td className="px-4 py-2 text-right font-medium">{d.quantity_m3}</td>
                  <td className="px-4 py-2 text-right text-gray-500">{d.cumulative_qty_m3 ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs">{d.vehicle_number}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button className="text-gray-400 hover:text-primary" title="Print Delivery Challan"
                        onClick={() => navigate(`/delivery/${d.id}/challan`)}>
                        <Printer size={14} />
                      </button>
                      {d.plant_type && d.plant_type !== "None" && (
                        <button className="text-gray-400 hover:text-green-600" title="Print Batch Report"
                          onClick={() => navigate(`/delivery/${d.id}/batch-report`)}>
                          <FlaskConical size={14} />
                        </button>
                      )}
                      {d.generate_weighment === 1 && (
                        <button className="text-gray-400 hover:text-blue-600" title="Print Weighment Slip"
                          onClick={() => navigate(`/delivery/${d.id}/weighment`)}>
                          <Scale size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!deliveries.length && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No deliveries found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
