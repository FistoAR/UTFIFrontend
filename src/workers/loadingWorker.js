// Loading Worker - Manages loading state across the application
export const loadingWorker = {
  isLoading: () => {
    const loading = import.meta.env.VITE_LOADING;
    return loading === 'true' || loading === true;
  },

  getLoadingMessage: () => {
    return 'Server reaching failed contact to Admin';
  },

  getBreakMessage: () => {
    return '1 min break';
  },

  shouldShowErrorSpinner: () => {
    return loadingWorker.isLoading();
  },

  getSpinnerConfig: () => {
    return {
      spinnerDuration: 60000, // 1 minute visible
      breakDuration: 30000,   // 1 minute break
      totalCycle: 120000      // total cycle time
    };
  }
};
