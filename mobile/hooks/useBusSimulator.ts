import { useEffect, useState } from 'react';
import { busSimulator, SimulatedBus } from '@/services/busSimulator';

export function useBusSimulator() {
  const [buses, setBuses] = useState<Map<string, SimulatedBus>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = busSimulator.subscribe((updatedBuses) => {
      setBuses(updatedBuses);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { buses, loading };
}
