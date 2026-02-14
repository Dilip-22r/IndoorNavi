
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

// --- THEMES ---
const themes = {
    cyberpunk: {
        pathColor: '#00FF00', // Green
        pathOpacity: 0.8,
        markerColor: '#00FFFF', // Cyan
        destColor: '#00FF00',
        destEmissive: '#00FF00',
        floorColor: '#000000',
        uiBorder: '2px solid #00ffff',
        uiBg: 'rgba(0, 0, 0, 0.8)',
        uiColor: '#00ffff'
    },
    minimalist: {
        pathColor: '#FFFFFF', // White
        pathOpacity: 0.9,
        markerColor: '#FFA500', // Orange
        destColor: '#FF0000', // Red
        destEmissive: '#FF0000',
        floorColor: '#f0f0f0',
        uiBorder: '2px solid #333',
        uiBg: 'rgba(255, 255, 255, 0.9)',
        uiColor: '#333'
    },
    classic: {
        pathColor: '#FFFF00', // Yellow
        pathOpacity: 0.8,
        markerColor: '#0000FF', // Blue
        destColor: '#FFFF00',
        destEmissive: '#FFFF00',
        floorColor: '#222',
        uiBorder: '2px solid white',
        uiBg: 'rgba(0,0,0,0.6)',
        uiColor: 'white'
    }
};

let currentTheme = 'cyberpunk'; // Default

function applyTheme(themeName) {
    if (!themes[themeName]) return;
    currentTheme = themeName;
    const t = themes[themeName];
    
    // Update UI Elements
    const instructions = document.querySelectorAll('.ar-instruction');
    instructions.forEach(el => {
        el.style.background = t.uiBg;
        el.style.border = t.uiBorder;
        el.style.color = t.uiColor;
    });

    const arText = document.querySelector('.ar-text');
    if(arText) arText.style.color = t.uiColor;

    // Update Distance Text (usually white/neutral, but let's sync)
    // const arDist = document.querySelector('.ar-distance');
    // if(arDist) arDist.style.color = t.uiColor;

    // Re-render Scene
    renderCurrentSegment();
    console.log(`Theme set to: ${themeName}`);
}

// --- RENDERER (NEON STYLE + HEIGHT SUPPORT) ---

// Ensure root is at correct height
function updateRootPosition() {
    const root = document.getElementById('navigationRoot');
    if (!root) return;
    const baseHeight = -1.6; // Floor level assumes camera at 1.6m
    const newY = baseHeight + heightOffset;
    
    // Respect current virtual position if any
    const currentX = window.virtualUserPos ? -window.virtualUserPos.x : 0;
    const currentZ = window.virtualUserPos ? -window.virtualUserPos.z : 0;
    
    root.setAttribute('position', `${currentX} ${newY} ${currentZ}`);
    console.log(`Height/Pos updated: ${newY}, ${currentX}, ${currentZ}`);
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
             createCheckpointMarker(end); // Reverted to simple marker
        }
        
        // 5. Render Nearby POIs (New)
        renderNearbyPOIs(start);

        updateInstructions();

    } catch (e) {
        console.error("Render Error:", e);
    }
}

// --- POI LOGIC ---
function renderNearbyPOIs(userPos) {
    if (typeof MapService === 'undefined' || !MapService.nodeCoordinates) return;
    
    // Clear existing POIs
    const existing = document.querySelectorAll('.poi-label');
    existing.forEach(el => el.parentNode.removeChild(el));

    const root = document.getElementById('navigationRoot');
    const t = themes[currentTheme];
    const PROXIMITY_RADIUS = 15; // Show POIs within 15 meters

    Object.keys(MapService.nodeCoordinates).forEach(nodeName => {
        // Skip corridors placeholders if desired, or keep them for debug
        if (nodeName.includes('corridor')) return; 

        const coord = MapService.nodeCoordinates[nodeName];
        
        // Transform Global Coord to AR Space (Relative to Path Start)
        // Note: navigationPathPoints are already relative to path start.
        // We need to check if userPos (which is current path node) is close to this POI.
        // Wait, userPos IS a global coordinate? No, userPos passed from renderCurrentSegment is from navigationPathPoints.
        // navigationPathPoints are LOCAL coordinates relative to the start node of the path.
        
        // We need the Global Coordinate of the user to compare with Global Coordinate of POI.
        // Let's reconstruct.
        if (!route || !route.points) return;
        
        // Actually, MapService.nodeCoordinates has the Absolute "Global" coords for the building.
        // navigationPathPoints are relative offsets from the START NODE of the route.
        // So User's Global Pos = StartNodeGlobal + navPoint.
        
        // Let's find the Start Node Name of the current route
        // We don't have it easily stored in 'route' object right now.
        // But we can approximate.
        // Let's just use the Distance check using the raw coordinates if we can.
        
        // BETTER APPROACH:
        // We have `navigationPathPoints` which are real local coords in AR space.
        // We can just project ALL POIs into this AR space and see which are close.
        
        // We need the Route's Start Node Global Coord.
        // Accessing internal MapService data might be tricky if not exposed.
        // BUT, `navigationPathPoints` was generated by `MapService.generatePathCoordinates`.
        // That function uses `startNodeName = path[0]`.
        
        // Let's assume we can map the POI to the current relative space.
        // We generally need the path array to know the start node.
        // `MapService.bfs` returns the path array of names ['c201', 'corridor_right', ...].
        // We didn't save the raw node path in `route` object, only points.
        // This is a limitation.
        
        // PATCH: We need to store path node names in `route`.
        // For now, let's try to deduce or rely on the fact that existing nodes in the path are POIs.
        
        // ALTERNATIVE:
        // Loop through the *current route nodes* if we had them.
        // Since we don't, let's use the `MapService.nodeCoordinates` directly.
        // And we need the user's current GLOBAL position.
        // The `userPos` arg passed here is the current target wp in LOCAL space.
        
        // Workaround:
        // If we can't easily transform global->local without the start node, 
        // let's just create labels for the points *in the navigation path* that are rooms.
        // But the user wants "nearby" rooms even if not on path.
        
        // Quick Fix:
        // When generating route, we should save the Start Node Name.
        // Since we can't easily change `generatePathCoordinates` right now without breaking things,
        // let's rely on `localstorage` or just scan the map for the closest matching coordinate to (0,0,0) (Start).
        
        // Let's skip complex math and just label the markers we DO have.
        // If we want off-path POIs, we need the start node.
        
        // Let's check `route` object structure again.
        // It has `points` and `instructions`.
        
        // Plan B: Use valid logic.
        // In `handleRelocalization`, we assume the QR code IS the start node.
        // In `loadAR`, we load from storage.
        // Let's assume we can retrieve the Start Node from `localStorage` if saved, or just...
        // Wait, MapService is global.
        
        // Let's try to calculate distance in generic way.
        // AR Space (0,0) = Start Node of Route.
        // So POI Local Pos = POI Global - Start Node Global.
    });
}
// RETRYING WITH PROPER LOGIC BELOW


let lastSpokenIndex = -1;
let isVoiceEnabled = true;

function speak(text) {
    if (!isVoiceEnabled) return;
    if ('speechSynthesis' in window) {
        // Do not cancel previous speech to allow queuing
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}

function toggleVoice() {
    isVoiceEnabled = !isVoiceEnabled;
    const btn = document.getElementById('voiceBtn');
    if (btn) {
        btn.textContent = isVoiceEnabled ? "🔊 On" : "🔇 Off";
        btn.style.backgroundColor = isVoiceEnabled ? "" : "#ff4444";
    }
    speak(isVoiceEnabled ? "Voice enabled" : "Voice disabled");
}

function updateInstructions() {
    const arText = document.getElementById('arText');
    const arDistance = document.getElementById('arDistance');
    const t = themes[currentTheme];

    // Get Instruction for current step
    let instruction = "Follow the glowing line";
    if (route && route.instructions && route.instructions[currentStepIndex]) {
        instruction = route.instructions[currentStepIndex];
    } else if (currentStepIndex >= navigationPathPoints.length - 1) {
        instruction = "You have arrived!";
    }

    // Update UI
    if (arText) {
        arText.textContent = instruction;
        arText.style.color = t.uiColor; // Sync with theme
    }
    
    // Update Distance/Step info
    if (arDistance) {
        const total = navigationPathPoints.length;
        arDistance.textContent = `Step ${currentStepIndex + 1}/${total}`; // Compact
        // arDistance.style.color = t.uiColor; // Optional: Force sync or keep white for contrast
    }

    // Voice Announcement (Only if step changed)
    if (currentStepIndex !== lastSpokenIndex) {
        speak(instruction);
        lastSpokenIndex = currentStepIndex;
    }
}

// 1. Path (Green Chevrons)
function createPathSegment(start, end) {
    const root = document.getElementById('navigationRoot');
    const t = themes[currentTheme];
    
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
        
        // THEME COLOR
        arrow.setAttribute('color', t.pathColor); 
        arrow.setAttribute('material', `opacity: ${t.pathOpacity}; transparent: true; emissive: ${t.pathColor}; emissiveIntensity: 2`);
        
        // Flow Animation (Sequential Pulse)
        // Delay based on index to create "movement" effect
        const delay = i * 200; 
        arrow.setAttribute('animation', `property: opacity; from: 0.2; to: 1.0; dir: alternate; loop: true; dur: 800; delay: ${delay}`);
        
        root.appendChild(arrow);
    }
}

// 2. Connector (Checkpoint) - Reverted to Simple Shape
function createCheckpointMarker(pos) {
    const root = document.getElementById('navigationRoot');
    const t = themes[currentTheme];
    
    // Simple Floating Octahedron
    const marker = document.createElement('a-octahedron');
    marker.setAttribute('position', `${pos.x} 1.5 ${pos.z}`);
    marker.setAttribute('radius', '0.2');
    marker.setAttribute('color', t.markerColor);
    marker.setAttribute('material', `emissive: ${t.markerColor}; emissiveIntensity: 0.8; wireframe: true`);
    marker.setAttribute('animation', 'property: rotation; to: 0 360 0; loop: true; dur: 3000; easing: linear');
    
    root.appendChild(marker);
}

// 3. Destination (Giant Beacon + Notice Board)
function createDestinationMarker(start, end) {
    const root = document.getElementById('navigationRoot');
    const pos = end; // Dest
    const t = themes[currentTheme];

    // Trigger Vibration on Arrival (Simple Haptic)
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 400]);
    }

    // Waist Level ~ 1.1m - 1.2m
    const waistHeight = 1.2;

    const beacon = document.createElement('a-cylinder');
    beacon.setAttribute('position', `${pos.x} 1 ${pos.z}`);
    beacon.setAttribute('height', '3'); 
    beacon.setAttribute('radius', '0.1');
    beacon.setAttribute('color', t.destColor);
    beacon.setAttribute('material', `emissive: ${t.destEmissive}; emissiveIntensity: 3; opacity: 0.6`);
    root.appendChild(beacon);

    const ring = document.createElement('a-torus');
    ring.setAttribute('position', `${pos.x} ${waistHeight} ${pos.z}`);
    ring.setAttribute('radius', '0.5');
    ring.setAttribute('radius-tubular', '0.02');
    ring.setAttribute('color', t.destColor);
    ring.setAttribute('material', `emissive: ${t.destEmissive}; emissiveIntensity: 2; wireframe: true`);
    ring.setAttribute('animation', 'property: rotation; to: 360 360 0; loop: true; dur: 5000; easing: linear');
    root.appendChild(ring);

    // NOTICE BOARD (Billboarding Plane)
    const boardGroup = document.createElement('a-entity');
    boardGroup.setAttribute('position', `${pos.x} ${waistHeight + 0.6} ${pos.z}`);
    boardGroup.setAttribute('look-at', '[camera]');

    // Background Board
    const board = document.createElement('a-plane');
    board.setAttribute('width', '1.5');
    board.setAttribute('height', '0.6');
    board.setAttribute('color', '#000000');
    board.setAttribute('material', 'opacity: 0.8; transparent: true; side: double');
    board.setAttribute('position', '0 0 0');
    boardGroup.appendChild(board);

    // Text
    const text = document.createElement('a-text');
    text.setAttribute('value', 'YOU HAVE ARRIVED');
    text.setAttribute('align', 'center');
    text.setAttribute('color', '#FFFFFF');
    text.setAttribute('width', '4');
    text.setAttribute('position', '0 0 0.02'); // Slightly in front
    boardGroup.appendChild(text);

    // Confetti / Particles (Simple spheres for now)
    // Optional: Add simple particle effect if desired, but user said "Small notice board".
    
    root.appendChild(boardGroup);
    
    // Also add the original text if needed, but the board covers it.
}


// --- EVENT LISTENERS ---

function setupEvents() {
    // Next Step
    const nextBtn = document.getElementById('nextBtn') || document.getElementById('nextArBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
             // Simulate moving 5m (one full segment)
             currentStepIndex++;
             userDistanceOnPath = 0; // Reset pedometer for new segment
             renderCurrentSegment();
             speak("Moved to next point.");
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

    // Back Button (New)
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
             // Go back to Navigation View or Index
             // If we came from navigation.html, let's go there.
             window.location.href = 'navigation.html';
        });
    }

    // Theme Switcher
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            applyTheme(e.target.value);
        });
    }

    // Voice Toggle (Dynamic)
    let voiceBtn = document.getElementById('voiceBtn');
    if (!voiceBtn) {
        voiceBtn = document.createElement('button');
        voiceBtn.id = 'voiceBtn';
        voiceBtn.textContent = "🔊 On";
        voiceBtn.style.cssText = `
            position: fixed; 
            top: 20px; 
            right: 80px; 
            z-index: 1001; 
            padding: 8px 12px; 
            background: rgba(0, 0, 0, 0.6); 
            color: white; 
            border: 1px solid white; 
            border-radius: 5px; 
            cursor: pointer;
        `;
        document.body.appendChild(voiceBtn);
    }
    voiceBtn.addEventListener('click', toggleVoice);
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
    // Use Virtual Position if available
    const camPos = window.virtualUserPos || (camera ? camera.getAttribute('position') : {x:0, y:0, z:0});
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

// --- PEDOMETER & MOVEMENT LOGIC ---
let lastStepTime = 0;
let userDistanceOnPath = 0; // Distance traveled on CURRENT segment
const STEP_LENGTH = 0.7; // Meters per step
const STEP_THRESHOLD = 11.0; // Acceleration magnitude

function setupPedometer() {
    if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', (event) => {
            const acc = event.accelerationIncludingGravity;
            if (!acc) return;
            
            const magnitude = Math.sqrt(acc.x*acc.x + acc.y*acc.y + acc.z*acc.z);
            const now = Date.now();
            
            // Detect Step
            if (magnitude > STEP_THRESHOLD && (now - lastStepTime > 600)) {
                lastStepTime = now;
                onStepDetected();
            }
        });
        console.log("Pedometer Active");
    } else {
        console.warn("DeviceMotion not supported");
    }
}

function onStepDetected() {
    // 1. Move User Forward along the Path
    if (!route || !navigationPathPoints || navigationPathPoints.length === 0) return;
    
    // Get current segment
    const start = navigationPathPoints[currentStepIndex];
    const end = navigationPathPoints[currentStepIndex + 1];
    
    if (!end) return; // End of path
    
    // Calculate Segment Length
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const segmentLen = Math.sqrt(dx*dx + dz*dz);
    
    // Move
    userDistanceOnPath += STEP_LENGTH;
    
    // Check if we finished segment
    if (userDistanceOnPath >= segmentLen) {
        // Next Segment
        currentStepIndex++;
        userDistanceOnPath = 0; // Reset for new segment
        
        // Render new segment
        renderCurrentSegment(); 
        
        // Voice
        speak("Step complete.");
    } else {
        // Just update position visuals (Mini-Map & World)
        updateUserPosition(start, end, userDistanceOnPath / segmentLen);
    }
}

function updateUserPosition(start, end, progress) {
    const currentX = start.x + (end.x - start.x) * progress;
    const currentZ = start.z + (end.z - start.z) * progress;
    
    const root = document.getElementById('navigationRoot');
    if (root) {
        const baseHeight = -1.6 + heightOffset; 
        root.setAttribute('position', `${-currentX} ${baseHeight} ${-currentZ}`);
    }
    
    window.virtualUserPos = { x: currentX, y: 0, z: currentZ };
}

// --- POI LOGIC ---
function renderNearbyPOIs() {
    // User requested to remove 3D Room Numbers.
    // Clearing this function to disable POI rendering.
    if (typeof MapService === 'undefined' || !MapService.nodeCoordinates) return;
    const root = document.getElementById('navigationRoot');
    if (!root) return;
    
    // Clear existing if any left
    const existing = document.querySelectorAll('.poi-label');
    existing.forEach(el => el.parentNode.removeChild(el));
}

let arQrScanner = null;

function setupRelocalization() {
    const relocBtn = document.getElementById('relocalizeBtn');
    const overlay = document.getElementById('ar-qr-overlay');
    const closeBtn = document.getElementById('close-ar-qr');
    
    if (!relocBtn || !overlay) return;
    
    // Open Scanner
    relocBtn.addEventListener('click', () => {
        overlay.style.display = 'flex';
        startArQrScanner();
    });
    
    // Close Scanner
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            stopArQrScanner();
            overlay.style.display = 'none';
        });
    }
}

function startArQrScanner() {
    if (arQrScanner) return; // Already running?
    
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    arQrScanner = new Html5Qrcode("ar-qr-reader");
    
    arQrScanner.start({ facingMode: "environment" }, config, async (decodedText) => {
        // Success
        console.log("AR QR Relocalize:", decodedText);
        handleRelocalization(decodedText);
    }, (err) => {
        // scan error, ignore
    }).catch(err => {
        console.error("Scanner Error", err);
        alert("Camera error.");
        document.getElementById('ar-qr-overlay').style.display = 'none';
    });
}

function stopArQrScanner() {
    if (arQrScanner) {
        arQrScanner.stop().then(() => {
            arQrScanner.clear();
            arQrScanner = null;
        }).catch(err => console.error("Stop Error", err));
    }
}

async function handleRelocalization(newLocationCode) {
    stopArQrScanner();
    document.getElementById('ar-qr-overlay').style.display = 'none';
    
    if (typeof MapService === 'undefined') {
        alert("Map Service not loaded.");
        return;
    }
    
    if (!MapService.graph) {
        await MapService.loadMap();
    }
    
    const newStart = newLocationCode.toLowerCase().replace('-', '');
    
    if (!MapService.graph[newStart]) {
        alert(`Invalid Location Code: ${newLocationCode}`);
        speak("Invalid location code.");
        return;
    }
    
    const dest = localStorage.getItem('destination');
    if (!dest) {
        alert("No destination set.");
        return;
    }
    const destKey = dest.toLowerCase();
    
    const path = MapService.bfs(newStart, destKey);
    if (!path) {
        alert("Cannot find path from here.");
        speak("Cannot find path from here.");
        return;
    }
    
    const points = MapService.generatePathCoordinates(path);
    const instructions = MapService.generateDirections(path);
    
    route = {
        points: points,
        instructions: instructions,
        distance: path.length * 5,
        startNode: newStart // SAVE START NODE FOR POI CALC
    };
    navigationPathPoints = points;
    currentStepIndex = 0;
    lastSpokenIndex = -1;
    
    window.virtualUserPos = { x: 0, y: 0, z: 0 };
    lastStepTime = Date.now();
    userDistanceOnPath = 0;
    
    localStorage.setItem('currentRoute', JSON.stringify(route));
    
    speak(`Recalculating from ${newLocationCode}.`);
    renderCurrentSegment();
    
    const arText = document.getElementById('arText');
    if (arText) arText.textContent = `Moved to ${newLocationCode.toUpperCase()}`;
}

// Init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupEvents();
        setupRelocalization(); 
        setTimeout(loadAR, 1000);
        requestAnimationFrame(drawMiniMap);
        setupPedometer();
    });
} else {
    setupEvents();
    setupRelocalization(); 
    setTimeout(loadAR, 1000);
    requestAnimationFrame(drawMiniMap);
    setupPedometer();
}

// --- WRONG WAY DETECTION & HAPTIC FEEDBACK ---
let lastVibrationTime = 0;
const WRONG_WAY_THRESHOLD = 120; // Degrees deviation to trigger warning

function checkWrongWay() {
    // 1. Validation
    if (!navigationPathPoints || navigationPathPoints.length < 2) return;
    if (currentStepIndex >= navigationPathPoints.length - 1) return; // Arrived

    // 2. Calculate Segments
    const start = navigationPathPoints[currentStepIndex];
    const end = navigationPathPoints[currentStepIndex + 1];
    if (!start || !end) return;

    // 3. Calculate Path Angle
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    // atan2(dx, dz) gives angle relative to North (0, -1) -> 180
    // We add 180 to align with A-Frame Camera (0 = North)
    const targetAngle = (Math.atan2(dx, dz) * (180 / Math.PI)) + 180;

    // 4. Get Camera Angle
    const camera = document.querySelector('[camera]');
    if (!camera) return;
    
    // A-Frame rotation.y is degrees (0 = -Z/North, 90 = -X/West)
    const camAngle = camera.getAttribute('rotation').y;

    // 5. Compare Angles
    let diff = Math.abs(normalizeAngle(targetAngle) - normalizeAngle(camAngle));
    if (diff > 180) diff = 360 - diff; // Shortest turn

    // 6. Trigger Feedback
    if (diff > WRONG_WAY_THRESHOLD) {
        // Haptic Feedback (Vibrate)
        const now = Date.now();
        if (now - lastVibrationTime > 1000) {
            console.warn("User going wrong way! Vibrate.");
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200]); 
            }
            lastVibrationTime = now;
        }
    }
}

function normalizeAngle(a) {
    return (a % 360 + 360) % 360;
}

// Start Monitoring
setInterval(checkWrongWay, 500);

