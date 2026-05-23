import { useState, useEffect, useRef } from "react";

/**
 * AutocompleteInput - custom dropdown autocomplete (not a browser datalist/tooltip)
 * Props:
 *   label, value, onChange, options[], required, disabled
 *   isInvalid (red border), id (for htmlFor), onTouch (called when value selected/typed)
 *   inputClassName - extra classes for the input
 *   labelClassName - extra classes for the label
 */
const AutocompleteInput = ({
  label,
  id,
  value,
  onChange,
  options = [],
  required = false,
  disabled = false,
  isInvalid = false,
  onTouch,
  inputClassName = "",
  labelClassName = "",
}) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value || "");
  const ref = useRef(null);

  // Sync when parent updates value externally
  useEffect(() => { setQ(value || ""); }, [value]);

  const filtered = q.length > 0
    ? options.filter(o => o.toLowerCase().includes(q.toLowerCase())).slice(0, 15)
    : options.slice(0, 15);

  // Close on outside click
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleChange = (val) => {
    setQ(val);
    onChange(val);
    setOpen(true);
    if (val && onTouch && id) onTouch(id);
  };

  const handleSelect = (opt) => {
    setQ(opt);
    onChange(opt);
    if (onTouch && id) onTouch(id);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      {label && (
        <label
          htmlFor={id}
          className={`block text-sm font-bold mb-1 transition-colors ${isInvalid ? "text-red-600" : "text-gray-900"} ${labelClassName}`}
        >
          {label} {required && <span className="text-red-500 font-bold">*</span>}
        </label>
      )}
      <input
        id={id}
        type="text"
        value={q}
        disabled={disabled}
        autoComplete="nope"
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => options.length > 0 && setOpen(true)}
        className={`w-full rounded-full px-3 py-2 border text-sm transition-all
          ${isInvalid
            ? "border-red-500 bg-red-50 focus:ring-red-400 focus:border-red-400"
            : "bg-gray-50 border-gray-500 focus:ring-red-300 focus:border-red-500"}
          ${disabled
            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
            : "focus:outline-none focus:ring-2 cursor-text hover:border-gray-400"}
          ${inputClassName}`}
      />
      {open && filtered.length > 0 && !disabled && (
        <div className="absolute z-[200] left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
          {filtered.map((opt) => (
            <div
              key={opt}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-red-50 hover:text-red-700
                ${opt === q ? "bg-red-50 text-red-700 font-semibold" : "text-gray-700"}`}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;
