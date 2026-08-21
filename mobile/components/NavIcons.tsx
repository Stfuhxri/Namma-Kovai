import React from 'react';
import { View, StyleSheet } from 'react-native';

interface IconProps {
  size?: number;
  focused?: boolean;
  color?: string;
}

export const HomeIcon: React.FC<IconProps> = ({ size = 24, focused = false, color }) => {
  const activeColor = color || (focused ? '#4F46E5' : '#94A3B8');
  return (
    <View style={[styles.iconWrapper, { width: size, height: size }]}>
      {/* Roof triangle */}
      <View style={[styles.homeRoof, { borderBottomColor: activeColor }]} />
      {/* House base */}
      <View style={[styles.homeBase, { backgroundColor: activeColor }]}>
        {/* Door */}
        <View style={styles.homeDoor} />
      </View>
    </View>
  );
};

export const SearchIcon: React.FC<IconProps> = ({ size = 24, focused = false, color }) => {
  const strokeColor = color || (focused ? '#4F46E5' : '#475569');
  return (
    <View style={[styles.iconWrapper, { width: size, height: size }]}>
      {/* Lens Circle */}
      <View style={[styles.searchLens, { borderColor: strokeColor }]} />
      {/* Handle Line */}
      <View style={[styles.searchHandle, { backgroundColor: strokeColor }]} />
    </View>
  );
};

export const MapIcon: React.FC<IconProps> = ({ size = 24, focused = false }) => {
  const mapBg = focused ? '#34D399' : '#A7F3D0';
  const pinBg = focused ? '#2563EB' : '#60A5FA';

  return (
    <View style={[styles.iconWrapper, { width: size, height: size }]}>
      {/* Folded Map Canvas */}
      <View style={[styles.mapCanvas, { backgroundColor: mapBg }]}>
        <View style={styles.mapLine} />
      </View>
      {/* Pin Badge */}
      <View style={[styles.mapPin, { backgroundColor: pinBg }]}>
        <View style={styles.mapPinDot} />
      </View>
    </View>
  );
};

export const PassesIcon: React.FC<IconProps> = ({ size = 24, focused = false }) => {
  const passBg = focused ? '#F59E0B' : '#FCD34D';

  return (
    <View style={[styles.iconWrapper, { width: size, height: size }]}>
      <View style={[styles.passCard, { backgroundColor: passBg }]}>
        {/* Dashed divider */}
        <View style={styles.passDashes} />
        {/* Pass lines */}
        <View style={styles.passLineGroup}>
          <View style={styles.passLine1} />
          <View style={styles.passLine2} />
        </View>
      </View>
    </View>
  );
};

export const ProfileIcon: React.FC<IconProps> = ({ size = 24, focused = false, color }) => {
  const activeColor = color || (focused ? '#6366F1' : '#94A3B8');

  return (
    <View style={[styles.iconWrapper, { width: size, height: size }]}>
      {/* Head */}
      <View style={[styles.profileHead, { backgroundColor: activeColor }]} />
      {/* Shoulders */}
      <View style={[styles.profileBody, { backgroundColor: activeColor }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Home Icon
  homeRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  homeBase: {
    width: 14,
    height: 11,
    marginTop: -1,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  homeDoor: {
    width: 4,
    height: 6,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
  },

  // Search Icon
  searchLens: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    borderWidth: 2.2,
    position: 'absolute',
    top: 2,
    left: 2,
  },
  searchHandle: {
    width: 2.4,
    height: 7.5,
    borderRadius: 1.2,
    position: 'absolute',
    bottom: 2,
    right: 3,
    transform: [{ rotate: '-45deg' }],
  },

  // Map Icon
  mapCanvas: {
    width: 20,
    height: 14,
    borderRadius: 3,
    position: 'absolute',
    bottom: 1,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  mapLine: {
    width: 1,
    height: '100%',
    backgroundColor: '#10B981',
    alignSelf: 'center',
  },
  mapPin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 1,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    elevation: 2,
  },
  mapPinDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ffffff',
  },

  // Passes Icon
  passCard: {
    width: 20,
    height: 14,
    borderRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 3,
    justifyContent: 'space-between',
  },
  passDashes: {
    width: 1.5,
    height: 10,
    backgroundColor: '#ffffff',
    borderRadius: 1,
  },
  passLineGroup: {
    flex: 1,
    marginLeft: 3,
    gap: 2,
  },
  passLine1: {
    width: 10,
    height: 2,
    backgroundColor: '#ffffff',
    borderRadius: 1,
  },
  passLine2: {
    width: 7,
    height: 2,
    backgroundColor: '#ffffff',
    borderRadius: 1,
  },

  // Profile Icon
  profileHead: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    marginBottom: 1,
  },
  profileBody: {
    width: 17,
    height: 9,
    borderTopLeftRadius: 8.5,
    borderTopRightRadius: 8.5,
  },
});
