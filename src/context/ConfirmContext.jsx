import { createContext, useContext, useState, useCallback } from "react";
import ConfirmModal from "../components/ConfirmModal";

const ConfirmContext = createContext();

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used within a ConfirmProvider");
  return context;
};

export const ConfirmProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "",
    message: "",
    resolve: null,
    confirmType: "danger", 
    confirmText: "Confirm",
    cancelText: "Cancel",
    requiredText: "",
  });

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        title: options.title || "Confirm Action",
        message: options.message || "Are you sure you want to proceed?",
        confirmType: options.type === 'danger' ? 'danger' : 'info',
        confirmText: options.confirmText || "Confirm",
        cancelText: options.cancelText || "Cancel",
        requiredText: options.requiredText || "",
        resolve,
      });
    });
  }, []);

  const handleConfirm = () => {
    if (modalState.resolve) modalState.resolve(true);
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleCancel = () => {
    if (modalState.resolve) modalState.resolve(false);
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        confirmText={modalState.confirmText}
        confirmType={modalState.confirmType}
        requiredText={modalState.requiredText}
      />
    </ConfirmContext.Provider>
  );
};
