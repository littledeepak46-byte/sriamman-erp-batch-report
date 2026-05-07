import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { useNavigate } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import { usePrintData } from "../../hooks/usePrintData";

// ── Schwing-Stetter style logo mark ──────────────────────────────────────────
function Logo() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" style={{ marginRight: "10px", flexShrink: 0 }}>
      <rect width="40" height="40" rx="4" fill="#1e3a5f" />
      <polygon points="8,32 20,8 32,32" fill="none" stroke="#f5a623" strokeWidth="3" />
      <line x1="20" y1="8" x2="20" y2="32" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

// ── Slip layout ───────────────────────────────────────────────────────────────
function Slip({ d }) {
  const dateStr = d.delivery_date
    ? new Date(d.delivery_date + "T00:00:00").toLocaleDateString("en-IN",
        { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";

  const timeStr = d.delivery_time
    ? (() => {
        const [h, m] = d.delivery_time.split(":");
        const hr = parseInt(h);
        return `${String(hr % 12 || 12).padStart(2, "0")}:${m} ${hr >= 12 ? "PM" : "AM"}`;
      })()
    : "";

  const loadedWt = d.gross_weight_kg ? Number(d.gross_weight_kg).toLocaleString("en-IN") : "—";
  const emptyWt  = d.empty_weight_kg ? Number(d.empty_weight_kg).toLocaleString("en-IN") : "—";
  const netWt    = d.net_weight_kg   ? Number(d.net_weight_kg).toLocaleString("en-IN")   : "—";

  return (
    <div style={{
      fontFamily: "Arial, sans-serif",
      maxWidth: "160mm",
      margin: "0 auto",
      border: "1px solid #ddd",
      padding: "0 0 8mm 0",
    }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        padding: "6mm 8mm 4mm",
        borderBottom: "2px solid #1e3a5f",
        marginBottom: "5mm",
      }}>
        <Logo />
        <div>
          <div style={{ fontSize: "14px", fontWeight: "bold", color: "#1e3a5f", letterSpacing: "0.3px" }}>
            SRI AMMAN CONSTRUCTION AND EQUIPMENTS
          </div>
          <div style={{ fontSize: "9px", color: "#555", marginTop: "1px" }}>
            CHINNAR, SHOOLAGIRI
          </div>
          <div style={{ fontSize: "9px", color: "#555" }}>
            KRISHNAGIRI-635117
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div style={{ padding: "0 8mm" }}>

        {/* Date / Time */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4mm", fontSize: "10px" }}>
          <tbody>
            <tr>
              <td style={{ width: "30%", paddingBottom: "4px", color: "#333" }}>Date:</td>
              <td style={{ width: "30%", paddingBottom: "4px", fontWeight: "500" }}>{dateStr}</td>
              <td style={{ width: "20%", paddingBottom: "4px", color: "#333" }}>Material:</td>
              <td style={{ paddingBottom: "4px", fontWeight: "500" }}>{d.material_name || "CONCRETE"}</td>
            </tr>
            <tr>
              <td style={{ paddingBottom: "4px", color: "#333" }}>Time:</td>
              <td style={{ paddingBottom: "4px", fontWeight: "500" }}>{timeStr}</td>
              <td style={{ paddingBottom: "4px", color: "#333" }}>Supplier:</td>
              <td style={{ paddingBottom: "4px", fontWeight: "500" }}>SRI AMMAN</td>
            </tr>
            <tr>
              <td style={{ paddingBottom: "4px", color: "#333" }}>Ticket Number:</td>
              <td style={{ paddingBottom: "4px", fontFamily: "monospace", fontWeight: "500" }}>
                WS-{String(d.id).padStart(5, "0")}
              </td>
              <td style={{ paddingBottom: "4px", color: "#333" }}>Driver:</td>
              <td style={{ paddingBottom: "4px", fontWeight: "bold", textTransform: "uppercase" }}>
                {d.driver_name || "—"}
              </td>
            </tr>
            <tr>
              <td style={{ paddingBottom: "4px", color: "#333" }}>Challan No:</td>
              <td style={{ paddingBottom: "4px", fontFamily: "monospace", fontWeight: "500", fontSize: "9px" }}>
                {d.dc_number}
              </td>
              <td style={{ color: "#333" }}>Grade of material:</td>
              <td style={{ fontWeight: "500" }}>{d.grade_name || "—"}</td>
            </tr>
            <tr>
              <td style={{ color: "#333" }}>Vehicle Number:</td>
              <td style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "11px" }}>
                {d.vehicle_number || "—"}
              </td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>

        {/* ── Weight Block ─────────────────────────────────────────────── */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4mm", fontSize: "11px" }}>
          <tbody>
            <tr>
              <td style={{ paddingBottom: "8px", color: "#444", width: "45%" }}>Loaded Weight:</td>
              <td style={{ paddingBottom: "8px", textAlign: "left" }}>
                <strong style={{ fontSize: "14px" }}>{loadedWt}</strong>
                <span style={{ fontSize: "11px", color: "#555", marginLeft: "6px" }}>kg</span>
              </td>
            </tr>
            <tr>
              <td style={{ paddingBottom: "8px", color: "#444" }}>Empty Weight:</td>
              <td style={{ paddingBottom: "8px" }}>
                {emptyWt}
                <span style={{ fontSize: "11px", color: "#555", marginLeft: "6px" }}>kg</span>
              </td>
            </tr>
            <tr>
              <td style={{ paddingBottom: "4px", color: "#444" }}>
                <strong style={{ fontSize: "12px" }}>Net Weight:</strong>
              </td>
              <td style={{ paddingBottom: "4px" }}>
                <strong style={{ fontSize: "16px", color: "#1e3a5f" }}>{netWt}</strong>
                <span style={{ fontSize: "11px", color: "#555", marginLeft: "6px" }}>kg</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Operator + Signatures ────────────────────────────────────── */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
          <tbody>
            <tr>
              <td style={{ paddingBottom: "4px", color: "#444", width: "45%" }}>Operator Name:</td>
              <td style={{ fontWeight: "500", textTransform: "uppercase" }}>
                {d.operator_name || "ADMIN"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Signature lines */}
        <table style={{ width: "100%", marginTop: "12mm" }}>
          <tbody>
            <tr>
              <td style={{ width: "45%", textAlign: "left" }}>
                <div style={{ borderTop: "1px solid #000", paddingTop: "3px", fontSize: "9px", color: "#555" }}>
                  Client Signature
                </div>
              </td>
              <td style={{ width: "10%" }}></td>
              <td style={{ width: "45%", textAlign: "right" }}>
                <div style={{ borderTop: "1px solid #000", paddingTop: "3px", fontSize: "9px", color: "#555" }}>
                  Operator Signature
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer line */}
      <div style={{ borderTop: "1px solid #ddd", marginTop: "6mm", padding: "3px 8mm 0",
        fontSize: "7px", color: "#bbb", textAlign: "center" }}>
        SRI AMMAN CONSTRUCTION AND EQUIPMENTS — CHINNAR, SHOOLAGIRI, KRISHNAGIRI-635117
      </div>
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
      {/* Toolbar */}
      <div className="no-print flex items-center gap-3 p-4 bg-white border-b sticky top-0 z-10">
        <button className="btn-secondary flex items-center gap-1" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Back
        </button>
        <span className="text-sm font-semibold text-primary">
          Weighment Slip — {data.dc_number}
        </span>
        <span className="text-xs text-gray-400">WS-{String(data.id).padStart(5, "0")}</span>
        <button className="btn-primary flex items-center gap-1 ml-auto" onClick={handlePrint}>
          <Printer size={15} /> Print / Save PDF
        </button>
      </div>

      {/* Print area */}
      <div ref={printRef} style={{ padding: "10mm", backgroundColor: "#fff" }}>
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
