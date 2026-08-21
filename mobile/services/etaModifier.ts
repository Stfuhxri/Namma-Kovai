export const ETA_CONFIG = {
  WEATHER_API_KEY: '7ec04e6db681482faa361334262008',
  TRAFFIC_API_KEY: 'OY2HqISARtvo5l00cIsREy0IuNvqZWwE',
  BASE_MULTIPLIER: 1.0,
  RAIN_PENALTY: 1.4,
  HEAVY_TRAFFIC_PENALTY: 1.5,
};

export interface EtaFactors {
  multiplier: number;
  hasRain: boolean;
  trafficRatio: number; // currentSpeed / freeFlowSpeed
}

/**
 * Fetches real-time weather and traffic at a specific coordinate
 * and computes a delay multiplier.
 */
export async function fetchEtaFactors(lat: number, lng: number): Promise<EtaFactors> {
  let hasRain = false;
  let trafficRatio = 1.0;
  let multiplier = ETA_CONFIG.BASE_MULTIPLIER;

  try {
    // 1. Fetch Weather from OpenWeatherMap
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${ETA_CONFIG.WEATHER_API_KEY}`;
    const weatherRes = await fetch(weatherUrl);
    if (weatherRes.ok) {
      const weatherData = await weatherRes.json();
      // Check if any weather condition is Rain or Drizzle (codes 5xx or 3xx)
      const isRaining = weatherData.weather?.some((w: any) => w.main === 'Rain' || w.main === 'Drizzle' || w.main === 'Thunderstorm');
      if (isRaining) {
        hasRain = true;
        multiplier = ETA_CONFIG.RAIN_PENALTY;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch weather data for ETA:', error);
  }

  try {
    // 2. Fetch Traffic from TomTom
    const trafficUrl = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lng}&key=${ETA_CONFIG.TRAFFIC_API_KEY}`;
    const trafficRes = await fetch(trafficUrl);
    if (trafficRes.ok) {
      const trafficData = await trafficRes.json();
      const flow = trafficData.flowSegmentData;
      if (flow && flow.freeFlowSpeed && flow.currentSpeed) {
        // If current speed is less than 50% of free flow, consider it heavy traffic
        trafficRatio = flow.currentSpeed / flow.freeFlowSpeed;
        if (trafficRatio < 0.5) {
          // Compound the penalty if both rain and traffic are bad
          multiplier = hasRain ? multiplier * ETA_CONFIG.HEAVY_TRAFFIC_PENALTY : ETA_CONFIG.HEAVY_TRAFFIC_PENALTY;
        } else if (trafficRatio < 0.8) {
           multiplier *= 1.2; // Moderate traffic
        }
      }
    }
  } catch (error) {
    console.warn('Failed to fetch traffic data for ETA:', error);
  }

  return { multiplier, hasRain, trafficRatio };
}
