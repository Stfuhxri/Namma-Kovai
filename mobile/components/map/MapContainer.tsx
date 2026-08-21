import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { Colors, Shadows, BorderRadius, Spacing } from '@/constants/theme';
import { COIMBATORE_CENTER, DEFAULT_ZOOM, MAP_STYLES, MapStyleType } from './MapConfig';

// Initialize MapLibre module
MapLibreGL.setAccessToken(null);

export interface MapContainerProps {
  style?: any;
  children?: React.ReactNode;
  initialCenter?: [number, number];
  initialZoom?: number;
  showControls?: boolean;
  showUserLocation?: boolean;
  mapStyle?: MapStyleType;
  onPressMap?: (feature: any) => void;
  cameraRef?: any;
}

export const MapContainer = forwardRef<any, MapContainerProps>((props, ref) => {
  const {
    style,
    children,
    initialCenter = COIMBATORE_CENTER,
    initialZoom = DEFAULT_ZOOM,
    showControls = true,
    showUserLocation = true,
    mapStyle,
    onPressMap,
    cameraRef: externalCameraRef,
  } = props;

  const [internalStyle, setInternalStyle] = useState<MapStyleType>('OSM');
  const [currentZoom, setCurrentZoom] = useState<number>(initialZoom);
  const internalCameraRef = useRef<any>(null);
  const hasCenteredOnUser = useRef(false);

  const activeCameraRef = externalCameraRef || internalCameraRef;

  useImperativeHandle(ref, () => activeCameraRef.current);

  const currentStyle = mapStyle || internalStyle;

  // Request location permission and do a ONE-SHOT fly-to on the user's position.
  // After the initial center, the camera is fully free — no persistent follow lock.
  useEffect(() => {
    if (!showUserLocation) return;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      if (hasCenteredOnUser.current) return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      hasCenteredOnUser.current = true;

      activeCameraRef.current?.setCamera({
        centerCoordinate: [loc.coords.longitude, loc.coords.latitude],
        zoomLevel: 15,
        animationDuration: 800,
        animationMode: 'flyTo',
      });
    })();
  }, [showUserLocation]);

  const handleLocateMe = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      activeCameraRef.current?.setCamera({
        centerCoordinate: [loc.coords.longitude, loc.coords.latitude],
        zoomLevel: 16,
        animationDuration: 600,
        animationMode: 'flyTo',
      });
    } catch {
      activeCameraRef.current?.setCamera({
        centerCoordinate: initialCenter,
        zoomLevel: initialZoom,
        animationDuration: 800,
      });
    }
  };

  const handleZoomIn = () => {
    const nextZoom = Math.min(currentZoom + 1, 22);
    setCurrentZoom(nextZoom);
    activeCameraRef.current?.setCamera({
      zoomLevel: nextZoom,
      animationDuration: 250,
    });
  };

  const handleZoomOut = () => {
    const nextZoom = Math.max(currentZoom - 1, 1);
    setCurrentZoom(nextZoom);
    activeCameraRef.current?.setCamera({
      zoomLevel: nextZoom,
      animationDuration: 250,
    });
  };

  const toggleStyle = () => {
    const stylesList: MapStyleType[] = ['OSM', 'VOYAGER', 'LIGHT', 'DARK', 'OFFLINE'];
    const nextIndex = (stylesList.indexOf(currentStyle) + 1) % stylesList.length;
    setInternalStyle(stylesList[nextIndex]);
  };

  const getStyleLabel = (styleType: MapStyleType) => {
    switch (styleType) {
      case 'OSM':     return '🗺️ OSM';
      case 'VOYAGER': return '🧭 Voyager';
      case 'LIGHT':   return '☀️ Light';
      case 'DARK':    return '🌙 Dark';
      case 'OFFLINE': return '📍 Vector';
      default:        return '🗺️ Map';
    }
  };

  return (
    <View style={[styles.container, style]}>
      <MapLibreGL.MapView
        key={`map-view-${currentStyle}`}
        style={styles.map}
        mapStyle={MAP_STYLES[currentStyle] as any}
        logoEnabled={false}
        attributionEnabled={false}
        onPress={onPressMap}
        scrollEnabled={true}
        zoomEnabled={true}
        rotateEnabled={true}
        pitchEnabled={true}
      >
        {/* Camera with NO followUserLocation — completely free pan and pinch zoom */}
        <MapLibreGL.Camera
          ref={activeCameraRef}
          defaultSettings={{
            centerCoordinate: initialCenter,
            zoomLevel: initialZoom,
          }}
        />

        {showUserLocation && (
          <MapLibreGL.UserLocation
            visible={true}
            showsUserHeadingIndicator={true}
            androidRenderMode="gps"
          />
        )}

        {children}
      </MapLibreGL.MapView>

      {showControls && (
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={toggleStyle}
            activeOpacity={0.8}
          >
            <Text style={styles.controlText}>{getStyleLabel(currentStyle)}</Text>
          </TouchableOpacity>

          {showUserLocation && (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleLocateMe}
              activeOpacity={0.8}
            >
              <Text style={styles.controlText}>📍 Me</Text>
            </TouchableOpacity>
          )}

          <View style={styles.zoomGroup}>
            <TouchableOpacity
              style={[styles.controlButton, styles.zoomBtn]}
              onPress={handleZoomIn}
              activeOpacity={0.8}
            >
              <Text style={styles.zoomText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, styles.zoomBtn]}
              onPress={handleZoomOut}
              activeOpacity={0.8}
            >
              <Text style={styles.zoomText}>−</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
});


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surfaceContainer,
  },
  map: {
    flex: 1,
  },
  controlsContainer: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: 'column',
    gap: 8,
    zIndex: 10,
  },
  controlButton: {
    backgroundColor: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  controlText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'GeneralSans-Semibold',
  },

  zoomGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  zoomBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 32,
  },
  zoomText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 18,
  },
});
