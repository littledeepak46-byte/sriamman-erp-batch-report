import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Download } from "lucide-react";
import { format } from "date-fns";
import api from "../../api/axios";

const TABS = ["Monthly DC Audit", "Cumulative Summary"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function exportCsv(headers, rows, filename) {
  const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ""}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename;
  a.click();
}

// ── Monthly DC Audit ──────────────────────────────────────────────────────────

function MonthlyDC() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [applied, setApplied] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["monthly-dc", applied],
    queryFn: () => api.get(`/reports/monthly-dc?year=${applied.year}&month=${applied.month}`).then(r => r.data),
  });

  const totalM3 = rows.reduce((s, r) => s + parseFloat(r.quantity_m3), 0);

  function doExport() {
    exportCsv(
      ["DC Number", "Date", "Customer", "Grade", "Plant", "Qty (m³)", "Vehicle"],
      rows.map(r => [r.dc_number, r.delivery_date, r.customer_name, r.grade_name, r.plant_type || "", r.quantity_m3, r.vehicle_number]),
      `DC_Audit_${applied.year}_${String(applied.month).padStart(2, "0")}.csv`
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card flex flex-wrap items-end gap-4">
        <div>
          <label className="label">Year</label>
          <select className="input w-28" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Month</label>
          <select className="input w-36" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <button className="btn-primary flex items-center gap-1"
          onClick={() => setApplied({ year, month })}>
          <Search size={14} /> Load
        </button>
        {rows.length > 0 && (
          <button className="btn-secondary flex items-center gap-1 ml-auto" onClick={doExport}>
            <Download size={14} /> Export CSV
          </button>
        )}
      </div>

      {/* Summary bar */}
      {rows.length > 0 && (
        <div className="flex gap-6 card py-3">
          <div><p className="text-2xl font-bold text-primary">{rows.length}</p><p className="text-xs text-gray-500">DC Numbers</p></div>
          <div className="border-l pl-6"><p className="text-2xl font-bold text-primary">{totalM3.toFixed(2)}</p><p className="text-xs text-gray-500">Total m³</p></div>
          <div className="border-l pl-6"><p className="text-sm font-medium text-gray-700">{MONTHS[applied.month - 1]} {applied.year}</p><p className="text-xs text-gray-500">Period</p></div>
        </div>
      )}

      {/* Table */}
      {isLoading ? <p className="text-gray-400">Loading…</p> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600">#</th>
                <th className="text-left px-4 py-3 text-gray-600">DC Number</th>
                <th className="text-left px-4 py-3 text-gray-600">Date</th>
                <th className="text-left px-4 py-3 text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 text-gray-600">Grade</th>
                <th className="text-left px-4 py-3 text-gray-600">Plant</th>
                <th className="text-right px-4 py-3 text-gray-600">Qty (m³)</th>
                <th className="text-left px-4 py-3 text-gray-600">Vehicle</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.dc_number} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-2 font-mono text-xs font-semibold text-primary">{r.dc_number}</td>
                  <td className="px-4 py-2 text-gray-500">{r.delivery_date}</td>
                  <td className="px-4 py-2">{r.customer_name}</td>
                  <td className="px-4 py-2">{r.grade_name}</td>
                  <td className="px-4 py-2 text-gray-500">{r.plant_type || "—"}</td>
                  <td className="px-4 py-2 text-right font-medium">{r.quantity_m3}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.vehicle_number}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No deliveries for {MONTHS[applied.month - 1]} {applied.year}.</td></tr>
              )}
              {rows.length > 0 && (
                <tr className="bg-blue-50 font-semibold">
                  <td colSpan={6} className="px-4 py-2 text-right text-primary">Total</td>
                  <td className="px-4 py-2 text-right text-primary">{totalM3.toFixed(2)}</td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Cumulative Summary ─────────────────────────────────────────────────────────

function CumulativeSummary() {
  const today = format(new Date(), "yyyy-MM-dd");
  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");

  const [filters, setFilters] = useState({ date_from: monthStart, date_to: today });
  const [applied, setApplied] = useState({ date_from: monthStart, date_to: today });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["cumulative-summary", applied],
    queryFn: () => api.get(`/reports/cumulative?date_from=${applied.date_from}&date_to=${applied.date_to}`).then(r => r.data),
  });

  // Group by customer for sub-totals
  const grouped = rows.reduce((acc, r) => {
    if (!acc[r.customer_name]) acc[r.customer_name] = [];
    acc[r.customer_name].push(r);
    return acc;
  }, {});

  const grandTotal = rows.reduce((s, r) => s + r.total_qty_m3, 0);

  function doExport() {
    exportCsv(
      ["Customer", "Site", "Grade", "Date", "Total Qty (m³)", "Deliveries"],
      rows.map(r => [r.customer_name, r.site_name, r.grade_name, r.delivery_date, r.total_qty_m3, r.delivery_count]),
      `Cumulative_${applied.date_from}_to_${applied.date_to}.csv`
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card flex flex-wrap items-end gap-4">
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
        <button className="btn-primary flex items-center gap-1"
          onClick={() => setApplied({ ...filters })}>
          <Search size={14} /> Load
        </button>
        {rows.length > 0 && (
          <button className="btn-secondary flex items-center gap-1 ml-auto" onClick={doExport}>
            <Download size={14} /> Export CSV
          </button>
        )}
      </div>

      {/* Summary */}
      {rows.length > 0 && (
        <div className="flex gap-6 card py-3">
          <div><p className="text-2xl font-bold text-primary">{grandTotal.toFixed(2)}</p><p className="text-xs text-gray-500">Total m³</p></div>
          <div className="border-l pl-6"><p className="text-2xl font-bold text-primary">{rows.length}</p><p className="text-xs text-gray-500">Records</p></div>
          <div className="border-l pl-6"><p className="text-2xl font-bold text-primary">{Object.keys(grouped).length}</p><p className="text-xs text-gray-500">Customers</p></div>
        </div>
      )}

      {/* Table — grouped by customer */}
      {isLoading ? <p className="text-gray-400">Loading…</p> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 text-gray-600">Site</th>
                <th className="text-left px-4 py-3 text-gray-600">Grade</th>
                <th className="text-left px-4 py-3 text-gray-600">Date</th>
                <th className="text-right px-4 py-3 text-gray-600">Total Qty (m³)</th>
                <th className="text-right px-4 py-3 text-gray-600">Deliveries</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([customerName, custRows]) => {
                const custTotal = custRows.reduce((s, r) => s + r.total_qty_m3, 0);
                return (
                  <>
                    {custRows.map((r, i) => (
                      <tr key={`${r.customer_name}-${r.delivery_date}-${r.grade_name}`}
                        className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">
                          {i === 0 ? <span className="font-medium">{r.customer_name}</span> : ""}
                        </td>
                        <td className="px-4 py-2 text-gray-500">{r.site_name}</td>
                        <td className="px-4 py-2">{r.grade_name}</td>
                        <td className="px-4 py-2 text-gray-500">{r.delivery_date}</td>
                        <td className="px-4 py-2 text-right font-medium">{r.total_qty_m3.toFixed(3)}</td>
                        <td className="px-4 py-2 text-right text-gray-500">{r.delivery_count}</td>
                      </tr>
                    ))}
                    {/* Customer sub-total */}
                    <tr className="bg-blue-50">
                      <td colSpan={4} className="px-4 py-1.5 text-xs font-semibold text-primary text-right">
                        {customerName} — Subtotal
                      </td>
                      <td className="px-4 py-1.5 text-right font-bold text-primary">{custTotal.toFixed(3)}</td>
                      <td className="px-4 py-1.5 text-right text-xs text-gray-500">{custRows.reduce((s, r) => s + r.delivery_count, 0)}</td>
                    </tr>
                  </>
                );
              })}
              {!rows.length && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No data for selected period.</td></tr>
              )}
              {rows.length > 0 && (
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={4} className="px-4 py-2 text-right text-primary">Grand Total</td>
                  <td className="px-4 py-2 text-right text-primary text-base">{grandTotal.toFixed(3)}</td>
                  <td className="px-4 py-2 text-right text-gray-500">{rows.reduce((s, r) => s + r.delivery_count, 0)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Reports() {
  const [tab, setTab] = useState("Monthly DC Audit");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-primary">Reports</h1>

      <div className="flex gap-1 border-b">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
              ${tab === t ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Monthly DC Audit" && <MonthlyDC />}
      {tab === "Cumulative Summary" && <CumulativeSummary />}
    </div>
  );
}
