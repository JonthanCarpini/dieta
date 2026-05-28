import { useEffect } from 'react';
import { useStepTrackerStore } from '../store/stepTrackerStore';

export function useStepCounter(dbSteps: number = 0) {
  const store = useStepTrackerStore();

  // Sincroniza dbSteps e executa inicialização na montagem do hook
  useEffect(() => {
    store.initialize(dbSteps);
  }, [dbSteps]);

  return {
    isPedometerAvailable: store.isPedometerAvailable,
    permissionStatus: store.permissionStatus,
    steps: store.steps,
    isLoading: store.isLoading,
    error: store.error,
    refetchSteps: store.checkPermissionAndFetchSteps,
    onSaveSuccess: store.onSaveSuccess,
  };
}
