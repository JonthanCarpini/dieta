import { useState, useEffect, useRef } from 'react';
import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';

export function useStepCounter(dbSteps: number = 0) {
  const [isPedometerAvailable, setIsPedometerAvailable] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');
  const [steps, setSteps] = useState<number>(dbSteps);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const lastSavedDatabaseStepsRef = useRef<number>(dbSteps);
  const lastSavedSensorStepsRef = useRef<number>(0);
  const currentSensorStepsRef = useRef<number>(0);

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
      const isAvailable = await Pedometer.isAvailableAsync();
      setIsPedometerAvailable(isAvailable);

      if (!isAvailable) {
        setError('Sensor de passos não disponível neste dispositivo.');
        setIsLoading(false);
        return;
      }

      const permission = await Pedometer.getPermissionsAsync();
      let status = permission.status;
      setPermissionStatus(status);

      if (status !== 'granted') {
        const request = await Pedometer.requestPermissionsAsync();
        status = request.status;
        setPermissionStatus(status);
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

  useEffect(() => {
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
        }
      } catch (e) {
        console.error('Erro ao iniciar watchStepCount:', e);
      }
    };

    startWatching();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  const onSaveSuccess = (savedTotal: number) => {
    // Atualizamos a base de comparação do banco e alinhamos o ponto de referência do sensor.
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
