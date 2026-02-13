console.warn("AR Script Starting..."); // Warn to show debug console

let route = null;
let step = 0;
let navigationRoot = null;
let currentPathEntities = [];

function loadAR() {
    console.log("Starting loadAR...");
    try {
        const routeData = localStorage.getItem('currentRoute');
        const stepData = localStorage.getItem('step');
        const destination = localStorage.getItem('destination');

        if (!routeData) {
            console.error("No route data found!");
            window.location.href = 'index.html';
            return;
        }

        console.log("Route loaded for: " + destination);
        route = JSON.parse(routeData);
        step = parseInt(stepData) || 0;

        // Initialize immediately if scene is ready, otherwise wait
        const scene = document.querySelector('a-scene');
        if (scene.hasLoaded) {
            initializeNavigation(destination);
        } else {
            scene.addEventListener('loaded', () => initializeNavigation(destination));
        }
    } catch (e) {
        console.error("CRITICAL: " + e.message);
    }
}

function initializeNavigation(destination) {
    try {
        console.log("Initializing Navigation Elements...");
        navigationRoot = document.getElementById('navigationRoot');
        if (!navigationRoot) {
            console.error("Navigation Root not found!");
            return;
        }
        
        // Add a specialized Start Marker at local 0,0,0
        const startMarker = document.createElement('a-cylinder');
        startMarker.setAttribute('position', '0 0 0');
        startMarker.setAttribute('radius', '0.3');
        startMarker.setAttribute('height', '0.1');
        startMarker.setAttribute('color', '#FFFF00'); // Yellow start
        startMarker.setAttribute('material', 'emissive: #FFFF00; emissiveIntensity: 1');
        navigationRoot.appendChild(startMarker);
        
        renderPath();
        placeArrows();
        addDestinationMarker(destination);
        updateARUI(destination);
        
        console.warn("AR Ready - Look for Red Cube and Yellow Disc!");
    } catch (e) {
        console.error("Init Error: " + e.message);
    }
}

function renderPath() {
    const points = route.points;
    // Create path using cylinder segments between each pair of points
    for (let i = 0; i < points.length - 1; i++) {
        createPathSegment(points[i], points[i + 1]);
    }
}

function createPathSegment(start, end) {
    try {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const dz = end.z - start.z;
        
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        const midZ = (start.z + end.z) / 2;
        
        // Calculate Y-rotation (Yaw) to face the next point
        const rotY = Math.atan2(dx, dz) * (180 / Math.PI);
        
        // Use a BOX instead of Cylinder for a "Carpet" look
        const path = document.createElement('a-box');
        path.setAttribute('position', `${midX} ${midY} ${midZ}`);
        path.setAttribute('rotation', `0 ${rotY} 0`);
        path.setAttribute('width', '0.6');   // 60cm wide path
        path.setAttribute('height', '0.05'); // Thin carpet
        path.setAttribute('depth', length);  // Length of segment
        
        // Purple Style
        path.setAttribute('color', '#8A2BE2'); // BlueViolet
        path.setAttribute('material', 'emissive: #8A2BE2; emissiveIntensity: 0.8; opacity: 0.8');
        
        navigationRoot.appendChild(path);
        currentPathEntities.push(path);
    } catch (e) {
        console.error("Segment Error: " + e.message);
    }
}

function placeArrows() {
    try {
        const points = route.points;
        for (let i = 0; i < points.length - 1; i++) {
            const point = points[i];
            const nextPoint = points[i + 1];
            
            const dx = nextPoint.x - point.x;
            const dz = nextPoint.z - point.z;
            const rotY = Math.atan2(dx, dz) * (180 / Math.PI);
            
            const arrow = document.createElement('a-cone');
            arrow.setAttribute('position', `${point.x} ${point.y + 0.5} ${point.z}`);
            arrow.setAttribute('rotation', `0 ${rotY} 0`); // Vertical cone calculation is tricky, stick to upright
            // If we want it pointing forward, rotate X by 90? No, cone points up Y usually.
            // Let's lay it flat: rotation="90 0 0" points it along Z.
            // Actually simpler: Just use upright cones as waypoints.
            arrow.setAttribute('radius-bottom', '0.2');
            arrow.setAttribute('radius-top', '0');
            arrow.setAttribute('height', '0.5');
            arrow.setAttribute('color', '#ffff00');
            arrow.setAttribute('material', 'emissive: #ffff00; emissiveIntensity: 1');
            
            navigationRoot.appendChild(arrow);
            currentPathEntities.push(arrow);
        }
        
        if (route.turns) {
            route.turns.forEach(turn => {
                const turnArrow = document.createElement('a-box'); // Use box for turn to distinguish
                turnArrow.setAttribute('position', `${turn.at.x} ${turn.at.y + 1} ${turn.at.z}`);
                turnArrow.setAttribute('color', '#FF0000');
                turnArrow.setAttribute('scale', '0.5 0.5 0.5');
                turnArrow.setAttribute('material', 'emissive: #FF0000; emissiveIntensity: 1');
                turnArrow.setAttribute('animation', 'property: rotation; to: 0 360 0; loop: true; dur: 2000');
                navigationRoot.appendChild(turnArrow);
            });
        }
    } catch (e) {
        console.error("Arrow Error: " + e.message);
    }
}

function addDestinationMarker(destination) {
    try {
        const finalPoint = route.points[route.points.length - 1];
        
        const text = document.createElement('a-text');
        text.setAttribute('value', `DESTINATION\nC-${destination}`);
        text.setAttribute('position', `${finalPoint.x} ${finalPoint.y + 2} ${finalPoint.z}`);
        text.setAttribute('align', 'center');
        text.setAttribute('color', '#00ff00');
        text.setAttribute('scale', '2 2 2');
        text.setAttribute('look-at', '[camera]');
        
        navigationRoot.appendChild(text);
        
        const marker = document.createElement('a-cylinder');
        marker.setAttribute('position', `${finalPoint.x} ${finalPoint.y} ${finalPoint.z}`);
        marker.setAttribute('radius', '0.6'); // Large marker
        marker.setAttribute('height', '0.1');
        marker.setAttribute('color', '#00ff00');
        marker.setAttribute('material', 'emissive: #00ff00; emissiveIntensity: 1');
        
        navigationRoot.appendChild(marker);
        currentPathEntities.push(marker);
    } catch (e) {
        console.error("Destination Error: " + e.message);
    }
}

function updateARUI(destination) {
    try {
        const arText = document.getElementById('arText');
        const arDistance = document.getElementById('arDistance');
        const nextBtn = document.getElementById('nextArBtn');
        
        const totalPoints = route.points.length;
        
        if (step >= totalPoints - 1) {
            if (arText) arText.textContent = `Destination Reached!`;
            if (arDistance) arDistance.textContent = `Welcome to C-${destination}`;
            if (nextBtn) {
                nextBtn.disabled = true;
                nextBtn.textContent = 'Completed';
                nextBtn.style.background = '#00ff00';
            }
        } else {
            if (arText) arText.textContent = "Follow the Purple Path";
            if (arDistance) arDistance.textContent = `Step ${step + 1} / ${totalPoints}`;
        }
    } catch (e) {
        console.error("UI Error: " + e.message);
    }
}


document.getElementById('nextArBtn').addEventListener('click', function() {
    const destination = localStorage.getItem('destination');
    const totalPoints = route.points.length;
    
    if (step < totalPoints - 1) {
        step++;
        localStorage.setItem('step', step);
        updateARUI(destination);
    }
});

document.getElementById('recenterBtn').addEventListener('click', function() {
    try {
        const camera = document.querySelector('[camera]');
        const root = document.getElementById('navigationRoot');
        
        if (camera && root) {
            // Get camera Y rotation (heading)
            const camRot = camera.getAttribute('rotation');
            const camPos = camera.getAttribute('position');
            
            // Snap root to camera position (but keep it on floor/lower)
            // AND rotate it to match where the user is looking
            
            // 1. Position: Move root to where camera is X/Z, but keep Y fixed?
            // Actually, let's just keep position at 0,0,0 if user hasn't moved much.
            // Oriented drift is the main issue.
            
            console.log("Recentering... Cam Rot: ", camRot);
            
            // Rotate root to match camera heading
            root.setAttribute('rotation', `0 ${camRot.y} 0`);
            
            // Optional: Move root to camera position to reset translation drift
            // root.setAttribute('position', `${camPos.x} -1.5 ${camPos.z}`); 
            // Better to just rotate for now to avoid losing the "floor" plane if cam Y is weird.
            
            const arDistance = document.getElementById('arDistance');
            if (arDistance) arDistance.textContent = "Path Aligned to View!";
            
            // Play a small scale animation on start marker to show it updated
            const startMarker = root.querySelector('a-cylinder'); // The yellow one
            if (startMarker) {
                startMarker.setAttribute('color', '#FFFFFF');
                setTimeout(() => startMarker.setAttribute('color', '#FFFF00'), 500);
            }
        }
    } catch (e) {
        console.error("Recenter Error: " + e.message);
    }
});

loadAR();
