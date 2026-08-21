/**
 * Unit Tests — GPS Aggregator
 *
 * These tests run with zero Firebase dependencies.
 * Run: cd functions && npx jest aggregator --verbose
 */

import {
  haversineMeters,
  isOnRoute,
  isSpeedPlausible,
  weightByRecency,
  aggregateBusPosition,
  LocationReport,
  RoutePolyline,
} from '../src/aggregator';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const NOW = 1_700_000_000_000; // Fixed timestamp for deterministic tests

function makeReport(
  overrides: Partial<LocationReport> = {}
): LocationReport {
  return {
    busId: 'bus-1',
    userId: 'user-1',
    lat: 11.0168,
    lng: 76.9558,
    speed: 20,
    heading: 90,
    accuracy: 10,
    timestamp: NOW - 5000, // 5 seconds ago
    ...overrides,
  };
}

// Simple straight-line route polyline for Gandhipuram area
const ROUTE_POLYLINE: RoutePolyline = {
  points: [
    { lat: 11.0168, lng: 76.9558 }, // Gandhipuram
    { lat: 11.0100, lng: 76.9620 }, // Lakshmi Mills
    { lat: 11.0050, lng: 76.9680 }, // Cross Cut
  ],
};

// ─── haversineMeters ──────────────────────────────────────────────────────────
describe('haversineMeters', () => {
  test('returns 0 for identical points', () => {
    expect(haversineMeters({ lat: 11.0, lng: 76.9 }, { lat: 11.0, lng: 76.9 })).toBe(0);
  });

  test('returns ~111km per degree latitude', () => {
    const dist = haversineMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(dist).toBeGreaterThan(110_000);
    expect(dist).toBeLessThan(112_000);
  });

  test('real distance: Gandhipuram to Ukkadam ~4km', () => {
    const dist = haversineMeters(
      { lat: 11.0168, lng: 76.9558 },
      { lat: 10.9920, lng: 76.9780 }
    );
    expect(dist).toBeGreaterThan(3000);
    expect(dist).toBeLessThan(5000);
  });
});

// ─── isOnRoute ────────────────────────────────────────────────────────────────
describe('isOnRoute', () => {
  test('accepts point on the route (within 50m)', () => {
    // Midpoint of the first segment
    const midpoint = {
      lat: (11.0168 + 11.0100) / 2,
      lng: (76.9558 + 76.9620) / 2,
    };
    expect(isOnRoute(midpoint, ROUTE_POLYLINE)).toBe(true);
  });

  test('rejects point 500m off route', () => {
    // Point far south of the route
    const offRoute = { lat: 10.9800, lng: 76.9000 };
    expect(isOnRoute(offRoute, ROUTE_POLYLINE, 300)).toBe(false);
  });

  test('accepts point within threshold', () => {
    const nearRoute = { lat: 11.0155, lng: 76.9560 }; // close to Gandhipuram
    expect(isOnRoute(nearRoute, ROUTE_POLYLINE, 300)).toBe(true);
  });

  test('allows anything when polyline has fewer than 2 points', () => {
    const emptyPolyline: RoutePolyline = { points: [{ lat: 11.0, lng: 76.9 }] };
    expect(isOnRoute({ lat: 0, lng: 0 }, emptyPolyline)).toBe(true);
  });
});

// ─── isSpeedPlausible ─────────────────────────────────────────────────────────
describe('isSpeedPlausible', () => {
  test('accepts slow bus (20 km/h)', () => {
    const prev = makeReport({ lat: 11.0168, lng: 76.9558, timestamp: NOW - 10000 });
    // ~56m in 10 seconds ≈ 20km/h
    const next = makeReport({ lat: 11.0173, lng: 76.9562, timestamp: NOW });
    expect(isSpeedPlausible(prev, next)).toBe(true);
  });

  test('rejects 200 km/h movement', () => {
    const prev = makeReport({ lat: 11.0168, lng: 76.9558, timestamp: NOW - 1000 }); // 1 second ago
    // ~555m in 1 second ≈ 2000km/h
    const next = makeReport({ lat: 11.0218, lng: 76.9558, timestamp: NOW });
    expect(isSpeedPlausible(prev, next)).toBe(false);
  });

  test('rejects non-positive time difference', () => {
    const report = makeReport({ timestamp: NOW });
    expect(isSpeedPlausible(report, report)).toBe(false);
  });
});

// ─── weightByRecency ──────────────────────────────────────────────────────────
describe('weightByRecency', () => {
  test('fresh report (0s ago) has weight ≈ 1', () => {
    expect(weightByRecency(NOW, NOW)).toBeCloseTo(1.0, 5);
  });

  test('report exactly 1 half-life ago has weight ≈ 0.5', () => {
    const halfLifeSec = 15;
    expect(weightByRecency(NOW - halfLifeSec * 1000, NOW, halfLifeSec)).toBeCloseTo(0.5, 2);
  });

  test('very old report (5 min) has weight < 0.01', () => {
    expect(weightByRecency(NOW - 300_000, NOW)).toBeLessThan(0.01);
  });
});

// ─── aggregateBusPosition ─────────────────────────────────────────────────────
describe('aggregateBusPosition', () => {
  test('returns null for empty reports', () => {
    expect(aggregateBusPosition([])).toBeNull();
  });

  test('returns null for all stale reports (>60s)', () => {
    const staleReport = makeReport({ timestamp: NOW - 65_000 });
    expect(aggregateBusPosition([staleReport], NOW)).toBeNull();
  });

  test('single reporter returns that point', () => {
    const report = makeReport({ lat: 11.0168, lng: 76.9558 });
    const result = aggregateBusPosition([report], NOW);
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(11.0168, 4);
    expect(result!.lng).toBeCloseTo(76.9558, 4);
    expect(result!.contributingUsers).toBe(1);
  });

  test('bad-faith reporter cannot significantly move aggregate', () => {
    // 5 honest reporters near Gandhipuram
    const honestReports: LocationReport[] = Array.from({ length: 5 }, (_, i) =>
      makeReport({
        userId: `honest-${i}`,
        lat: 11.0168 + (Math.random() - 0.5) * 0.0002, // within ~10m
        lng: 76.9558 + (Math.random() - 0.5) * 0.0002,
        timestamp: NOW - i * 2000,
      })
    );

    // 1 bad-faith reporter claiming bus is at Airport (far away)
    const badFaithReport = makeReport({
      userId: 'bad-user',
      lat: 11.0297, // Airport location
      lng: 77.0437,
      timestamp: NOW - 1000,
    });

    const result = aggregateBusPosition(
      [...honestReports, badFaithReport],
      NOW,
      ROUTE_POLYLINE // polyline will filter out the airport location
    );

    // The bad-faith airport report should be filtered by isOnRoute
    // Result should be near Gandhipuram, not near Airport
    if (result) {
      expect(result.lat).toBeCloseTo(11.0168, 1);
      expect(result.lng).toBeCloseTo(76.9558, 1);
    }
  });

  test('rejects all low-accuracy reports', () => {
    const inaccurateReport = makeReport({ accuracy: 100 }); // 100m accuracy
    expect(aggregateBusPosition([inaccurateReport], NOW)).toBeNull();
  });

  test('multiple users → correct contributingUsers count', () => {
    const reports = [
      makeReport({ userId: 'user-a', lat: 11.0170, timestamp: NOW - 5000 }),
      makeReport({ userId: 'user-b', lat: 11.0172, timestamp: NOW - 3000 }),
      makeReport({ userId: 'user-c', lat: 11.0168, timestamp: NOW - 1000 }),
    ];
    const result = aggregateBusPosition(reports, NOW);
    expect(result?.contributingUsers).toBe(3);
  });

  test('weighted median prefers most recent report', () => {
    const older = makeReport({ lat: 11.0000, timestamp: NOW - 55_000 }); // 55s ago, weight ≈ 0.003
    const recent = makeReport({
      userId: 'user-2', // different user so both are included
      lat: 11.0200,
      timestamp: NOW - 1000, // 1s ago, weight ≈ 0.95
    });
    // Add more recent reporters to ensure the median falls on the recent side
    const recent2 = makeReport({ userId: 'user-3', lat: 11.0200, timestamp: NOW - 2000 });
    const result = aggregateBusPosition([older, recent, recent2], NOW);

    // Result should be closer to the recent report (11.0200) than the old one (11.0000)
    expect(result).not.toBeNull();
    expect(result!.lat).toBeGreaterThan(11.01);
  });
});
