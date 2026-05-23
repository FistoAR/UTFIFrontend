import React from 'react';

/**
 * Clean Minimal Confirmation Dialog
 * Matches reference design: title + X close, description, Back + action buttons
 */
export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Delete",
  confirmType = "danger",
  isLoading = false,
  requiredText = ""
}) {
  const [inputText, setInputText] = React.useState("");
  
  // Reset input when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) setInputText("");
  }, [isOpen]);

  if (!isOpen) return null;

  const isDanger = confirmType === "danger";
  const isConfirmDisabled = requiredText ? inputText !== requiredText : false;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[3px] animate-in fade-in duration-200"
        onClick={!isLoading ? onCancel : undefined}
      />

      {/* Dialog Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[420px] p-7 animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-200">

        {/* Header row: title + X */}
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-[1.05rem] font-bold text-gray-900 leading-tight">{title}</h3>
          {!isLoading && (
            <button
              onClick={onCancel}
              className="ml-4 mt-0.5 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Message */}
        <p className="text-sm text-gray-500 leading-relaxed mb-6">{message}</p>

        {/* Validation Input */}
        {requiredText && (
          <div className="mb-6 space-y-2">
            <p className="text-[13px] font-bold text-gray-700">
              Type <span className="text-red-500">"{requiredText}"</span> to confirm:
            </p>
            <input 
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 outline-none focus:border-red-500 transition-all text-sm font-bold text-gray-900"
              placeholder="Enter name exactly"
              autoFocus
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {/* Back / Cancel */}
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 h-11 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:border-gray-400 hover:text-gray-900 transition-all disabled:opacity-50"
          >
            Back
          </button>

          {/* Confirm / Delete */}
          <button
            onClick={onConfirm}
            disabled={isLoading || isConfirmDisabled}
            className={`flex-1 h-11 rounded-xl font-semibold text-sm text-white transition-all flex items-center justify-center gap-2 disabled:opacity-30 active:scale-[0.97]
              ${isDanger
                ? 'bg-[#ff3b3a] hover:bg-black'
                : 'bg-black hover:bg-gray-800'
              }`}
          >
            {isLoading ? (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
