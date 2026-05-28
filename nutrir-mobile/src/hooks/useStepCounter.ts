import { useState, useEffect, useRef } from 'react';
import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';

export function useStepCounter(dbSteps: number = 0, isTracking: boolean = false) {
  const [isPedometerAvailable, setIsPedometerAvailable] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');
  const [steps, setSteps] = useState<number>(dbSteps);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const lastSavedDatabaseStepsRef = useRef<number>(dbSteps);
  const lastSavedSensorStepsRef = useRef<number>(0);
  const currentSensorStepsRef = useRef<number>(0);
  const subscriptionRef = useRef<Pedometer.Subscription | null>(null);

  // Sincroniza com alterações de dbSteps vindas de fora (como carga inicial ou ajuste manual)
  useEffect(() => {
    if (dbSteps !== steps) {
      lastSavedDatabaseStepsRef.current = dbSteps;
      lastSavedSensorStepsRef.current = currentSensorStepsRef.current;
      setSteps(dbSteps);
    }
  }, [dbSteps]);

  const checkPermissionAndFetchSteps = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Verifica/solicita permissão primeiro. No Android 10+, isAvailableAsync()
      // pode retornar false se a permissão de ACTIVITY_RECOGNITION ainda não foi concedida.
      const permission = await Pedometer.getPermissionsAsync();
      let status = permission.status;
      setPermissionStatus(status);

      if (status !== 'granted') {
        const request = await Pedometer.requestPermissionsAsync();
        status = request.status;
        setPermissionStatus(status);
      }

      // 2. Agora verifica a disponibilidade física do sensor
      const isAvailable = await Pedometer.isAvailableAsync();
      setIsPedometerAvailable(isAvailable);

      if (!isAvailable) {
        setError('Sensor de passos não disponível neste dispositivo.');
        setIsLoading(false);
        return;
      }

      if (status === 'granted') {
        if (Platform.OS === 'ios') {
          // iOS suporta consulta de passos por intervalo de data
          const start = new Date();
          start.setHours(0, 0, 0, 0); // meia-noite
          const end = new Date();
          const result = await Pedometer.getStepCountAsync(start, end);
          setSteps(result.steps);
        } else {
          // No Android, mantemos o cálculo baseado no delta do sensor
          const delta = currentSensorStepsRef.current - lastSavedSensorStepsRef.current;
          setSteps(lastSavedDatabaseStepsRef.current + delta);
        }
      } else {
        setError('Permissão para atividade física não concedida.');
      }
    } catch (err: any) {
      console.error('Erro no Pedometer:', err);
      setError(err?.message || 'Erro ao ler contador de passos.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verifica a disponibilidade do sensor e permissões logo no carregamento inicial da tela
  useEffect(() => {
    checkPermissionAndFetchSteps();
  }, []);

  // Gerencia a ativação/desativação da escuta física do sensor com base no toggle do usuário
  useEffect(() => {
    if (!isTracking) {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      return;
    }

    checkPermissionAndFetchSteps();

    let subscription: Pedometer.Subscription | null = null;

    const startWatching = async () => {
      try {
        const isAvailable = await Pedometer.isAvailableAsync();
        const permission = await Pedometer.getPermissionsAsync();
        if (isAvailable && permission.status === 'granted') {
          subscription = Pedometer.watchStepCount((result) => {
            currentSensorStepsRef.current = result.steps;
            if (Platform.OS === 'ios') {
              // No iOS, atualizamos o total geral do dia via consulta
              checkPermissionAndFetchSteps();
            } else {
              // No Android, calcula o delta de passos dados na sessão desde o último ponto de salvamento
              const delta = result.steps - lastSavedSensorStepsRef.current;
              setSteps(lastSavedDatabaseStepsRef.current + delta);
            }
          });
          subscriptionRef.current = subscription;
        }
      } catch (e) {
        console.error('Erro ao iniciar watchStepCount:', e);
      }
    };

    startWatching();

    return () => {
      if (subscription) {
        subscription.remove();
        subscriptionRef.current = null;
      }
    };
  }, [isTracking]);

  const onSaveSuccess = (savedTotal: number) => {
    // Alinha a base de comparação do banco com o estado atual do sensor
    lastSavedDatabaseStepsRef.current = savedTotal;
    lastSavedSensorStepsRef.current = currentSensorStepsRef.current;
    setSteps(savedTotal);
  };

  return {
    isPedometerAvailable,
    permissionStatus,
    steps,
    isLoading,
    error,
    refetchSteps: checkPermissionAndFetchSteps,
    onSaveSuccess,
  };
}
