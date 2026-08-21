import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export interface LocalBusPosition {
  lat: number;
  lng: number;
  heading: number;
  speedKmH: number;
}

export function useLocalBroadcaster(initialLat: number, initialLng: number) {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [localBusPosition, setLocalBusPosition] = useState<LocalBusPosition>({
    lat: initialLat,
    lng: initialLng,
    heading: 0,
    speedKmH: 0,
  });

  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);

  const startBroadcasting = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Foreground location permission not granted');
      return;
    }

    setIsBroadcasting(true);

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 1,
      },
      (location) => {
        setLocalBusPosition({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          heading: location.coords.heading ?? 0,
          speedKmH: (location.coords.speed ?? 0) * 3.6, // m/s to km/h
        });
      }
    );

    setLocationSubscription(sub);
  };

  const stopBroadcasting = () => {
    setIsBroadcasting(false);
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [locationSubscription]);

  return {
    isBroadcasting,
    localBusPosition,
    startBroadcasting,
    stopBroadcasting,
  };
}
