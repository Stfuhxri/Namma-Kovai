<div align="center">

<!-- DYNAMIC ANIMATED HEADER -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=auto&height=220&section=header&text=NAMMA%20KOVAI&fontSize=70&fontAlignY=35&animation=fadeIn&stroke=000000&strokeWidth=2" width="100%" alt="Header Banner" />

### *Crowdsourced Live Bus Telemetry & Spatial Navigation Engine for Coimbatore*

<br />

<!-- BADGES -->
[![Build Status](https://img.shields.io/badge/Build-Passing-2ea44f?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com)
[![Expo](https://img.shields.io/badge/Expo-000000?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![MapLibre](https://img.shields.io/badge/MapLibre_GL-008080?style=for-the-badge&logo=maplibre&logoColor=white)](https://maplibre.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

<br />

<p align="center">
  <b>Namma Kovai</b> transforms public transit in Coimbatore by replacing static timetables with real-time passenger telemetry. 
  By leveraging active commuters as live beacons, it delivers precise GPS tracking, dynamic ETA predictions, and spatial proximity routing.
</p>

---

</div>

<br />

## 🌟 Key Modules & Core Features

<table width="100%">
  <tr>
    <td width="50%" valign="top">
      <h3>📍 Real-Time Vector Mapping</h3>
      <ul>
        <li><b>3D Map Rendering:</b> Powered by MapLibre GL for smooth 60fps vector tile rendering and custom 3D buildings.</li>
        <li><b>Spatial Proximity Query:</b> Automatically detects nearby running buses within a 1–2 km radius using the Haversine formula.</li>
        <li><b>OSRM Path Matching:</b> Snaps coordinate history directly onto real Coimbatore road network polyline paths.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>🤝 Crowdsourced Telemetry</h3>
      <ul>
        <li><b>Single-Tap Beacon:</b> Passengers toggle broadcasting to transform their device into a live transit tracker.</li>
        <li><b>Background Listener:</b> Native task execution via <code>expo-location</code> for continuous streaming with the screen off.</li>
        <li><b>Zero-Lag Sync:</b> Optimized GPS update intervals reduce battery drain while preserving spatial precision.</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🌤️ Contextual Route Analytics</h3>
      <ul>
        <li><b>Live Route Weather:</b> Displays weather and temperature overlays for active walking or waiting segments.</li>
        <li><b>Traffic Congestion:</b> Evaluates road segment travel speeds to provide delay-adjusted ETAs.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>🚨 Passenger Safety Suite</h3>
      <ul>
        <li><b>Emergency SOS Dispatch:</b> Instant one-tap access to emergency services and safety dispatch.</li>
        <li><b>Anonymous Telemetry:</b> Rider coordinate streams are completely stripped of personal identifiers.</li>
      </ul>
    </td>
  </tr>
</table>

<br />

## 🛠️ Technical Architecture & Stack

| Layer | Technology | Function & Implementation Details |
| :--- | :--- | :--- |
| **Frontend Core** | `React Native` / `Expo Prebuild` | Cross-platform native execution compiled for high-framerate map rendering |
| **Language** | `TypeScript` (Strict Mode) | Strong type safety across location payloads, MapLibre features, and state |
| **Map Engine** | `@maplibre/maplibre-react-native` | Hardware-accelerated OpenGL/Metal vector tile map renderer |
| **Geolocation** | `expo-location` | Native Android/iOS location services for foreground & background tracking |
| **Routing Engine**| `OSRM` (Open Source Routing Machine) | Map-matching algorithms and real-time path polyline calculations |

<br />

## ⚡ Live Telemetry Architecture Workflow

```text
 ┌────────────────────────┐      ┌─────────────────────────┐      ┌────────────────────────┐
 │   PASSENGER BOARDING   │ ───► │  BACKGROUND TELEMETRY   │ ───► │   BROADCAST NETWORK    │
 │ Taps "I AM ON THIS BUS"│      │ Native GPS Task (`expo`)│      │ Coordinates Streamed   │
 └────────────────────────┘      └─────────────────────────┘      └───────────┬────────────┘
                                                                              │
 ┌────────────────────────┐      ┌─────────────────────────┐                  │
 │    PASSENGER EXIT      │ ◄─── │    LIVE MAP UPDATES     │ ◄────────────────┘
 │ Taps "LEAVE BUS" Mode  │      │ 60FPS MapLibre Marker   │
 └────────────────────────┘      └─────────────────────────┘
```
<br />

# 🚀 Detailed Setup & Installation Guide

Ensure your development workstation meets the following dependency specifications before building:

* **Node.js**: `v18.0.0` or higher
* **npm**: `v9.0.0` or higher (or `yarn` / `pnpm`)
* **Android Studio**: Android SDK Platform Level 33+ (configured with `ANDROID_HOME`)
* **JDK**: Java Development Kit 17
* **Expo CLI**: Executable via `npx`

---

### Step 1: Clone Repository & Navigate

```bash
# Clone the repository
git clone [https://github.com/your-username/namma-kovai.git](https://github.com/your-username/namma-kovai.git)

# Move into the mobile application package directory
cd namma-kovai/mobile
```
### Step 2: Environment Configuration
**Create a .env file inside the mobile/ directory and configure your network endpoints:**
```bash
# Network Endpoints
OSRM_ROUTING_SERVER_URL=[https://router.project-osrm.org](https://router.project-osrm.org)
API_GATEWAY_URL=[https://your-api-gateway.com](https://your-api-gateway.com)

# Telemetry Config
GPS_UPDATE_INTERVAL_MS=3000
GPS_DISTANCE_INTERVAL_METERS=5
```
### Step 3: Install Native Dependencie
```bash
# Install node dependencies
npm install
```
### Step 4: Native Prebuild & Local Execution
```bash
# Generate /android and /ios native project directories
npx expo prebuild

# Run on a connected Android Device or Emulator
npx expo run:android

# Start the Metro Bundler
npx expo start
```

📖 Deep-Dive Usage Guide
🤝 Contributing & Code Standards
Contributions make the open-source community an incredible place to learn, inspire, and create.

Fork the Repository.

Create a Feature Branch:

Bash
git checkout -b feature/SpatialProximityOptimization
Commit your Changes using standard convention:

Bash
git commit -m 'feat: optimize Haversine distance spatial query'
Push to the Branch:

Bash
git push origin feature/SpatialProximityOptimization
Open a Pull Request for code review.

📄 License
Distributed under the MIT License. See LICENSE for full details.
