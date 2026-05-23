import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// ─── Dummy lead data (20-35 leads per expo, 6 expos) ─────────────────────────
const SEGMENTS = ["Automotive","Machinery","Electronics","Aerospace","Pharmaceuticals","Chemical","Energy","Healthcare","Textile","Packaging"];
const SOURCES  = ["Direct Visit","Cold Call","Referral","Online Enquiry","Exhibition","LinkedIn"];
const STATES   = ["Maharashtra","Karnataka","Tamil Nadu","Gujarat","Delhi","Rajasthan","Telangana","West Bengal","Punjab","Uttar Pradesh"];
const TOB      = ["Manufacturer","Dealer","Distributor"];

const seed = (expo, i) => ({
  id:             `${expo.id}-${i}`,
  expoName:       expo.name,
  companyName:    [
    "Precision Techno Pvt Ltd","Alpha Hydraulics Ltd","Bharat Forge Components","MechLink Systems","Nova Engineering Works",
    "Suryodaya Automation","Kiran Tools & Dies","TechnoFab Industries","Shree Steel Products","Om Pneumatics",
    "Reliable Robotics","Ace Measuring Instruments","Kumar Machine Tools","Vijay Castings Pvt Ltd","Modern Conveyors",
    "Swift Pneumatics","Global CNC Solutions","Apex Tooling","Indo German Machines","Pearl Valves",
    "Aerotech Fasteners","Bhavani Fabrication","Tara Hydraulic Fittings","Phoenix Precision","Maruthi Dies",
    "Triton Gears Pvt Ltd","Everest Engineering","Shakthi Motors","Catalyst Automation","Dyna Systems",
    "Electra Controls","Falcon Industries","GreenTech Machinery","Horizon Pumps","Indus Sensors",
  ][i % 35],
  contactPerson:  ["Mr. Ramesh Kumar","Ms. Priya Sharma","Mr. Anil Verma","Mr. Suresh Nair","Ms. Kavitha R",
    "Mr. Deepak Shah","Ms. Ananya Iyer","Mr. Vikram Joshi","Ms. Divya Menon","Mr. Arjun Patel",
    "Mr. Ravi Krishnan","Ms. Sunita Gupta","Mr. Manish Tiwari","Mr. Sanjay Reddy","Ms. Neha Dubey"][i % 15],
  designation:    ["Manager","Director","CEO","Purchase Head","Technical Manager","General Manager","MD","Sales Head","CTO","VP Operations"][i % 10],
  mobile1:        `9${String(8000000000 + (expo.id * 100 + i)).slice(1)}`,
  mobile2:        i % 3 === 0 ? `8${String(7000000000 + (expo.id * 50 + i)).slice(1)}` : "",
  landLine:       i % 4 === 0 ? `044-${2200000 + i * 37}` : "",
  email1:         `contact${i + 1}@${["precisiontechno","alphahydraulics","bharatforge","mechlink","novaengg"][i % 5]}.com`,
  email2:         i % 5 === 0 ? `info${i}@example.com` : "",
  address1:       `${10 + i * 3}, Industrial Area`,
  address2:       ["Phase 1","Phase 2","Sector A","Block B","MIDC Area"][i % 5],
  city:           ["Pune","Bangalore","Chennai","Ahmedabad","Delhi","Hyderabad","Kolkata","Coimbatore","Surat","Nashik"][i % 10],
  pinCode:        String(400001 + i * 17),
  state:          STATES[i % STATES.length],
  country:        "India",
  website:        `www.company${i + 1}.in`,
  segment:        SEGMENTS[i % SEGMENTS.length],
  source:         SOURCES[i % SOURCES.length],
  typeOfBusiness: TOB[i % 3],
  remarks:        ["Interested in CNC solutions","Looking for automation","Need hydraulic parts","Requires precision tools","Exploring robotics"][i % 5],
  dateOfEntry:    new Date(2025, (expo.id % 12), 1 + (i % 28)).toISOString().slice(0, 10),
});

const EXPOS = [
  { id: 1, name: "IMTEX 2025",        location: "Bangalore",  date: "23–29 Jan 2025",  count: 32 },
  { id: 2, name: "ENGIMACH 2024",      location: "Ahmedabad",  date: "04–08 Dec 2024",  count: 28 },
  { id: 3, name: "MACHINE TOOL EXPO",  location: "Chennai",    date: "15–18 Oct 2024",  count: 24 },
  { id: 4, name: "AUTO EXPO 2025",     location: "Delhi",      date: "17–22 Jan 2025",  count: 35 },
  { id: 5, name: "INDIA PLAST 2024",   location: "Mumbai",     date: "06–10 Nov 2024",  count: 21 },
  { id: 6, name: "MANUFACTURING EXPO", location: "Hyderabad",  date: "20–23 Sep 2024",  count: 27 },
];

// Build all leads per expo
const ALL_LEADS = {};
EXPOS.forEach((expo) => {
  ALL_LEADS[expo.id] = Array.from({ length: expo.count }, (_, i) => seed(expo, i));
});

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

const TABLE_HEADS = [
  "S.No.","Company Name","Contact Person","Designation","Mobile 1","Mobile 2","Email","City","State",
  "Segment","Type of Business","Source","Website","Address","Remarks","Date",
];

// ─── Pagination ───────────────────────────────────────────────────────────────
const Pagination = ({ page, totalPages, goPage, total, pageSize }) => {
  if (total === 0) return null;
  const delta = 2;
  let start = Math.max(1, page - delta);
  let end   = Math.min(totalPages, page + delta);
  if (end - start < delta * 2) {
    if (start === 1) end = Math.min(totalPages, start + delta * 2);
    else             start = Math.max(1, end - delta * 2);
  }
  const items = [];
  if (start > 1)             { items.push({ t: "n", v: 1 }); if (start > 2) items.push({ t: "e" }); }
  for (let p = start; p <= end; p++) items.push({ t: "n", v: p });
  if (end < totalPages)      { if (end < totalPages - 1) items.push({ t: "e" }); items.push({ t: "n", v: totalPages }); }

  const bNav = "w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all";
  const bNum = "w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold border transition-all cursor-pointer";
  return (
    <div className="flex flex-wrap items-center justify-between px-5 py-4 border-t border-gray-100 gap-3 bg-white">
      <p className="text-xs text-gray-500">
        Showing <span className="font-semibold text-gray-700">{Math.min((page-1)*pageSize+1, total)}</span>–
        <span className="font-semibold text-gray-700">{Math.min(page*pageSize, total)}</span> of{" "}
        <span className="font-semibold text-gray-700">{total}</span> leads
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => goPage(1)} disabled={page===1} className={bNav}>«</button>
        <button onClick={() => goPage(page-1)} disabled={page===1} className={bNav}>‹</button>
        {items.map((item, idx) =>
          item.t === "e"
            ? <span key={`e${idx}`} className="px-1 text-gray-400 text-xs">…</span>
            : (
              <button key={item.v} onClick={() => goPage(item.v)}
                className={`${bNum} ${item.v === page ? "text-white border-transparent shadow" : "text-gray-600 border-gray-200 hover:bg-gray-100"}`}
                style={item.v === page ? { background: "#e81c21" } : {}}>
                {item.v}
              </button>
            )
        )}
        <button onClick={() => goPage(page+1)} disabled={page===totalPages} className={bNav}>›</button>
        <button onClick={() => goPage(totalPages)} disabled={page===totalPages} className={bNav}>»</button>
      </div>
    </div>
  );
};

// ─── Confirm Use Modal ────────────────────────────────────────────────────────
const ConfirmUseModal = ({ expo, selectedIds, leads, onConfirm, onCancel }) => {
  const count = selectedIds === "all" ? leads.length : selectedIds.size;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-7 w-full max-w-md">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7" style={{ color: "#e81c21" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
        </div>
        <h2 className="text-lg font-bold text-center text-gray-900 mb-1">Import Leads</h2>
        <p className="text-sm text-gray-500 text-center mb-2">
          You are about to import <span className="font-bold text-gray-900">{count} lead{count !== 1 ? "s" : ""}</span> from
        </p>
        <p className="text-base font-bold text-center mb-5" style={{ color: "#e81c21" }}>{expo.name}</p>
        <p className="text-xs text-gray-400 text-center mb-6">
          These leads will be added directly to Customer Data. Existing leads with the same company name will be skipped.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">Cancel</button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-full text-white text-sm font-bold cursor-pointer transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#e81c21,#c01519)" }}>
            Import {count} Lead{count !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ msg, type }) => {
  if (!msg) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-medium ${type === "error" ? "bg-red-700" : "bg-gray-900"}`}
      style={{ animation: "fadeIn 0.25s ease-out" }}>
      <span>{type === "error" ? "✕" : "✓"}</span>
      {msg}
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ExpoReports() {
  const navigate = useNavigate();
  const [selectedExpoId, setSelectedExpoId] = useState(null);
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search,   setSearch]   = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set()); // selected row IDs
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [toast, setToast] = useState(null);

  const selectedExpo = EXPOS.find((e) => e.id === selectedExpoId);
  const rawLeads     = selectedExpoId ? ALL_LEADS[selectedExpoId] : [];

  const filteredLeads = useMemo(() => {
    if (!search.trim()) return rawLeads;
    const q = search.toLowerCase();
    return rawLeads.filter((l) =>
      l.companyName.toLowerCase().includes(q) ||
      l.contactPerson.toLowerCase().includes(q) ||
      l.city.toLowerCase().includes(q) ||
      l.segment.toLowerCase().includes(q)
    );
  }, [rawLeads, search]);

  // Reset page when expo or search changes
  useMemo(() => { setPage(1); }, [selectedExpoId, search]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const paginated  = filteredLeads.slice((page - 1) * pageSize, page * pageSize);
  const goPage     = (p) => setPage(Math.max(1, Math.min(totalPages, p)));

  const allOnPageSelected = paginated.length > 0 && paginated.every((l) => selectedIds.has(l.id));

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allOnPageSelected) paginated.forEach((l) => next.delete(l.id));
    else                   paginated.forEach((l) => next.add(l.id));
    setSelectedIds(next);
  };

  const toggleRow = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleImport = () => {
    if (!selectedExpo) return;
    const toImport = selectedIds.size > 0
      ? filteredLeads.filter((l) => selectedIds.has(l.id))
      : filteredLeads;

    if (toImport.length === 0) {
      showToast("No leads to import. Select some leads first.", "error");
      return;
    }
    setShowConfirm(true);
  };

  const confirmImport = () => {
    const toImport = selectedIds.size > 0
      ? filteredLeads.filter((l) => selectedIds.has(l.id))
      : filteredLeads;

    const existing = JSON.parse(localStorage.getItem("crm_leads") || "[]");
    const existingNames = new Set(existing.map((r) => (r.manufacturer?.companyName || "").toLowerCase()));
    let added = 0;

    toImport.forEach((lead) => {
      if (existingNames.has(lead.companyName.toLowerCase())) return;
      const record = {
        id:          `imported_${lead.id}_${Date.now()}`,
        entryType:   "existing",
        dateOfEntry: new Date().toISOString(),
        status:      "active",
        manufacturer: {
          expoName:       lead.expoName,
          companyName:    lead.companyName,
          contactPerson:  lead.contactPerson,
          designation:    lead.designation,
          mobile1:        lead.mobile1,
          mobile2:        lead.mobile2,
          landLine:       lead.landLine,
          email1:         lead.email1,
          email2:         lead.email2,
          address1:       lead.address1,
          address2:       lead.address2,
          city:           lead.city,
          pinCode:        lead.pinCode,
          state:          lead.state,
          country:        lead.country,
          website:        lead.website,
          segment:        lead.segment,
          source:         lead.source,
          typeOfBusiness: "Manufacturer",
          remarks:        lead.remarks,
        },
        subEntities: [],
      };
      existing.push(record);
      existingNames.add(lead.companyName.toLowerCase());
      added++;
    });

    localStorage.setItem("crm_leads", JSON.stringify(existing));
    setShowConfirm(false);
    setSelectedIds(new Set());
    showToast(`${added} lead${added !== 1 ? "s" : ""} imported successfully!`);
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-20">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-gray-600 hover:bg-red-100 transition-all cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Expo Lead Browser</h1>
          <p className="text-xs text-gray-400">Select an expo to browse and import historical lead data</p>
        </div>
      </div>

      <div className="max-w-[95%] mx-auto px-4 py-8 space-y-6">

        {/* Expo selector cards */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Select Expo</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {EXPOS.map((expo) => {
              const active = selectedExpoId === expo.id;
              return (
                <button key={expo.id}
                  onClick={() => { setSelectedExpoId(expo.id); setSearch(""); setSelectedIds(new Set()); setPage(1); }}
                  className={`rounded-2xl p-4 text-left border-2 transition-all cursor-pointer hover:shadow-md ${
                    active
                      ? "border-transparent text-white shadow-lg"
                      : "bg-white border-gray-200 text-gray-700 hover:border-red-300"
                  }`}
                  style={active ? { background: "linear-gradient(135deg,#e81c21,#c01519)" } : {}}>
                  <p className="font-bold text-sm leading-tight mb-1">{expo.name}</p>
                  <p className={`text-xs mb-1 ${active ? "text-red-100" : "text-gray-400"}`}>{expo.location}</p>
                  <p className={`text-xs mb-2 ${active ? "text-red-100" : "text-gray-400"}`}>{expo.date}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    active ? "bg-white text-red-600" : "bg-gray-100 text-gray-600"
                  }`}>{expo.count} leads</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Table section */}
        {selectedExpo && (
          <div>
            {/* Table header bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-base font-bold text-gray-900">{selectedExpo.name}</p>
                <p className="text-xs text-gray-500">{selectedExpo.location} · {selectedExpo.date}</p>
              </div>

              {/* Search */}
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-gray-300 rounded-full bg-white overflow-hidden focus-within:ring-2 focus-within:ring-red-300 transition-all px-3 py-2 gap-2">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search leads…"
                    className="bg-transparent text-sm focus:outline-none w-44 cursor-text" />
                  {search && (
                    <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600 cursor-pointer text-xs">✕</button>
                  )}
                </div>

                <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
                  {filteredLeads.length} records
                </span>
              </div>
            </div>

            {/* Selection bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 p-3 bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAll}
                    className="accent-red-500 w-4 h-4 cursor-pointer rounded" />
                  Select all on this page
                </label>
                {selectedIds.size > 0 && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="font-semibold" style={{ color: "#e81c21" }}>{selectedIds.size} selected</span>
                    <button onClick={() => setSelectedIds(new Set())}
                      className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer underline">Clear</button>
                  </>
                )}
              </div>

              {/* Rows per page */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Rows:</span>
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none cursor-pointer">
                  {[10, 25, 50].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ background: "#1c1c1c" }}>
                      {/* Checkbox col */}
                      <th className="px-4 py-3.5 border border-gray-700 w-10">
                        <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAll}
                          className="accent-red-500 w-4 h-4 cursor-pointer" />
                      </th>
                      {TABLE_HEADS.map((h) => (
                        <th key={h} className="text-left px-4 py-3.5 font-bold text-white border border-gray-700 whitespace-nowrap text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={TABLE_HEADS.length + 1} className="text-center py-12 text-gray-400 text-sm">
                          No leads match your search.
                        </td>
                      </tr>
                    ) : (
                      paginated.map((lead, i) => {
                        const isSelected = selectedIds.has(lead.id);
                        const globalIdx  = (page - 1) * pageSize + i + 1;
                        return (
                          <tr key={lead.id}
                            className={`border-b border-gray-100 transition-colors cursor-pointer ${
                              isSelected ? "bg-red-50" : i % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"
                            }`}
                            onClick={() => toggleRow(lead.id)}>
                            <td className="px-4 py-2.5 border-r border-gray-200 text-center" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={isSelected} onChange={() => toggleRow(lead.id)}
                                className="accent-red-500 w-4 h-4 cursor-pointer" />
                            </td>
                            <td className="px-4 py-2.5 border-r border-gray-200 text-gray-400 text-center font-mono text-xs w-12">{globalIdx}</td>
                            <td className="px-4 py-2.5 border-r border-gray-200 font-semibold text-gray-900 max-w-[180px] truncate whitespace-nowrap">{lead.companyName}</td>
                            <td className="px-4 py-2.5 border-r border-gray-200 text-gray-700 whitespace-nowrap">{lead.contactPerson}</td>
                            <td className="px-4 py-2.5 border-r border-gray-200 text-gray-600 whitespace-nowrap">{lead.designation}</td>
                            <td className="px-4 py-2.5 border-r border-gray-200 text-gray-700 whitespace-nowrap font-mono text-xs">{lead.mobile1}</td>
                            <td className="px-4 py-2.5 border-r border-gray-200 text-gray-500 whitespace-nowrap font-mono text-xs">{lead.mobile2 || "—"}</td>
                            <td className="px-4 py-2.5 border-r border-gray-200 text-gray-600 max-w-[160px] truncate">{lead.email1}</td>
                            <td className="px-4 py-2.5 border-r border-gray-200 text-gray-700 whitespace-nowrap">{lead.city}</td>
                            <td className="px-4 py-2.5 border-r border-gray-200 text-gray-600 whitespace-nowrap">{lead.state}</td>
                            <td className="px-4 py-2.5 border-r border-gray-200">
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 whitespace-nowrap">{lead.segment}</span>
                            </td>
                            <td className="px-4 py-2.5 border-r border-gray-200">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                                lead.typeOfBusiness === "Manufacturer" ? "bg-gray-100 text-gray-700" :
                                lead.typeOfBusiness === "Dealer"       ? "bg-blue-100 text-blue-700" :
                                "bg-purple-100 text-purple-700"
                              }`}>{lead.typeOfBusiness}</span>
                            </td>
                            <td className="px-4 py-2.5 border-r border-gray-200 text-gray-600 whitespace-nowrap">{lead.source}</td>
                            <td className="px-4 py-2.5 border-r border-gray-200 text-gray-500 text-xs">{lead.website}</td>
                            <td className="px-4 py-2.5 border-r border-gray-200 text-gray-500 text-xs max-w-[140px] truncate">{lead.address1}, {lead.address2}</td>
                            <td className="px-4 py-2.5 border-r border-gray-200 text-gray-500 max-w-[140px] truncate text-xs">{lead.remarks}</td>
                            <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap text-xs">{fmtDate(lead.dateOfEntry)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination page={page} totalPages={totalPages} goPage={goPage} total={filteredLeads.length} pageSize={pageSize} />
            </div>

            {/* Bottom action bar */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-600">
                {selectedIds.size > 0 ? (
                  <span>
                    <span className="font-bold" style={{ color: "#e81c21" }}>{selectedIds.size}</span> lead{selectedIds.size !== 1 ? "s" : ""} selected
                    {" "}— click <strong>Use Selected Data</strong> to import them into the CRM.
                  </span>
                ) : (
                  <span>
                    No rows selected — click <strong>Use All Data</strong> to import all{" "}
                    <span className="font-bold text-gray-900">{filteredLeads.length}</span> leads from <span className="font-semibold">{selectedExpo.name}</span>.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {selectedIds.size > 0 && (
                  <button onClick={() => setSelectedIds(new Set())}
                    className="px-5 py-2.5 rounded-full border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer transition-all">
                    Clear Selection
                  </button>
                )}
                <button onClick={handleImport}
                  className="flex items-center gap-2 px-7 py-2.5 rounded-full text-white text-sm font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all cursor-pointer"
                  style={{ background: "linear-gradient(135deg,#e81c21,#c01519)" }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                  </svg>
                  {selectedIds.size > 0 ? `Use Selected Data (${selectedIds.size})` : `Use All Data (${filteredLeads.length})`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!selectedExpo && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg className="w-16 h-16 mb-4 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
            <p className="text-base font-semibold text-gray-400">Select an expo above to browse leads</p>
            <p className="text-sm mt-1">Choose from {EXPOS.length} available expos</p>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {showConfirm && selectedExpo && (
        <ConfirmUseModal
          expo={selectedExpo}
          selectedIds={selectedIds.size > 0 ? selectedIds : "all"}
          leads={filteredLeads}
          onConfirm={confirmImport}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}