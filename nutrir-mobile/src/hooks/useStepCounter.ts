import { useState, useEffect } from 'react';
import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';

export function useStepCounter() {
  const [isPedometerAvailable, setIsPedometerAvailable] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');
  const [steps, setSteps] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

      // No Android/iOS, precisamos solicitar permissão
      const permission = await Pedometer.getPermissionsAsync();
      let status = permission.status;
      setPermissionStatus(status);

      if (status !== 'granted') {
        const request = await Pedometer.requestPermissionsAsync();
        status = request.status;
        setPermissionStatus(status);
      }

      if (status === 'granted') {
        const start = new Date();
        start.setHours(0, 0, 0, 0); // meia-noite de hoje
        const end = new Date();

        const result = await Pedometer.getStepCountAsync(start, end);
        setSteps(result.steps);
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

    // Adiciona escuta em tempo real enquanto o app estiver aberto se a permissão for concedida
    let subscription: Pedometer.Subscription | null = null;
    
    const startWatching = async () => {
      try {
        const isAvailable = await Pedometer.isAvailableAsync();
        const permission = await Pedometer.getPermissionsAsync();
        if (isAvailable && permission.status === 'granted') {
          subscription = Pedometer.watchStepCount((result) => {
            // Nota: watchStepCount retorna passos relativos a partir do momento em que a escuta começou.
            // Para atualizar o total de hoje de forma confiável, nós recarregamos o total acumulado do dia.
            checkPermissionAndFetchSteps();
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

  return {
    isPedometerAvailable,
    permissionStatus,
    steps,
    isLoading,
    error,
    refetchSteps: checkPermissionAndFetchSteps,
  };
}
