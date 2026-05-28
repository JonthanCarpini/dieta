import { create } from 'zustand';
import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';
import api from '../api/client';
import { queryClient } from '../../app/_layout';

interface StepTrackerState {
  isTracking: boolean;
  isPedometerAvailable: boolean;
  permissionStatus: string;
  steps: number;
  stepsTarget: number;
  isLoading: boolean;
  error: string | null;
  
  initialize: (dbSteps: number, target?: number) => Promise<void>;
  setTracking: (active: boolean) => Promise<void>;
  checkPermissionAndFetchSteps: () => Promise<void>;
  onSaveSuccess: (savedTotal: number) => void;
}

// Variáveis no escopo do módulo para persistir referências nativas e estados de comparação
let activeSubscription: Pedometer.Subscription | null = null;
let lastSavedDatabaseSteps = 0;
let lastSavedSensorSteps = 0;
let currentSensorSteps = 0;
let isInitialized = false;
let syncTimeout: any = null;

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const syncStepsToBackend = (steps: number) => {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  
  syncTimeout = setTimeout(async () => {
    try {
      const today = getLocalDateString();
      const state = useStepTrackerStore.getState();
      const response = await api.post('/user/activity/steps', {
        date: today,
        steps: steps,
        steps_target: state.stepsTarget,
      });
      
      const savedSteps = response.data.steps;
      state.onSaveSuccess(savedSteps);
      
      // Invalida os caches do React Query para propagar a atualização por todo o app
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['daily-summary'] });
        queryClient.invalidateQueries({ queryKey: ['activity-today'] });
      }
    } catch (e) {
      console.error('Erro ao sincronizar passos em background:', e);
    }
  }, 4000); // 4 segundos de debounce para otimizar bateria e rede
};

export const useStepTrackerStore = create<StepTrackerState>((set, get) => ({
  isTracking: false,
  isPedometerAvailable: false,
  permissionStatus: 'undetermined',
  steps: 0,
  stepsTarget: 10000,
  isLoading: true,
  error: null,

  initialize: async (dbSteps, target = 10000) => {
    set({ stepsTarget: target });
    
    // Sincroniza passos do banco se for diferente do estado local atual
    if (dbSteps !== get().steps) {
      lastSavedDatabaseSteps = dbSteps;
      lastSavedSensorSteps = currentSensorSteps;
      set({ steps: dbSteps });
    }

    if (!isInitialized) {
      isInitialized = true;
      await get().checkPermissionAndFetchSteps();
    }
  },

  checkPermissionAndFetchSteps: async () => {
    set({ isLoading: true, error: null });
    try {
      // 1. Verifica/solicita permissão primeiro.
      const permission = await Pedometer.getPermissionsAsync();
      let status = permission.status;
      set({ permissionStatus: status });

      if (status !== 'granted') {
        const request = await Pedometer.requestPermissionsAsync();
        status = request.status;
        set({ permissionStatus: status });
      }

      // 2. Agora verifica a disponibilidade física do sensor
      const isAvailable = await Pedometer.isAvailableAsync();
      set({ isPedometerAvailable: isAvailable });

      if (!isAvailable) {
        set({ error: 'Sensor de passos não disponível neste dispositivo.', isLoading: false });
        return;
      }

      if (status === 'granted') {
        if (Platform.OS === 'ios') {
          // iOS suporta consulta de passos por intervalo de data
          const start = new Date();
          start.setHours(0, 0, 0, 0); // meia-noite
          const end = new Date();
          const result = await Pedometer.getStepCountAsync(start, end);
          set({ steps: result.steps });
        } else {
          // No Android, mantemos o cálculo baseado no delta do sensor
          const delta = currentSensorSteps - lastSavedSensorSteps;
          set({ steps: lastSavedDatabaseSteps + delta });
        }
      } else {
        set({ error: 'Permissão para atividade física não concedida.' });
      }
    } catch (err: any) {
      console.error('Erro no Pedometer (Store):', err);
      set({ error: err?.message || 'Erro ao ler contador de passos.' });
    } finally {
      set({ isLoading: false });
    }
  },

  setTracking: async (active) => {
    set({ isTracking: active });

    if (!active) {
      if (activeSubscription) {
        activeSubscription.remove();
        activeSubscription = null;
      }
      return;
    }

    // Se for ativar, executa permissão e disponibilidade
    await get().checkPermissionAndFetchSteps();

    // Garante que não haja duplicidade de subscription
    if (activeSubscription) {
      activeSubscription.remove();
      activeSubscription = null;
    }

    const state = get();
    if (state.isPedometerAvailable && state.permissionStatus === 'granted') {
      try {
        activeSubscription = Pedometer.watchStepCount((result) => {
          currentSensorSteps = result.steps;
          
          if (Platform.OS === 'ios') {
            get().checkPermissionAndFetchSteps();
          } else {
            const delta = result.steps - lastSavedSensorSteps;
            const updatedSteps = lastSavedDatabaseSteps + delta;
            set({ steps: updatedSteps });
            
            // Sincroniza os passos em background com debounce
            syncStepsToBackend(updatedSteps);
          }
        });
      } catch (e) {
        console.error('Erro ao iniciar watchStepCount na Store:', e);
      }
    }
  },

  onSaveSuccess: (savedTotal) => {
    lastSavedDatabaseSteps = savedTotal;
    lastSavedSensorSteps = currentSensorSteps;
    set({ steps: savedTotal });
  },
}));
