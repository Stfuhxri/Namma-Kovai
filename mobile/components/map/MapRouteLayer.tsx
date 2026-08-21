import React from 'react';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { Colors } from '@/constants/theme';

interface MapRouteLayerProps {
  id?: string;
  routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> | GeoJSON.FeatureCollection<GeoJSON.LineString>;
  color?: string;
  lineWidth?: number;
  lineOpacity?: number;
}

export const MapRouteLayer: React.FC<MapRouteLayerProps> = ({
  id = 'transit-route',
  routeGeoJSON,
  color = Colors.secondary,
  lineWidth = 5,
  lineOpacity = 0.85,
}) => {
  return (
    <MapLibreGL.ShapeSource id={`${id}-source`} shape={routeGeoJSON}>
      <MapLibreGL.LineLayer
        id={`${id}-casing`}
        style={{
          lineColor: '#000000',
          lineWidth: lineWidth + 3,
          lineCap: 'round',
          lineJoin: 'round',
          lineOpacity: 0.9,
        }}
      />
      <MapLibreGL.LineLayer
        id={`${id}-line`}
        style={{
          lineColor: color,
          lineWidth: lineWidth,
          lineCap: 'round',
          lineJoin: 'round',
          lineOpacity: lineOpacity,
        }}
      />
    </MapLibreGL.ShapeSource>
  );
};
