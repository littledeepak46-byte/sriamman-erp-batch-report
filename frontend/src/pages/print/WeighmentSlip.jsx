import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { useNavigate } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import { usePrintData } from "../../hooks/usePrintData";

const WEIGH_COMPANY = {
  name: "SRI AMMAN CONSTRUCTION AND EQUIPMENTS",
  address: "Chinnar, Shoolagiri, Krishnagiri – 635117",
};

function Row2({ label, value, bold }) {
  return (
    <tr>
      <td style={{ padding: "4px 8px", width: "40%", color: "#555", fontSize: "10px", borderBottom: "1px solid #eee" }}>{label}</td>
      <td style={{ padding: "4px 8px", fontSize: "10px", borderBottom: "1px solid #eee", fontWeight: bold ? "bold" : "normal" }}>
        {value || "—"}
      </td>
    </tr>
  );
}

function WeighSlip({ d }) {
  const dateStr = d.delivery_date
    ? new Date(d.delivery_date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "";
  const timeStr = d.delivery_time ? d.delivery_time.slice(0, 5) : "";

  return (
    <div style={{ border: "2px solid #1e3a5f", borderRadius: "4px", padding: "12px", maxWidth: "140mm", margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
      {/* Header */}
      <div style={{ textAlign: "center", borderBottom: "2px solid #1e3a5f", paddingBottom: "8px", marginBottom: "10px" }}>
        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#1e3a5f" }}>{WEIGH_COMPANY.name}</div>
        <div style={{ fontSize: "9px", color: "#666" }}>{WEIGH_COMPANY.address}</div>
        <div style={{ fontSize: "11px", fontWeight: "bold", marginTop: "4px", letterSpacing: "2px", color: "#333" }}>WEIGHMENT SLIP</div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <Row2 label="Date" value={dateStr} />
          <Row2 label="Time" value={timeStr} />
          <Row2 label="Ticket Number" value={`WS-${String(d.id).padStart(5, "0")}`} />
          <Row2 label="Challan No" value={d.dc_number} bold />
          <Row2 label="Vehicle Number" value={d.vehicle_number} bold />
          <Row2 label="Driver" value={d.driver_name} />
          <Row2 label="Material" value={d.material_name} />
          <Row2 label="Supplier" value="Sri Amman Ready Mix Concrete" />
          <Row2 label="Grade of Material" value={d.grade_name} />
        </tbody>
      </table>

      {/* Weight block */}
      <div style={{ border: "1px solid #1e3a5f", borderRadius: "3px", margin: "10px 0", overflow: "hidden" }}>
        <div style={{ backgroundColor: "#1e3a5f", color: "#fff", padding: "4px 8px", fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
          Weight Details
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #eee", color: "#555", fontSize: "10px" }}>Gross Weight</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #eee", fontWeight: "bold", fontSize: "10px", textAlign: "right" }}>
                {d.gross_weight_kg ? `${Number(d.gross_weight_kg).toLocaleString()} kg` : "—"}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #eee", color: "#555", fontSize: "10px" }}>Empty Weight</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #eee", fontSize: "10px", textAlign: "right" }}>
                {d.empty_weight_kg ? `${Number(d.empty_weight_kg).toLocaleString()} kg` : "—"}
              </td>
            </tr>
            <tr style={{ backgroundColor: "#f0f4f8" }}>
              <td style={{ padding: "8px", color: "#1e3a5f", fontWeight: "bold", fontSize: "11px" }}>Net Weight</td>
              <td style={{ padding: "8px", fontWeight: "bold", fontSize: "14px", color: "#1e3a5f", textAlign: "right" }}>
                {d.net_weight_kg ? `${Number(d.net_weight_kg).toLocaleString()} kg` : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signatures */}
      <table style={{ width: "100%", marginTop: "20px" }}>
        <tbody>
          <tr>
            <td style={{ width: "50%", textAlign: "center" }}>
              <div style={{ borderTop: "1px solid #000", marginTop: "24px", paddingTop: "3px", fontSize: "8px", color: "#555" }}>
                Receiver Signature
              </div>
            </td>
            <td style={{ width: "50%", textAlign: "center" }}>
              <div style={{ borderTop: "1px solid #000", marginTop: "24px", paddingTop: "3px", fontSize: "8px", color: "#555" }}>
                Weigh Bridge Operator
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function WeighmentSlip() {
  const navigate = useNavigate();
  const { data, isLoading, error } = usePrintData();
  const printRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: data ? `WeighSlip_${data.dc_number}` : "Weighment_Slip",
  });

  if (isLoading) return <div className="p-8 text-gray-400">Loading…</div>;
  if (error) return <div className="p-8 text-red-500">Failed to load delivery data.</div>;

  return (
    <div>
      <div className="no-print flex items-center gap-3 p-4 bg-white border-b sticky top-0 z-10">
        <button className="btn-secondary flex items-center gap-1" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Back
        </button>
        <span className="text-sm font-semibold text-primary">Weighment Slip — {data.dc_number}</span>
        <button className="btn-primary flex items-center gap-1 ml-auto" onClick={handlePrint}>
          <Printer size={15} /> Print / Save PDF
        </button>
      </div>

      <div ref={printRef} style={{ padding: "12mm", backgroundColor: "#fff" }}>
        <style>{`
          @media print {
            @page { size: A5 portrait; margin: 6mm; }
            body { margin: 0; }
          }
        `}</style>
        <WeighSlip d={data} />
      </div>
    </div>
  );
}
