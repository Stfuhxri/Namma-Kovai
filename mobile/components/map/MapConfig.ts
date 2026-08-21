/**
 * MapLibre & Transit Map Configuration for Namma Kovai
 * Default center: Coimbatore, Tamil Nadu (76.9558° E, 11.0168° N)
 */

export const COIMBATORE_CENTER: [number, number] = [76.9558, 11.0168];
export const DEFAULT_ZOOM = 13;

export const DEMO_ROUTE_LINE_GEOJSON: GeoJSON.Feature<GeoJSON.LineString> = {
  type: 'Feature',
  properties: {
    routeId: '11A',
    routeName: 'Gandhipuram to Singanallur',
    color: '#af2800',
  },
  geometry: {
    type: 'LineString',
    coordinates: [
      [76.9634, 11.0183], // Gandhipuram
      [76.9740, 11.0170],
      [76.9850, 11.0150],
      [77.0031, 11.0245], // PSG Tech
      [77.0125, 11.0254], // Hope College
      [77.0270, 10.9996], // Singanallur
    ],
  },
};

/**
 * Self-contained Offline Vector Style
 * Guarantees instantaneous rendering even if device/emulator DNS is offline
 */
export const OFFLINE_MAP_STYLE = {
  version: 8,
  name: 'Namma Kovai Offline Vector Style',
  sources: {
    'cbe-route': {
      type: 'geojson',
      data: DEMO_ROUTE_LINE_GEOJSON,
    },
  },
  layers: [
    {
      id: 'bg-canvas',
      type: 'background',
      paint: {
        'background-color': '#eef2f5',
      },
    },
    {
      id: 'route-line-bg',
      type: 'line',
      source: 'cbe-route',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#000000',
        'line-width': 8,
        'line-opacity': 0.15,
      },
    },
    {
      id: 'route-line-fg',
      type: 'line',
      source: 'cbe-route',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#af2800',
        'line-width': 4,
        'line-opacity': 0.9,
      },
    },
  ],
};

export const OSM_RASTER_STYLE = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export const MAP_STYLES = {
  OSM: OSM_RASTER_STYLE,
  VOYAGER: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  LIGHT: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  DARK: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  OFFLINE: OFFLINE_MAP_STYLE,
} as const;


export type MapStyleType = keyof typeof MAP_STYLES;

export interface TransitStop {
  id: string;
  name: string;
  nameTa?: string;
  coordinates: [number, number]; // [longitude, latitude]
  type: 'bus_stop' | 'bus_terminal' | 'railway_station' | 'airport';
}

export interface LiveBus {
  id: string;
  routeNumber: string;
  destination: string;
  coordinates: [number, number];
  heading: number;
  speedKmH: number;
  status?: 'MOVING' | 'STOPPED' | 'active' | 'idle' | 'unknown';
  currentStopName?: string;
  nextStopName?: string;
  etaNextStopSec?: number;
  color?: string;
  occupancy?: 'EMPTY' | 'FEW_SEATS' | 'STANDING_ONLY' | 'FULL' | string;
}



export const COIMBATORE_STOPS: TransitStop[] = [
  {
    id: 'stop-gandhipuram',
    name: 'Gandhipuram Central Bus Stand',
    nameTa: 'காந்திபுரம் பஸ் ஸ்டாண்ட்',
    coordinates: [76.9634, 11.0183],
    type: 'bus_terminal',
  },
  {
    id: 'stop-ukkadam',
    name: 'Ukkadam Bus Stand',
    nameTa: 'உக்கடம் பஸ் ஸ்டாண்ட்',
    coordinates: [76.9620, 10.9926],
    type: 'bus_terminal',
  },
  {
    id: 'stop-singanallur',
    name: 'Singanallur Bus Stand',
    nameTa: 'சிங்கநல்லூர் பஸ் ஸ்டாண்ட்',
    coordinates: [77.0270, 10.9996],
    type: 'bus_terminal',
  },
  {
    id: 'stop-railway-station',
    name: 'Coimbatore Junction Railway Station',
    nameTa: 'கோயம்பத்தூர் சந்திப்பு',
    coordinates: [76.9674, 10.9980],
    type: 'railway_station',
  },
  {
    id: 'stop-hope-college',
    name: 'Hope College',
    nameTa: 'ஹோப் காலேஜ்',
    coordinates: [77.0125, 11.0254],
    type: 'bus_stop',
  },
  {
    id: 'stop-psg-tech',
    name: 'PSG Tech Peelamedu',
    nameTa: 'பிஎஸ்ஜி டெக்',
    coordinates: [77.0031, 11.0245],
    type: 'bus_stop',
  },
  {
    id: 'stop-airport',
    name: 'Coimbatore International Airport',
    nameTa: 'கோயம்புத்தூர் விமான நிலையம்',
    coordinates: [77.0434, 11.0300],
    type: 'airport',
  },
];

export const DEMO_LIVE_BUSES: LiveBus[] = [
  {
    id: 'bus-11a',
    routeNumber: '11A',
    destination: 'Singanallur',
    coordinates: [76.9850, 11.0150],
    heading: 105,
    speedKmH: 28,
  },
  {
    id: 'bus-70',
    routeNumber: '70',
    destination: 'Marudhamalai',
    coordinates: [76.9400, 11.0220],
    heading: 270,
    speedKmH: 35,
  },
  {
    id: 'bus-45b',
    routeNumber: '45B',
    destination: 'Ukkadam',
    coordinates: [76.9710, 11.0060],
    heading: 180,
    speedKmH: 22,
  },
];

/**
 * Utility to convert raw coordinate array to GeoJSON LineString feature
 */
export function createLineGeoJSON(
  coordinates: [number, number][],
  properties: Record<string, any> = {}
): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    properties,
    geometry: {
      type: 'LineString',
      coordinates,
    },
  };
}

