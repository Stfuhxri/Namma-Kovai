import { useState, useCallback, useRef } from 'react';

const WEATHER_API_KEY = '7ec04e6db681482faa361334262008';
const TRAFFIC_API_KEY = 'OY2HqISARtvo5l00cIsREy0IuNvqZWwE';

export interface WeatherData {
  tempC: number;
  description: string;
  icon: string;         // OWM icon code, e.g. "10d"
  isRaining: boolean;
  hasThunder: boolean;
  windKmH: number;
}

export interface TrafficData {
  currentSpeed: number;
  freeFlowSpeed: number;
  ratio: number;        // currentSpeed / freeFlowSpeed
  label: string;        // "Clear" | "Moderate" | "Heavy" | "Severe"
  delayFactor: number;  // ETA multiplier
  color: string;        // UI badge color
}

export interface EtaInfo {
  baseSeconds: number;
  adjustedSeconds: number;
  delayFactor: number;
  displayText: string;
}

const CACHE: Record<string, { ts: number; weather?: WeatherData; traffic?: TrafficData }> = {};
const CACHE_TTL_MS = 90_000; // 90 second cache to avoid hammering APIs

function cacheKey(lat: number, lng: number) {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

function trafficLabel(ratio: number): { label: string; color: string; delayFactor: number } {
  if (ratio >= 0.85) return { label: 'Clear Roads', color: '#22c55e', delayFactor: 1.0 };
  if (ratio >= 0.65) return { label: 'Light Traffic', color: '#84cc16', delayFactor: 1.1 };
  if (ratio >= 0.45) return { label: 'Moderate Traffic', color: '#f59e0b', delayFactor: 1.25 };
  if (ratio >= 0.25) return { label: 'Heavy Traffic', color: '#ef4444', delayFactor: 1.5 };
  return { label: 'Severe Congestion', color: '#7f1d1d', delayFactor: 2.0 };
}

export function useTransitInfo() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [traffic, setTraffic] = useState<TrafficData | null>(null);
  const [eta, setEta] = useState<EtaInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const lastFetchRef = useRef<string>('');

  const fetchInfo = useCallback(async (
    lat: number,
    lng: number,
    baseEtaSeconds: number
  ) => {
    const key = cacheKey(lat, lng);
    const now = Date.now();

    // Throttle: don't refetch same cell within TTL unless base ETA changed
    const etaKey = `${key}:${baseEtaSeconds}`;
    if (lastFetchRef.current === etaKey) return;
    lastFetchRef.current = etaKey;

    // Check cache
    const cached = CACHE[key];
    if (cached && now - cached.ts < CACHE_TTL_MS && cached.weather && cached.traffic) {
      const w = cached.weather;
      const t = cached.traffic;
      setWeather(w);
      setTraffic(t);
      const delayFactor = t.delayFactor * (w.isRaining ? 1.3 : 1.0);
      const adjusted = Math.round(baseEtaSeconds * delayFactor);
      const mins = Math.ceil(adjusted / 60);
      setEta({
        baseSeconds: baseEtaSeconds,
        adjustedSeconds: adjusted,
        delayFactor,
        displayText: mins < 1 ? 'Arriving' : `${mins} min`,
      });
      return;
    }

    setLoading(true);

    let weatherResult: WeatherData | null = null;
    let trafficResult: TrafficData | null = null;

    // === WEATHER ===
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${WEATHER_API_KEY}`
      );
      if (res.ok) {
        const d = await res.json();
        const main = d.weather?.[0]?.main ?? '';
        const isRaining = ['Rain', 'Drizzle', 'Thunderstorm'].includes(main);
        weatherResult = {
          tempC: Math.round(d.main?.temp ?? 0),
          description: d.weather?.[0]?.description ?? '',
          icon: d.weather?.[0]?.icon ?? '01d',
          isRaining,
          hasThunder: main === 'Thunderstorm',
          windKmH: Math.round((d.wind?.speed ?? 0) * 3.6),
        };
      }
    } catch (e) {
      console.warn('[useTransitInfo] Weather fetch failed', e);
    }

    // === TRAFFIC ===
    try {
      const res = await fetch(
        `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lng}&key=${TRAFFIC_API_KEY}`
      );
      if (res.ok) {
        const d = await res.json();
        const flow = d.flowSegmentData;
        if (flow?.currentSpeed && flow?.freeFlowSpeed) {
          const ratio = Math.min(1, flow.currentSpeed / flow.freeFlowSpeed);
          const { label, color, delayFactor } = trafficLabel(ratio);
          trafficResult = {
            currentSpeed: Math.round(flow.currentSpeed),
            freeFlowSpeed: Math.round(flow.freeFlowSpeed),
            ratio,
            label,
            delayFactor,
            color,
          };
        }
      }
    } catch (e) {
      console.warn('[useTransitInfo] Traffic fetch failed', e);
    }

    // Defaults if API fails
    if (!weatherResult) {
      weatherResult = { tempC: 28, description: 'Partly cloudy', icon: '02d', isRaining: false, hasThunder: false, windKmH: 12 };
    }
    if (!trafficResult) {
      const { label, color, delayFactor } = trafficLabel(0.85);
      trafficResult = { currentSpeed: 40, freeFlowSpeed: 50, ratio: 0.8, label, delayFactor, color };
    }

    CACHE[key] = { ts: now, weather: weatherResult, traffic: trafficResult };
    setWeather(weatherResult);
    setTraffic(trafficResult);

    const rainPenalty = weatherResult.isRaining ? 1.3 : 1.0;
    const delayFactor = trafficResult.delayFactor * rainPenalty;
    const adjusted = Math.round(baseEtaSeconds * delayFactor);
    const mins = Math.ceil(adjusted / 60);
    setEta({
      baseSeconds: baseEtaSeconds,
      adjustedSeconds: adjusted,
      delayFactor,
      displayText: mins < 1 ? 'Arriving' : `${mins} min`,
    });

    setLoading(false);
  }, []);

  return { weather, traffic, eta, loading, fetchInfo };
}
