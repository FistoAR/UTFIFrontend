import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";

const LoadingContext = createContext(null);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
};

export const LoadingProvider = ({ children }) => {
  const [loadingCount, setLoadingCount] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Fetching Data");

  const startLoading = useCallback((msg = "Fetching Data") => {
    setLoadingMessage(msg);
    setLoadingCount((prev) => prev + 1);
  }, []);

  const stopLoading = useCallback(() => {
    setLoadingCount((prev) => Math.max(0, prev - 1));
  }, []);

  const resetLoading = useCallback(() => {
    setLoadingCount(0);
  }, []);

  const isLoading = useMemo(() => loadingCount > 0, [loadingCount]);

  return (
    <LoadingContext.Provider
      value={{ isLoading, startLoading, stopLoading, resetLoading }}
    >
      {children}
      {isLoading && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-black text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 border border-white/10 backdrop-blur-md">
            <svg
              className="animate-spin h-4 w-4 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-100"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="text-[11px] font-black uppercase tracking-[0.25em] whitespace-nowrap">
              Please wait {loadingMessage}
            </span>
            {/* <div className="flex gap-1">
              <span className="w-1 h-1 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div> */}
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
};
