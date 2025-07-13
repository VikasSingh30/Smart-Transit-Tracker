# 🚌 SmartTransitTracker

**SmartTransitTracker** is a modern web application that dynamically visualizes nearby transit stops using your live geolocation, optimized background processing, and responsive canvas rendering.

---

## ✨ Features

- 📍 Real-time location tracking via [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)<br>
- 🌐 Network-adaptive behavior using [Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation)<br>
- 🖼️ Interactive map rendered via [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)<br>
- 👁️ Visibility-based optimization using [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)<br>
- 💤 Background tasks scheduled using [Background Tasks (`requestIdleCallback`)](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback)<br>
- 📊 Real-time performance and resource monitoring<br>
- 🚦 Dynamic transit stop simulation (arrivals, routes, delays)<br>

---

## 🛠️ Technologies Used

- **HTML5**<br>
- **CSS3**<br>
- **Vanilla JavaScript (ES6+)**<br>
- Web APIs:<br>
  - [`navigator.geolocation`](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition)<br>
  - [`navigator.connection`](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation)<br>
  - [`IntersectionObserver`](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)<br>
  - [`requestIdleCallback`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback)<br>
  - [`CanvasRenderingContext2D`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)<br>

---

## 🚀 Getting Started

### 1. Clone or Download the Project

```bash
git clone https://github.com/your-username/SmartTransitTracker.git
cd SmartTransitTracker
```

### 2. Run Locally (Recommended)
```bash
# Using Node's serve
npx serve .

# OR using Python
python3 -m http.server 8080
```
Then open http://localhost:8080 in your browser.

---

## 📂 Editable Files
You can edit these files anytime via terminal or your code editor:<br>

  index.html — Main HTML with embedded JavaScript<br>
  README.md — This documentation (editable via nano README.md)<br>
  style.css (optional) — If CSS is split from HTML<br>

## 📍 Permissions & Fallback

  If location access is denied, a fallback dialog guides the user<br>
  Default location is Mumbai, India if geolocation fails<br>
  Dialog explains how to re-enable location in browser settings<br>

## 📶 API Behavior Based on Network

Using the NetworkInformation API, SmartTransitTracker optimizes:<br>

| Connection Type | Update Interval | Max Stops |
| --------------- | --------------- | --------- |
| slow-2g / 2g    | 30s             | 5         |
| 3g              | 15s             | 10        |
| 4g / Wi-Fi      | 5s              | 20        |


## 📈 Performance Monitoring

Live updates include:<br>

🎯 FPS-based frame rate checks:<br>

  ✅ Good: > 45 FPS<br>
  ⚠️ Fair: 30–45 FPS<br>
  ❌ Poor: < 30 FPS<br>

🔄 Background Task Count<br>
👁️ Number of Visible Transit Stops<br>
💾 Simulated Data Usage<br>

## 🔄 Refresh & Controls

UI buttons:<br>
  🔄 Refresh Stops<br>
  📍 Center on Me<br>
  ⚙️ Location Settings<br>
  📶 Optimize Performance<br>
  ⏯️ Background Updates Toggle<br>

## 🧠 Customization Guide

You can easily adjust:<br>
| Feature                    | Location in Code                      |
| -------------------------- | ------------------------------------- |
| Transit routes             | `routes[]` in `generateTransitData()` |
| Stop radius                | `distance` generation logic           |
| Canvas grid/colors         | Inside `drawMap()`                    |
| Location accuracy fallback | `handleLocationError()`               |
| Max stops & intervals      | `optimizeForNetwork()`                |
| Default city               | `Mumbai` → change in fallback object  |

## 🧪 API Compatibility

| Feature               | Supported Browsers              |
| --------------------- | ------------------------------- |
| Geolocation API       | ✅ All major browsers           |
| Network Info API      | ⚠️ Chrome, Edge only            |
| Intersection Observer | ✅ Modern browsers              |
| `requestIdleCallback` | ⚠️ Most Chromium-based browsers |
| Canvas API            | ✅ All browsers                 |

## 🧑‍💻 Author

Vikas Singh<br>
Email: singhvikas.sv30@gmail.com<br>
GitHub: VikasSingh30<br>

## 📜 License

This project is licensed under the MIT License.<br>
Feel free to fork, modify, or contribute.<br>