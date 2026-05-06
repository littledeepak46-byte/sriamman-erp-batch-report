import { useQuery } from "@tanstack/react-query";
import { ClipboardList, TrendingUp, Truck, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { format } from "date-fns";

export default function Dashboard() {
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get("/deliveries/stats").then((r) => r.data),
    retry: false,
  });

  const { data: recent } = useQuery({
    queryKey: ["recent-deliveries"],
    queryFn: () => api.get("/deliveries?limit=5").then((r) => r.data),
    retry: false,
  });

  const cards = [
    { label: "Today's Deliveries", value: stats?.today_count ?? "—", icon: ClipboardList, color: "text-blue-600" },
    { label: "Monthly Total (m³)", value: stats?.monthly_m3 ?? "—", icon: TrendingUp, color: "text-green-600" },
    { label: "Active Vehicles", value: stats?.active_vehicles ?? "—", icon: Truck, color: "text-orange-500" },
    { label: "DC This Month", value: stats?.dc_this_month ?? "—", icon: Calendar, color: "text-purple-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary">Dashboard</h1>
          <p className="text-sm text-gray-500">{format(new Date(), "EEEE, dd MMM yyyy")}</p>
        </div>
        <Link to="/delivery/new" className="btn-primary no-print">+ New Delivery</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <Icon size={28} className={color} />
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent deliveries */}
      <div className="card">
        <h2 className="font-semibold text-primary mb-3">Recent Deliveries</h2>
        {recent?.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2">DC Number</th>
                <th className="pb-2">Customer</th>
                <th className="pb-2">Grade</th>
                <th className="pb-2 text-right">Qty (m³)</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((d) => (
                <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 font-mono text-xs">{d.dc_number}</td>
                  <td className="py-2">{d.customer_name}</td>
                  <td className="py-2">{d.grade_name}</td>
                  <td className="py-2 text-right">{d.quantity_m3}</td>
                  <td className="py-2 text-gray-500">{d.delivery_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-400 text-sm">No deliveries yet. <Link to="/delivery/new" className="text-primary underline">Create one.</Link></p>
        )}
      </div>
    </div>
  );
}
