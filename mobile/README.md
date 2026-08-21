# 🚌 Namma Kovai
**A Crowdsourced Live Bus Tracking Application for Coimbatore**

Namma Kovai is a community-driven transit application that helps daily commuters in Coimbatore track buses in real-time, get accurate ETAs, and contribute to the live network by sharing their ride location.

## ✨ Features
*   **📍 Real-time Bus Tracking:** View live bus locations on a 3D-capable MapLibre interactive map.
*   **🤝 Crowdsourced Live Location:** Passengers can tap "I AM ON THIS BUS" to anonymously share their GPS location and act as a live beacon for the bus.
*   **🎯 Nearby Bus Detection:** Automatically detects and displays active buses within your vicinity using high-accuracy geolocation.
*   **🌤️ Route Transit Info:** View weather conditions and traffic severity for the exact route you are taking.
*   **🚨 SOS Integration:** Emergency quick-access buttons for passenger safety.

## 🛠️ Tech Stack
*   **Framework:** React Native / Expo (Prebuild)
*   **Language:** TypeScript
*   **Maps:** MapLibre GL (`@maplibre/maplibre-react-native`)
*   **Location:** `expo-location` (Foreground & Background Tracking)
*   **Routing:** OSRM (Open Source Routing Machine)

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   Android Studio / Android SDK (for running locally)
*   Expo CLI

### Installation
1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/namma-kovai.git
    cd namma-kovai/mobile
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the Metro bundler:
    ```bash
    npx expo start
    ```

### Building the APK
To build a production-ready Android APK locally without using EAS Cloud:
```bash
cd android
./gradlew assembleRelease
```
The resulting file will be located at `android/app/build/outputs/apk/release/app-release.apk`.

## 📜 License
This project is licensed under the **MIT License**. See the `LICENSE` file for details.
