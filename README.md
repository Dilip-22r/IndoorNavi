# Indoor AR Navigation - Block C, Floor 2

A static coordinate-based WebAR navigation system using A-Frame and AR.js.

## 🎯 Project Overview

This system provides indoor navigation for Block-C, Floor 2 using:
- **Camera-relative positioning** (no markers required)
- **3D coordinate-based routes** with predefined paths
- **Glowing neon path visualization** using cylinder segments
- **Directional arrows** every 5 meters
- **Turn indicators** at junctions
- **Destination markers** with floating labels

## 🗺️ Available Routes

Starting from **C-201** (all routes begin here):
1. **C-201 → C-203** (10m straight path)
2. **C-201 → C-205** (15m with right turn)
3. **C-201 → C-214** (20m with right turn)

## 📁 Project Structure

```
indoor-ar-navigation/
├── index.html          # Route selection
├── navigation.html     # 2D map preview
├── ar.html            # AR camera view
├── assets/
│   └── map.png        # Floor map
├── js/
│   ├── routes.js      # 3D coordinate definitions
│   ├── navigation.js  # Navigation logic
│   └── ar.js          # AR rendering engine
├── css/
│   └── style.css      # Styling
└── README.md
```

## 🚀 Quick Start

### 1. Start Local Server
```bash
python -m http.server 8000
```

### 2. Test on Desktop
Open: `http://localhost:8000`

### 3. Test on Mobile (for AR)
```bash
ngrok http 8000
```
Access via the HTTPS URL on your mobile device.

## 📱 Usage Flow

1. **Select Destination**: Choose from C-203, C-205, or C-214
2. **View Map**: See route highlighted on floor map
3. **Open AR View**: Camera opens with navigation visible
4. **Follow Path**: Glowing cyan path with yellow arrows
5. **Turn Points**: Orange animated arrows at turns
6. **Arrive**: Green destination marker with "You Have Arrived" text

## 🔧 Technical Details

### Coordinate System
- **Origin**: C-201 at (0, 0, 0)
- **Forward**: +Z axis
- **Right**: +X axis  
- **Height**: y = 0.1 (just above floor)
- **Segment**: 5 meters

### AR Implementation
- **Navigation Root**: Fixed at `position="0 -1.6 -3"` (camera-relative)
- **Path Rendering**: Cylinder segments with emissive material
- **Material**: Cyan (#00ffff) with 0.8 emissive intensity
- **Animations**: Opacity pulse on paths, bounce on turn arrows

> **Note**: This uses camera-relative positioning, NOT true SLAM or world anchoring.

## 🎨 Visual Elements

- **Glowing Paths**: Cyan cylinders (0.05m radius) with pulse animation
- **Standard Arrows**: Yellow cones (0.15m base) every 5m
- **Turn Arrows**: Orange cones (0.25m base) with bounce animation
- **Destination**: Green cylinder base + floating label

## 🌐 Browser Compatibility

- **Desktop**: Chrome, Edge, Firefox (for testing)
- **Mobile**: Chrome/Safari on iOS/Android
- **Requirement**: HTTPS (via ngrok for mobile)
- **No Special Hardware**: Works with standard webcam/camera

## 📊 Route Specifications

```javascript
C201 → C203:
  Distance: 10m
  Points: 3
  Turns: None
  
C201 → C205:
  Distance: 15m
  Points: 4
  Turns: 1 (right at 10m)
  
C201 → C214:
  Distance: 20m
  Points: 5
  Turns: 1 (right at 10m)
```

## 🎯 Demo Tips for Jury

1. **Show Route Selection**: Clean UI with Block-C branding
2. **Demonstrate Map View**: Highlight how users preview their route
3. **AR Camera Demo**: 
   - Open AR view on phone
   - Show immediate path visibility (no marker needed)
   - Walk through step-by-step navigation
4. **Highlight Features**:
   - Glowing path always visible
   - Arrow guidance every 5m
   - Special turn indicators
   - Clear destination marker

## ⚡ Performance

- Optimized for mobile browsers
- Low-poly arrow models
- Renders only selected route
- Smooth animations at 60fps

## 🔮 Future Enhancements

- Add more rooms (C-202, C-204, etc.)
- Multiple floor support
- Voice navigation
- Dynamic obstacle detection
- QR code starting points

## 📝 License

MIT License - Hackathon Prototype

---

**Built for**: Indoor Navigation Challenge  
**Tech Stack**: HTML5, CSS3, JavaScript, A-Frame, AR.js  
**No Backend Required**: Fully client-side application
