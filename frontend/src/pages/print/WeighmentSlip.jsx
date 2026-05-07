import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { useNavigate } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import { usePrintData } from "../../hooks/usePrintData";

// ── Schwing Stetter style logo ────────────────────────────────────────────────
function Logo({ size = 60 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60">
      <rect width="60" height="60" fill="white" />
      <polygon points="8,52 30,8 52,52 44,52 30,22 16,52" fill="#2d7a2d" />
      <polygon points="16,52 30,24 44,52 37,52 30,32 23,52" fill="white" />
    </svg>
  );
}

// ── Slip Template (matches sample PDF exactly) ────────────────────────────────
function Slip({ d }) {
  // Date format: DD-MM-YYYY
  const dateStr = d.delivery_date
    ? (() => {
        const dt = new Date(d.delivery_date + "T00:00:00");
        const dd = String(dt.getDate()).padStart(2, "0");
        const mm = String(dt.getMonth() + 1).padStart(2, "0");
        const yyyy = dt.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
      })()
    : "—";

  // Time: 05:21 AM format
  const timeStr = d.delivery_time
    ? (() => {
        const [h, m] = d.delivery_time.split(":");
        const hr = parseInt(h);
        const ampm = hr >= 12 ? "PM" : "AM";
        const h12 = String(hr % 12 || 12).padStart(2, "0");
        return `${h12}:${m} ${ampm}`;
      })()
    : "—";

  const loadedWt = d.gross_weight_kg ? Number(d.gross_weight_kg).toLocaleString("en-IN") : "";
  const emptyWt  = d.empty_weight_kg ? Number(d.empty_weight_kg).toLocaleString("en-IN") : "";
  const netWt    = d.net_weight_kg   ? Number(d.net_weight_kg).toLocaleString("en-IN")   : "";
  const ticketNo = `WS-${String(d.id || 0).padStart(5, "0")}`;

  const R = { fontFamily: "Arial, sans-serif" };
  const labelStyle = { ...R, fontSize: "10px", color: "#333", paddingBottom: "6px" };
  const valueStyle = { ...R, fontSize: "10px", fontWeight: "500", paddingBottom: "6px" };
  const bigStyle   = { ...R, fontSize: "13px", fontWeight: "bold" };

  return (
    <div style={{ ...R, maxWidth: "175mm", margin: "0 auto", border: "1px solid #ccc" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", padding: "5mm 6mm 4mm", borderBottom: "2px solid #000" }}>
        <Logo size={58} />
        <div style={{ marginLeft: "8px" }}>
          <div style={{ ...R, fontSize: "16px", fontWeight: "bold" }}>
            SRI AMMAN CONSTRUCTION AND EQUIPMENTS
          </div>
          <div style={{ ...R, fontSize: "10px", marginTop: "2px" }}>CHINNAR ,SHOOLAGIRI</div>
          <div style={{ ...R, fontSize: "10px" }}>KRISHNAGIRI-635117</div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div style={{ padding: "4mm 6mm" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {/* Row 1 */}
            <tr>
              <td style={labelStyle}>Date:</td>
              <td style={valueStyle}>{dateStr}</td>
              <td style={{ ...labelStyle, width: "10px" }}></td>
              <td style={labelStyle}></td>
              <td style={valueStyle}></td>
            </tr>
            {/* Row 2 */}
            <tr>
              <td style={labelStyle}>Time:</td>
              <td style={valueStyle}>{timeStr}</td>
              <td></td>
              <td style={labelStyle}></td>
              <td style={valueStyle}></td>
            </tr>
            {/* Row 3 */}
            <tr>
              <td style={labelStyle}>Ticket Number:</td>
              <td style={{ ...valueStyle, fontFamily: "monospace" }}>{ticketNo}</td>
              <td></td>
              <td style={labelStyle}>Material:</td>
              <td style={valueStyle}>{d.material_name?.toUpperCase() || "CONCRETE"}</td>
            </tr>
            {/* Row 4 */}
            <tr>
              <td style={labelStyle}>Challan No:</td>
              <td style={{ ...valueStyle, fontSize: "9px", fontFamily: "monospace" }}>{d.dc_number}</td>
              <td></td>
              <td style={labelStyle}>Supplier:</td>
              <td style={valueStyle}>SRI AMMAN</td>
            </tr>
            {/* Row 5 */}
            <tr>
              <td style={labelStyle}>Vehicle Number:</td>
              <td style={{ ...valueStyle, fontWeight: "bold", fontSize: "11px" }}>
                {d.vehicle_number?.toUpperCase() || "—"}
              </td>
              <td></td>
              <td style={labelStyle}>Driver:</td>
              <td style={{ ...valueStyle, textTransform: "uppercase" }}>{d.driver_name || "—"}</td>
            </tr>
          </tbody>
        </table>

        {/* ── Weight rows ───────────────────────────────────────────────── */}
        <div style={{ margin: "3mm 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {/* Loaded Weight */}
              <tr>
                <td style={{ ...labelStyle, width: "38%", paddingBottom: "8px" }}>Loaded Weight:</td>
                <td style={{ paddingBottom: "8px" }}>
                  <span style={bigStyle}>{loadedWt || "—"}</span>
                  <span style={{ ...R, fontSize: "10px", marginLeft: "8px" }}>kg</span>
                </td>
                <td style={{ width: "5%" }}></td>
                <td style={{ ...labelStyle, width: "25%" }}></td>
                <td></td>
              </tr>
              {/* Empty Weight */}
              <tr>
                <td style={{ ...labelStyle, paddingBottom: "8px" }}>Empty Weight:</td>
                <td style={{ paddingBottom: "8px" }}>
                  <span style={{ ...R, fontSize: "11px" }}>{emptyWt || "—"}</span>
                  <span style={{ ...R, fontSize: "10px", marginLeft: "8px" }}>kg</span>
                </td>
                <td></td>
                <td style={labelStyle}>Grade of material:</td>
                <td style={valueStyle}>{d.grade_name || ""}</td>
              </tr>
              {/* Net Weight */}
              <tr>
                <td style={{ ...labelStyle, paddingBottom: "8px" }}>
                  <strong style={{ fontSize: "11px" }}>Net Weight:</strong>
                </td>
                <td style={{ paddingBottom: "8px" }}>
                  <strong style={{ ...R, fontSize: "15px" }}>{netWt || "—"}</strong>
                  <span style={{ ...R, fontSize: "10px", marginLeft: "8px" }}>kg</span>
                </td>
                <td></td>
                <td style={labelStyle}>Operator&nbsp; Name:</td>
                <td style={{ ...valueStyle, textTransform: "uppercase" }}>
                  {d.operator_name?.toUpperCase() || "ADMIN"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Signatures ─────────────────────────────────────────────────── */}
        <table style={{ width: "100%", marginTop: "8mm" }}>
          <tbody>
            <tr>
              <td style={{ width: "40%", ...labelStyle }}>Client Signature</td>
              <td style={{ width: "20%" }}></td>
              <td style={{ width: "40%", ...labelStyle, textAlign: "right" }}>Operator Signature</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Bottom border line ────────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid #ccc", marginTop: "2mm" }}></div>
    </div>
  );
}

// ── Page component ────────────────────────────────────────────────────────────
export default function WeighmentSlip() {
  const navigate = useNavigate();
  const { data, isLoading, error } = usePrintData();
  const printRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: data ? `WeighSlip_${data.dc_number}` : "Weighment_Slip",
  });

  if (isLoading) return <div className="p-8 text-gray-400">Loading…</div>;
  if (error)     return <div className="p-8 text-red-500">Failed to load delivery data.</div>;

  return (
    <div>
      <div className="no-print flex items-center gap-3 p-4 bg-white border-b sticky top-0 z-10">
        <button className="btn-secondary flex items-center gap-1" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Back
        </button>
        <span className="text-sm font-semibold text-primary">
          Weighment Slip — {data.dc_number}
        </span>
        <button className="btn-primary flex items-center gap-1 ml-auto" onClick={handlePrint}>
          <Printer size={15} /> Print / Save PDF
        </button>
      </div>

      <div ref={printRef} style={{ padding: "8mm", backgroundColor: "#fff" }}>
        <style>{`
          @media print {
            @page { size: A5 portrait; margin: 4mm; }
            body { margin: 0; }
            .no-print { display: none !important; }
          }
        `}</style>
        <Slip d={data} />
      </div>
    </div>
  );
}
