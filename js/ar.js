
let currentStepIndex = 0;
let navigationPathPoints = [];
let route = null; // Defined in routes.js but accessed here
let heightOffset = 0; // Height adjustment state


function loadAR() {
    console.log("AR Script Starting...");
    
    // 1. Try loading Custom Route from LocalStorage (Priority for SmartNavigation)
    const customRouteData = localStorage.getItem('currentRoute');
    if (customRouteData) {
        try {
            route = JSON.parse(customRouteData);
            console.log("Loaded Custom Route from Storage:", route);
            
            if (route.points && route.points.length > 0) {
                navigationPathPoints = route.points;
                currentStepIndex = 0;
                renderCurrentSegment();
                
                // Update UI Labels
                const destText = document.getElementById('destinationText');
                const destName = localStorage.getItem('destination') || "Unknown";
                if (destText) destText.setAttribute('value', "Target: " + destName);
                
                return; // Success!
            }
        } catch (e) {
            console.error("Failed to parse custom route:", e);
        }
    }

    // 2. Fallback to Legacy URL Param (if any)
    const urlParams = new URLSearchParams(window.location.search);
    let routeId = urlParams.get('route');

    if (routeId && typeof navigationData !== 'undefined' && navigationData.routes[routeId]) {
         console.log("Legacy Route loaded: " + routeId);
         route = navigationData.routes[routeId];
         navigationPathPoints = route.points;
         currentStepIndex = 0;
         renderCurrentSegment();
    } else {
        console.error("No valid route found in Storage or URL.");
        const arText = document.getElementById('arText');
        if (arText) {
            arText.textContent = "Error: No Navigation Data";
            arText.style.color = 'red';
        }
    }
}

// --- RENDERER (NEON STYLE + HEIGHT SUPPORT) ---

// Ensure root is at correct height
function updateRootPosition() {
    const root = document.getElementById('navigationRoot');
    if (!root) return;
    const baseHeight = -1.6; // Floor level assumes camera at 1.6m
    const newY = baseHeight + heightOffset;
    root.setAttribute('position', `0 ${newY} 0`);
    console.log(`Height adjusted to: ${newY}`);
}

function adjustHeight(delta) {
    heightOffset += delta;
    updateRootPosition();
    // Feedback
    const arText = document.getElementById('arText');
    if (arText) arText.textContent = `Height Offset: ${heightOffset.toFixed(1)}m`;
    
    // Restore instructions after 2s
    setTimeout(updateInstructions, 2000);
}

function renderCurrentSegment() {
    try {
        const root = document.getElementById('navigationRoot');
        if (!root) return;
        
        updateRootPosition();

        // 1. Clear previous
        while (root.firstChild) {
            root.removeChild(root.firstChild);
        }

        // 2. Check destination
        if (currentStepIndex >= navigationPathPoints.length - 1) {
            if (currentStepIndex > 0) {
                 createDestinationMarker(navigationPathPoints[currentStepIndex-1], navigationPathPoints[currentStepIndex]);
            }
            const arText = document.getElementById('arText');
            if (arText) arText.textContent = "YOU HAVE ARRIVED!";
             const nextBtn = document.getElementById('nextBtn'); // legacy
             const nextArBtn = document.getElementById('nextArBtn');
             if (nextBtn) nextBtn.style.display = 'none';
             if (nextArBtn) nextArBtn.style.display = 'none';
            return;
        }

        const start = navigationPathPoints[currentStepIndex];
        const end = navigationPathPoints[currentStepIndex + 1];

        // 3. Render Path (Neon Pipe)
        createPathSegment(start, end);

        // 4. Render Marker (Octahedron or Dest)
        if (currentStepIndex === navigationPathPoints.length - 2) {
             createDestinationMarker(start, end);
        } else {
             createCheckpointMarker(end);
        }

        updateInstructions();

    } catch (e) {
        console.error("Render Error:", e);
    }
}

function updateInstructions() {
    const arText = document.getElementById('arText');
    if (arText) arText.textContent = "Follow the line";
    const arDistance = document.getElementById('arDistance');
    if (arDistance) arDistance.textContent = `segment ${currentStepIndex + 1}`;
}

// 1. Path (Green Chevrons)
function createPathSegment(start, end) {
    const root = document.getElementById('navigationRoot');
    
    // Vector math
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.sqrt(dx*dx + dz*dz);
    const angle = Math.atan2(dx, dz) * (180 / Math.PI);

    // Spacing for arrows
    const spacing = 0.8; 
    const count = Math.floor(length / spacing);
    
    // Step vector
    const stepX = dx / length * spacing;
    const stepZ = dz / length * spacing;

    for (let i = 0; i < count; i++) {
        // Position for this arrow
        const posX = start.x + (stepX * i) + (stepX * 0.5);
        const posZ = start.z + (stepZ * i) + (stepZ * 0.5);

        // Chevron Arrow (Triangle)
        const arrow = document.createElement('a-triangle');
        arrow.setAttribute('position', `${posX} 0.05 ${posZ}`); // Close to floor
        
        // Flip rotation to point forward
        // Add 180 to angle to reverse direction
        arrow.setAttribute('rotation', `-90 ${angle + 180} 0`); 
        
        arrow.setAttribute('vertex-a', '0 0.4 0'); // Tip
        arrow.setAttribute('vertex-b', '-0.3 -0.3 0'); // Left corner
        arrow.setAttribute('vertex-c', '0.3 -0.3 0'); // Right corner
        arrow.setAttribute('color', '#00FF00'); // Green
        arrow.setAttribute('material', 'opacity: 0.8; transparent: true; emissive: #00FF00; emissiveIntensity: 2');
        
        // Flow Animation (Sequential Pulse)
        // Delay based on index to create "movement" effect
        const delay = i * 200; 
        arrow.setAttribute('animation', `property: opacity; from: 0.2; to: 1.0; dir: alternate; loop: true; dur: 800; delay: ${delay}`);
        
        root.appendChild(arrow);
    }
}

// 2. Connector (Neon Orb)
function createCheckpointMarker(pos) {
    const root = document.getElementById('navigationRoot');
    
    // Floating Octahedron
    const marker = document.createElement('a-octahedron');
    marker.setAttribute('position', `${pos.x} 1.5 ${pos.z}`);
    marker.setAttribute('radius', 0.3);
    marker.setAttribute('color', '#00FFFF'); 
    marker.setAttribute('material', 'emissive: #00FFFF; emissiveIntensity: 1; wireframe: true');
    marker.setAttribute('animation', 'property: rotation; to: 0 360 0; loop: true; dur: 3000; easing: linear');
    
    root.appendChild(marker);
}

// 3. Destination (Giant Beacon)
function createDestinationMarker(start, end) {
    const root = document.getElementById('navigationRoot');
    const pos = end; // Dest

    const beacon = document.createElement('a-cylinder');
    beacon.setAttribute('position', `${pos.x} 1 ${pos.z}`);
    beacon.setAttribute('height', '3');
    beacon.setAttribute('radius', '0.1');
    beacon.setAttribute('color', '#00FF00');
    beacon.setAttribute('material', 'emissive: #00FF00; emissiveIntensity: 3; opacity: 0.6');
    root.appendChild(beacon);

    const ring = document.createElement('a-torus');
    ring.setAttribute('position', `${pos.x} 1.5 ${pos.z}`);
    ring.setAttribute('radius', '0.5');
    ring.setAttribute('radius-tubular', '0.02');
    ring.setAttribute('color', '#00FF00');
    ring.setAttribute('material', 'emissive: #00FF00; emissiveIntensity: 2; wireframe: true');
    ring.setAttribute('animation', 'property: rotation; to: 360 360 0; loop: true; dur: 5000; easing: linear');
    root.appendChild(ring);
    
    // Loop Face logic
    const dx = start.x - end.x;
    const dz = start.z - end.z;
    const angle = Math.atan2(dx, dz) * (180 / Math.PI);

    const text = document.createElement('a-text');
    text.setAttribute('value', 'DESTINATION');
    text.setAttribute('position', `${pos.x} 2.5 ${pos.z}`);
    text.setAttribute('align', 'center');
    text.setAttribute('color', '#FFFFFF');
    text.setAttribute('scale', '3 3 3');
    text.setAttribute('rotation', `0 ${angle} 0`);
    
    root.appendChild(text);
}


// --- EVENT LISTENERS ---

function setupEvents() {
    // Next Step
    const nextBtn = document.getElementById('nextBtn') || document.getElementById('nextArBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
             currentStepIndex++;
             renderCurrentSegment();
        });
    }

    // Recenter
    const recenterBtn = document.getElementById('recenterBtn');
    if (recenterBtn) {
        recenterBtn.addEventListener('click', () => {
             const camera = document.querySelector('[camera]');
             const root = document.getElementById('navigationRoot');
             if (camera && root) {
                 const camRot = camera.getAttribute('rotation');
                 root.setAttribute('rotation', `0 ${camRot.y} 0`);
             }
        });
    }

    // Height Adjust
    const btnUp = document.getElementById('btnUp');
    const btnDown = document.getElementById('btnDown');
    if (btnUp) btnUp.addEventListener('click', () => adjustHeight(0.2));
    if (btnDown) btnDown.addEventListener('click', () => adjustHeight(-0.2));

    // Mini-Map Expand
    const mapContainer = document.getElementById('mini-map-container');
    const minBtn = document.getElementById('minimizeBtn');
    
    if (mapContainer) {
        mapContainer.addEventListener('click', (e) => {
            if (isMapExpanded) return; // Already expanded
            isMapExpanded = true;
            mapContainer.classList.add('expanded');
            e.stopPropagation();
        });
    }
    
    // Minimize
    if (minBtn) {
        minBtn.addEventListener('click', (e) => {
            isMapExpanded = false;
            mapContainer.classList.remove('expanded');
            e.stopPropagation();
        });
    }
}

// --- MINI-MAP LOGIC (EXPANDABLE) ---
// Config: Assumed map scaling (Need calibration)
const MAP_CONFIG = {
    imgSrc: 'assets/map.png',
    startU: 0.5, // Center X (Relative to Image Width)
    startV: 0.8, // Bottom Y (Relative to Image Height)
    scale: 15,   // Pixels per meter (Zoom Level on Source Image)
};

let mapImage = new Image();
mapImage.src = MAP_CONFIG.imgSrc;
let mapLoaded = false;
mapImage.onload = () => { mapLoaded = true; };
mapImage.onerror = () => { console.warn("Map load failed"); };

let isMapExpanded = false;

function drawMiniMap() {
    const canvas = document.getElementById('miniMap');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Sync Canvas Resolution to Display Size
    // Important for Expanded Mode crispness
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
    
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Clear
    ctx.clearRect(0, 0, width, height);
    
    // Get User Position & Rotation
    const root = document.getElementById('navigationRoot');
    const camera = document.querySelector('[camera]');
    const camPos = camera ? camera.getAttribute('position') : {x:0, y:0, z:0};
    const camRot = camera ? camera.getAttribute('rotation') : {x:0, y:0, z:0};

    // Image Specs
    const imgW = mapLoaded ? mapImage.width : 500;
    const imgH = mapLoaded ? mapImage.height : 500;

    // Calculate User Position on SOURCE IMAGE (Virtual Pixels)
    const startPx = imgW * MAP_CONFIG.startU;
    const startPy = imgH * MAP_CONFIG.startV;
    const userImgX = startPx + (camPos.x * MAP_CONFIG.scale);
    const userImgY = startPy + (camPos.z * MAP_CONFIG.scale);

    // Determines Scale and Offset for Drawing
    let drawScale = 1;
    let drawOffsetX = 0;
    let drawOffsetY = 0;

    if (isMapExpanded) {
        // FULL MODE: Fit Image to Screen
        const scaleW = width / imgW;
        const scaleH = height / imgH;
        drawScale = Math.min(scaleW, scaleH) * 0.9; // 90% fit for margin
        
        // Center the Image
        const scaledW = imgW * drawScale;
        const scaledH = imgH * drawScale;
        drawOffsetX = (width - scaledW) / 2;
        drawOffsetY = (height - scaledH) / 2;
        
    } else {
        // MINI MODE: Zoomed 1:1, User Centered
        drawScale = 1.0; 
        // We want UserImgX to appear at CenterX
        // Screen = Offset + (Img * Scale)
        // CenterX = Offset + (UserImgX * 1)
        // Offset = CenterX - UserImgX
        drawOffsetX = centerX - userImgX;
        drawOffsetY = centerY - userImgY;
    }

    // 1. Draw Map Image
    if (mapLoaded) {
        ctx.save();
        ctx.drawImage(mapImage, drawOffsetX, drawOffsetY, imgW * drawScale, imgH * drawScale);
        ctx.restore();
    } else {
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, width, height);
    }

    // Helper: Convert Map Point to Screen Point
    function toScreen(pt) {
        const ptImgX = startPx + (pt.x * MAP_CONFIG.scale);
        const ptImgY = startPy + (pt.z * MAP_CONFIG.scale);
        return {
            x: drawOffsetX + (ptImgX * drawScale),
            y: drawOffsetY + (ptImgY * drawScale)
        };
    }

    // 2. Draw Path Line (Blue)
    if (navigationPathPoints.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = '#0088FF'; 
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        navigationPathPoints.forEach((pt, index) => {
            const screen = toScreen(pt);
            if (index === 0) ctx.moveTo(screen.x, screen.y);
            else ctx.lineTo(screen.x, screen.y);
        });
        ctx.stroke();
    }

    // 3. Draw Destination (Green Pin)
    if (navigationPathPoints.length > 0) {
        const lastPt = navigationPathPoints[navigationPathPoints.length - 1];
        const screen = toScreen(lastPt);
        
        // Pin Icon
        ctx.fillStyle = '#00FF00';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.arc(screen.x, screen.y - 12, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y);
        ctx.lineTo(screen.x - 6, screen.y - 10);
        ctx.lineTo(screen.x + 6, screen.y - 10);
        ctx.fill();
        
        // Label
        if (isMapExpanded) {
            ctx.font = 'bold 12px monospace'; // Larger text in Full Mode
            ctx.fillStyle = '#00FF00';
        } else {
            ctx.font = 'bold 10px monospace';
             ctx.fillStyle = '#FFFFFF';
        }
        ctx.textAlign = 'center';
        ctx.fillText("DEST", screen.x, screen.y - 22);
    }

    // 4. Draw User
    const userScreen = toScreen(camPos); // camPos is user relative to start (0,0) in AR space
    // Wait. toScreen uses startPx + pt.x*scale.
    // userImgX = startPx + camPos.x*scale.
    // So userScreen should match exactly.
    
    ctx.save();
    ctx.translate(userScreen.x, userScreen.y);
    
    // Rotate Context by Camera Rotation
    const angleRad = (camRot.y * Math.PI) / 180;
    
    // In Mini Mode, we rotate User Arrow (-angleRad)
    // In Full Mode, Map is Static. User Arrow should rotate to show heading.
    // So logic is SAME for both modes!
    ctx.rotate(-angleRad); 
    
    // User Arrow
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(-5, 6);
    ctx.lineTo(0, 4); 
    ctx.lineTo(5, 6);
    ctx.fill();
    
    // Label "YOU"
    ctx.rotate(angleRad); // Un-rotate text
    ctx.fillStyle = '#FF0000';
    ctx.font = isMapExpanded ? 'bold 12px monospace' : 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText("YOU", 0, 16);
    
    ctx.restore();

    requestAnimationFrame(drawMiniMap);
}

window.calibrateMap = (u, v, s) => {
    if (u) MAP_CONFIG.startU = u;
    if (v) MAP_CONFIG.startV = v;
    if (s) MAP_CONFIG.scale = s;
    console.log("Map Config Update:", MAP_CONFIG);
};

// Init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupEvents();
        setTimeout(loadAR, 1000);
        requestAnimationFrame(drawMiniMap);
    });
} else {
    setupEvents();
    setTimeout(loadAR, 1000);
    requestAnimationFrame(drawMiniMap);
}
