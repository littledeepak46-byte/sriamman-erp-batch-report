import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { useNavigate } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import { usePrintData } from "../../hooks/usePrintData";

const COMPANY = {
  name: "SRI AMMAN READY MIX CONCRETE",
  address: "198/1, Chennapalli Post, Chinnar, Krishnagiri, Tamil Nadu – 635117",
  phone: "9952152691",
  email: "sriammanreadymix@gmail.com",
  gstin: "33AADFS1234F1ZX",
};

function ChallanCopy({ d }) {
  const dateStr = d.delivery_date ? new Date(d.delivery_date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
  const timeStr = d.delivery_time ? d.delivery_time.slice(0, 5) : "";

  return (
    <div style={{ border: "1px solid #000", padding: "10px", fontSize: "10px", fontFamily: "Arial, sans-serif", width: "100%", boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "6px", marginBottom: "6px" }}>
        <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1e3a5f" }}>{COMPANY.name}</div>
        <div style={{ fontSize: "9px", color: "#555" }}>{COMPANY.address}</div>
        <div style={{ fontSize: "9px", color: "#555" }}>Ph: {COMPANY.phone} | {COMPANY.email}</div>
        <div style={{ fontSize: "11px", fontWeight: "bold", marginTop: "4px", letterSpacing: "1px" }}>DELIVERY CHALLAN</div>
      </div>

      {/* DC No & Date */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6px" }}>
        <tbody>
          <tr>
            <td style={{ width: "50%", paddingRight: "8px" }}>
              <Row label="DC No" value={d.dc_number} mono />
            </td>
            <td style={{ width: "25%" }}>
              <Row label="Date" value={dateStr} />
            </td>
            <td style={{ width: "25%" }}>
              <Row label="Time" value={timeStr} />
            </td>
          </tr>
        </tbody>
      </table>

      {/* Billing & Site */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6px" }}>
        <tbody>
          <tr>
            <td style={{ width: "50%", verticalAlign: "top", paddingRight: "8px" }}>
              <LabelBlock label="Bill To">
                <div style={{ fontWeight: "bold" }}>{d.customer_name}</div>
                <div>{d.billing_address}</div>
                <div>GSTIN: {d.customer_gst || "—"}</div>
              </LabelBlock>
            </td>
            <td style={{ width: "50%", verticalAlign: "top" }}>
              <LabelBlock label="Site Address">
                <div style={{ fontWeight: "bold" }}>{d.site_name}</div>
                <div>{d.site_full_address}</div>
              </LabelBlock>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Vehicle & Driver */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6px" }}>
        <tbody>
          <tr>
            <td style={{ width: "33%", paddingRight: "4px" }}><Row label="Vehicle No" value={d.vehicle_number} mono /></td>
            <td style={{ width: "34%", paddingRight: "4px" }}><Row label="Driver" value={d.driver_name} /></td>
            <td style={{ width: "33%" }}><Row label="Plant" value={d.plant_type || "—"} /></td>
          </tr>
        </tbody>
      </table>

      {/* Items table */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000", marginBottom: "6px", fontSize: "9px" }}>
        <thead>
          <tr style={{ backgroundColor: "#1e3a5f", color: "#fff" }}>
            {["Material", "Grade", "Pumping", "Qty (m³)", "Cum Qty (m³)"].map(h => (
              <th key={h} style={{ padding: "3px 5px", textAlign: "left", border: "1px solid #000" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={TD}>{d.material_name}</td>
            <td style={TD}>{d.grade_name}</td>
            <td style={TD}>{d.pumping_name || "—"}</td>
            <td style={{ ...TD, textAlign: "right", fontWeight: "bold" }}>{d.quantity_m3}</td>
            <td style={{ ...TD, textAlign: "right" }}>{d.cumulative_qty_m3 ?? "—"}</td>
          </tr>
        </tbody>
      </table>

      {/* Weights */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px" }}>
        <tbody>
          <tr>
            <td style={{ width: "33%", paddingRight: "4px" }}><Row label="Gross Wt (kg)" value={d.gross_weight_kg ? Number(d.gross_weight_kg).toLocaleString() : "—"} /></td>
            <td style={{ width: "33%", paddingRight: "4px" }}><Row label="Empty Wt (kg)" value={d.empty_weight_kg ? Number(d.empty_weight_kg).toLocaleString() : "—"} /></td>
            <td style={{ width: "34%" }}><Row label="Net Wt (kg)" value={d.net_weight_kg ? Number(d.net_weight_kg).toLocaleString() : "—"} /></td>
          </tr>
        </tbody>
      </table>

      {/* Signature blocks */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderTop: "1px solid #000", paddingTop: "6px" }}>
        <tbody>
          <tr>
            <td style={{ width: "50%", textAlign: "center", paddingTop: "24px", borderRight: "1px solid #ccc" }}>
              <div style={{ borderTop: "1px solid #000", marginTop: "20px", paddingTop: "3px", fontSize: "9px" }}>Customer Signature with Seal</div>
            </td>
            <td style={{ width: "50%", textAlign: "center", paddingTop: "24px" }}>
              <div style={{ borderTop: "1px solid #000", marginTop: "20px", paddingTop: "3px", fontSize: "9px" }}>Authorised Signatory</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const TD = { padding: "3px 5px", border: "1px solid #000" };

function Row({ label, value, mono }) {
  return (
    <div style={{ marginBottom: "2px" }}>
      <span style={{ fontSize: "8px", color: "#777", textTransform: "uppercase" }}>{label}: </span>
      <span style={{ fontWeight: "bold", fontFamily: mono ? "monospace" : "inherit" }}>{value || "—"}</span>
    </div>
  );
}

function LabelBlock({ label, children }) {
  return (
    <div style={{ border: "1px solid #ccc", padding: "4px", borderRadius: "2px" }}>
      <div style={{ fontSize: "8px", color: "#777", textTransform: "uppercase", marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "9px" }}>{children}</div>
    </div>
  );
}

export default function DeliveryChallan() {
  const navigate = useNavigate();
  const { data, isLoading, error } = usePrintData();
  const printRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: data ? `DC_${data.dc_number}` : "Delivery_Challan",
  });

  if (isLoading) return <div className="p-8 text-gray-400">Loading…</div>;
  if (error) return <div className="p-8 text-red-500">Failed to load delivery data.</div>;

  return (
    <div>
      {/* Toolbar — hidden on print */}
      <div className="no-print flex items-center gap-3 p-4 bg-white border-b sticky top-0 z-10">
        <button className="btn-secondary flex items-center gap-1" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Back
        </button>
        <span className="text-sm font-mono font-semibold text-primary">{data.dc_number}</span>
        <button className="btn-primary flex items-center gap-1 ml-auto" onClick={handlePrint}>
          <Printer size={15} /> Print / Save PDF
        </button>
      </div>

      {/* 2-up A4 preview */}
      <div ref={printRef} style={{ padding: "10mm", backgroundColor: "#fff", maxWidth: "210mm", margin: "0 auto" }}>
        <style>{`
          @media print {
            @page { size: A4 portrait; margin: 8mm; }
            body { margin: 0; }
          }
        `}</style>
        {/* Top copy */}
        <ChallanCopy d={data} />
        {/* Divider */}
        <div style={{ borderTop: "1px dashed #aaa", margin: "6mm 0", textAlign: "center", fontSize: "8px", color: "#aaa" }}>— Cut here —</div>
        {/* Bottom copy */}
        <ChallanCopy d={data} />
      </div>
    </div>
  );
}
