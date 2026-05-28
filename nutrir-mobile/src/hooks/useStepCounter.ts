import { useState, useEffect, useRef } from 'react';
import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';

export function useStepCounter(dbSteps: number = 0) {
  const [isPedometerAvailable, setIsPedometerAvailable] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');
  const [steps, setSteps] = useState<number>(dbSteps);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Armazena os passos base do banco no início da sessão
  const baseStepsRef = useRef<number>(dbSteps);
  const hasInitializedBase = useRef<boolean>(false);
  const subscriptionRef = useRef<Pedometer.Subscription | null>(null);

  // Sincroniza os passos do banco na primeira carga
  useEffect(() => {
    if (dbSteps > 0 && !hasInitializedBase.current) {
      baseStepsRef.current = dbSteps;
      setSteps(dbSteps);
      hasInitializedBase.current = true;
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
          // Android não suporta getStepCountAsync por período na SDK do Expo Sensors.
          // Mantemos os passos base mais os passos detectados na sessão atual
          setSteps(baseStepsRef.current);
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

    const startWatching = async () => {
      try {
        const isAvailable = await Pedometer.isAvailableAsync();
        const permission = await Pedometer.getPermissionsAsync();
        if (isAvailable && permission.status === 'granted') {
          subscriptionRef.current = Pedometer.watchStepCount((result) => {
            if (Platform.OS === 'ios') {
              // No iOS, atualizamos o total geral do dia via consulta
              checkPermissionAndFetchSteps();
            } else {
              // No Android, watchStepCount retorna passos a partir do início da escuta.
              // Somamos estes passos acumulados na sessão com a base vinda do banco.
              setSteps(baseStepsRef.current + result.steps);
            }
          });
        }
      } catch (e) {
        console.error('Erro ao iniciar watchStepCount:', e);
      }
    };

    startWatching();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    };
  }, []);

  const resetBaseSteps = (newBase: number) => {
    baseStepsRef.current = newBase;
    setSteps(newBase);
    hasInitializedBase.current = true;

    // Reinicia a escuta para zerar o contador relativo da sessão
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }

    const restartWatching = async () => {
      try {
        const isAvailable = await Pedometer.isAvailableAsync();
        const permission = await Pedometer.getPermissionsAsync();
        if (isAvailable && permission.status === 'granted') {
          subscriptionRef.current = Pedometer.watchStepCount((result) => {
            if (Platform.OS === 'ios') {
              checkPermissionAndFetchSteps();
            } else {
              setSteps(baseStepsRef.current + result.steps);
            }
          });
        }
      } catch (e) {
        console.error('Erro ao reiniciar watchStepCount:', e);
      }
    };
    restartWatching();
  };

  return {
    isPedometerAvailable,
    permissionStatus,
    steps,
    isLoading,
    error,
    refetchSteps: checkPermissionAndFetchSteps,
    resetBaseSteps,
  };
}
