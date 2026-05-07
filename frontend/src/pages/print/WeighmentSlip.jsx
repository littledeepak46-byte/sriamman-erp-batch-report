import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { useNavigate } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import { usePrintData } from "../../hooks/usePrintData";

// Schwing-Stetter logo — two diagonal parallelograms in green
function SchwingLogo({ size = 62 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 62 62" style={{ display: "block" }}>
      <rect width="62" height="62" fill="white" />
      {/* Left parallelogram — dark green */}
      <polygon points="6,56 17,6 31,6 20,56" fill="#1a6e1a" />
      {/* Right parallelogram — lighter green */}
      <polygon points="26,56 37,6 52,6 41,56" fill="#2c9e2c" />
    </svg>
  );
}

// ── Main slip template — exact match to sample PDF ────────────────────────────
function WeighSlipTemplate({ data, type = "OUTWARD" }) {
  // Date: DD-MM-YYYY
  const dateStr = (() => {
    const src = data.delivery_date || data.weigh_date;
    if (!src) return "—";
    const d = new Date(src + "T00:00:00");
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}-${mm}-${d.getFullYear()}`;
  })();

  // Time: 05:21 AM
  const timeStr = (() => {
    const src = data.delivery_time || data.weigh_time;
    if (!src) return "—";
    const [h, m] = src.split(":");
    const hr = parseInt(h);
    return `${String(hr % 12 || 12).padStart(2, "0")}:${m} ${hr >= 12 ? "PM" : "AM"}`;
  })();

  const ticketNo  = data.ticket_number  || `WS-${String(data.id || 0).padStart(5, "0")}`;
  const challanNo = data.dc_number      || data.dc_number || "";
  const vehicleNo = (data.vehicle_number || "").toUpperCase();
  const driver    = (data.driver_name   || "").toUpperCase();
  const material  = (data.material_name || data.material_description || "CONCRETE").toUpperCase();
  const grade     = data.grade_name     || "";
  const operator  = (data.operator_name || "ADMIN").toUpperCase();
  const supplier  = (data.supplier      || "SRI AMMAN").toUpperCase();

  const loadedWt  = data.gross_weight_kg
    ? Number(data.gross_weight_kg).toLocaleString("en-IN")
    : (data.gross_weight_kg === 0 ? "0" : "");
  const emptyWt   = data.empty_weight_kg
    ? Number(data.empty_weight_kg).toLocaleString("en-IN")
    : (data.tare_weight_kg ? Number(data.tare_weight_kg).toLocaleString("en-IN") : "");
  const netWt     = data.net_weight_kg
    ? Number(data.net_weight_kg).toLocaleString("en-IN")
    : "";

  // inline style helpers
  const f = (sz, w, extra = {}) => ({
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: sz + "px",
    fontWeight: w || "normal",
    ...extra,
  });

  const cellL = { padding: "3px 0", verticalAlign: "top" };
  const cellV = { padding: "3px 8px", verticalAlign: "top" };

  return (
    <div style={{ ...f(10), maxWidth: "160mm", border: "1px solid #aaa", pageBreakInside: "avoid" }}>

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", padding: "5mm 6mm 3mm 5mm", borderBottom: "2px solid #000" }}>
        <SchwingLogo size={62} />
        <div style={{ marginLeft: "10px", flex: 1, textAlign: "center" }}>
          <div style={f(17, "bold")}>SRI AMMAN CONSTRUCTION AND EQUIPMENTS</div>
          <div style={{ ...f(10), marginTop: "2px" }}>CHINNAR ,SHOOLAGIRI</div>
          <div style={f(10)}>KRISHNAGIRI-635117</div>
        </div>
      </div>

      {/* ── BODY ────────────────────────────────────────────────────── */}
      <div style={{ padding: "3mm 6mm 4mm" }}>


        {/* Fields grid */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "2px" }}>
          <colgroup>
            <col style={{ width: "26%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "28%" }} />
          </colgroup>
          <tbody>
            <tr>
              <td style={cellL}><span style={f(10)}>Date:</span></td>
              <td style={cellV}><span style={f(10)}>{dateStr}</span></td>
              <td style={cellL}></td>
              <td style={cellV}></td>
            </tr>
            <tr>
              <td style={cellL}><span style={f(10)}>Time:</span></td>
              <td style={cellV}><span style={f(10)}>{timeStr}</span></td>
              <td style={cellL}></td>
              <td style={cellV}></td>
            </tr>
            <tr>
              <td style={cellL}><span style={f(10)}>Ticket Number:</span></td>
              <td style={{ ...cellV, fontFamily: "monospace" }}><span style={f(10)}>{ticketNo}</span></td>
              <td style={cellL}><span style={f(10)}>Material:</span></td>
              <td style={cellV}><span style={f(10)}>{material}</span></td>
            </tr>
            <tr>
              <td style={cellL}><span style={f(10)}>Challan No:</span></td>
              <td style={{ ...cellV }}><span style={{ ...f(9), fontFamily: "monospace" }}>{challanNo}</span></td>
              <td style={cellL}><span style={f(10)}>Supplier:</span></td>
              <td style={cellV}><span style={f(10)}>{supplier}</span></td>
            </tr>
            <tr>
              <td style={cellL}><span style={f(10)}>Vehicle Number:</span></td>
              <td style={cellV}><span style={f(11, "bold")}>{vehicleNo}</span></td>
              <td style={cellL}><span style={f(10)}>Driver:</span></td>
              <td style={cellV}><span style={f(10)}>{driver}</span></td>
            </tr>
          </tbody>
        </table>

        {/* ── Weight rows ──────────────────────────────────────────── */}
        <div style={{ marginTop: "4mm" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <colgroup>
              <col style={{ width: "30%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "38%" }} />
            </colgroup>
            <tbody>
              {/* Loaded Weight */}
              <tr>
                <td style={{ ...cellL, paddingBottom: "7px" }}>
                  <span style={f(10)}>Loaded Weight:</span>
                </td>
                <td style={{ ...cellV, paddingBottom: "7px" }}>
                  <span style={f(14, "bold")}>{loadedWt || "—"}</span>
                </td>
                <td style={{ ...cellL, paddingBottom: "7px" }}>
                  <span style={f(10)}>kg</span>
                </td>
                <td></td>
                <td></td>
              </tr>
              {/* Empty Weight */}
              <tr>
                <td style={{ ...cellL, paddingBottom: "7px" }}>
                  <span style={f(10)}>Empty Weight:</span>
                </td>
                <td style={{ ...cellV, paddingBottom: "7px" }}>
                  <span style={f(11)}>{emptyWt || "—"}</span>
                </td>
                <td style={{ paddingBottom: "7px" }}>
                  <span style={f(10)}>kg</span>
                </td>
                <td></td>
                <td style={{ paddingBottom: "7px", paddingLeft: "4px" }}>
                  <span style={f(10)}>Grade of material:</span>
                  <span style={{ ...f(10), marginLeft: "4px" }}>{grade}</span>
                </td>
              </tr>
              {/* Net Weight */}
              <tr>
                <td style={cellL}>
                  <span style={f(11, "bold")}>Net Weight:</span>
                </td>
                <td style={cellV}>
                  <span style={f(16, "bold")}>{netWt || "—"}</span>
                </td>
                <td>
                  <span style={f(10)}>kg</span>
                </td>
                <td></td>
                <td style={{ paddingLeft: "4px" }}>
                  <span style={f(10)}>Operator&nbsp; Name:&nbsp;</span>
                  <span style={f(10)}>{operator}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Signatures ──────────────────────────────────────────── */}
        <table style={{ width: "100%", marginTop: "10mm" }}>
          <tbody>
            <tr>
              <td style={{ width: "40%", paddingTop: "16px", borderTop: "1px solid #000", textAlign: "left" }}>
                <span style={f(10)}>Client Signature</span>
              </td>
              <td style={{ width: "20%" }}></td>
              <td style={{ width: "40%", paddingTop: "16px", borderTop: "1px solid #000", textAlign: "right" }}>
                <span style={f(10)}>Operator Signature</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ borderTop: "1px solid #aaa", marginTop: "0" }}></div>
    </div>
  );
}

// ── Outward slip page (linked to delivery) ────────────────────────────────────
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
        <WeighSlipTemplate data={data} type="OUTWARD" />
      </div>
    </div>
  );
}

// ── Export template for use in Weighment page (inward/outward) ───────────────
export { WeighSlipTemplate };
