
let currentStepIndex = 0;
let navigationPathPoints = [];
let route = null; // Defined in routes.js but accessed here


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

// Render ONLY the current segment (currentStepIndex -> currentStepIndex + 1)
function renderCurrentSegment() {
    try {
        const root = document.getElementById('navigationRoot');
        if (!root) return;

        // 1. Clear previous elements (paths, arrows, markers)
        while (root.firstChild) {
            root.removeChild(root.firstChild);
        }

        // 2. Check if we reached destination
        if (currentStepIndex >= navigationPathPoints.length - 1) {
            console.log("Navigation Complete!");
            const finishText = document.createElement('a-text');
            finishText.setAttribute('value', "YOU HAVE ARRIVED!");
            finishText.setAttribute('position', "0 0.5 -1"); 
            finishText.setAttribute('align', 'center');
            finishText.setAttribute('color', '#00FF00'); // Green
            finishText.setAttribute('scale', '2 2 2');
            root.appendChild(finishText);
            
            // Update UI
            const arText = document.getElementById('arText');
            if (arText) arText.textContent = "Arrived at Destination!";
            const nextBtn = document.getElementById('nextBtn');
            if (nextBtn) nextBtn.style.display = 'none';
            return;
        }

        const start = navigationPathPoints[currentStepIndex];
        const end = navigationPathPoints[currentStepIndex + 1];

        console.log(`Rendering Segment ${currentStepIndex}:`, start, end);

        // 3. Render Path (Neon Purple Box)
        createPathSegment(start, end);

        // 4. Render Turning Point (Red Cube) at 'end'
        // If it is the LAST point, it's the Destination.
        if (currentStepIndex === navigationPathPoints.length - 2) {
            createDestinationMarker(end);
        } else {
            createTurningCube(end);
        }

        // Update UI
        const arText = document.getElementById('arText');
        if (arText) arText.textContent = "Go Straight to Red Cube";
        const arDistance = document.getElementById('arDistance');
        if (arDistance) arDistance.textContent = `Segment ${currentStepIndex + 1} / ${navigationPathPoints.length - 1}`;
        
    } catch (e) {
        console.error("Render Segment Error: " + e.message);
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
        
        const rotY = Math.atan2(dx, dz) * (180 / Math.PI);

        const path = document.createElement('a-box');
        path.setAttribute('position', `${midX} ${midY + 0.1} ${midZ}`); // y=0.1 relative to root (on floor)
        path.setAttribute('rotation', `0 ${rotY} 0`);
        path.setAttribute('width', '0.6');
        path.setAttribute('height', '0.05');
        path.setAttribute('depth', length);
        
        // Neon Purple Glow
        path.setAttribute('color', '#8A2BE2');
        path.setAttribute('material', 'emissive: #BF00FF; emissiveIntensity: 1; opacity: 0.9'); 
        
        document.getElementById('navigationRoot').appendChild(path);
    } catch (e) {
        console.error("Path Error: " + e.message);
    }
}

function createTurningCube(position) {
    try {
        const cube = document.createElement('a-box');
        cube.setAttribute('position', `${position.x} ${position.y + 0.1} ${position.z}`);
        cube.setAttribute('width', '0.4');
        cube.setAttribute('height', '0.4');
        cube.setAttribute('depth', '0.4');
        cube.setAttribute('color', 'red');
        cube.setAttribute('material', 'emissive: #FF0000; emissiveIntensity: 0.8');
        
        // Pulse Animation
        cube.setAttribute('animation', 'property: scale; to: 1.2 1.2 1.2; dir: alternate; loop: true; dur: 800');
        
        // Click interaction
        cube.setAttribute('class', 'clickable');
        cube.addEventListener('click', function() {
            advanceSegment();
        });

        document.getElementById('navigationRoot').appendChild(cube);
    } catch (e) {
        console.error("Cube Error: " + e.message);
    }
}

function createDestinationMarker(position) {
    try {
        const marker = document.createElement('a-cylinder');
        marker.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
        marker.setAttribute('radius', '0.5');
        marker.setAttribute('height', '0.1');
        marker.setAttribute('color', 'green');
        marker.setAttribute('material', 'emissive: #00FF00');
        
        const text = document.createElement('a-text');
        text.setAttribute('value', 'DESTINATION');
        text.setAttribute('position', '0 1.5 0');
        text.setAttribute('align', 'center');
        text.setAttribute('side', 'double');
        text.setAttribute('color', '#00FF00');
        text.setAttribute('scale', '3 3 3');
        
        marker.appendChild(text);
        document.getElementById('navigationRoot').appendChild(marker);
    } catch (e) {
        console.error("Dest Error: " + e.message);
    }
}

// Handle "Next" Button / Cube Click
function advanceSegment() {
    currentStepIndex++;
    renderCurrentSegment();
}

// UI Event Listeners
// Check for both commonly used IDs (nextBtn or nextArBtn)
const nextBtn = document.getElementById('nextBtn') || document.getElementById('nextArBtn');
if (nextBtn) {
    nextBtn.addEventListener('click', advanceSegment);
} else {
    console.error("Next Button not found!");
}

document.getElementById('recenterBtn').addEventListener('click', function() {
    try {
        const camera = document.querySelector('[camera]');
        const root = document.getElementById('navigationRoot');
        if (camera && root) {
            const camRot = camera.getAttribute('rotation');
            root.setAttribute('rotation', `0 ${camRot.y} 0`);
            
            // Visual feedback
            const paths = root.querySelectorAll('a-box');
            paths.forEach(p => {
                const oldColor = p.getAttribute('color');
                p.setAttribute('color', '#FFFFFF');
                setTimeout(() => p.setAttribute('color', oldColor), 300);
            });
        }
    } catch (e) {
        console.error("Recenter Error: " + e.message);
    }
});

// Helper to wait for routes.js if needed (though it should be loaded before)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAR);
} else {
    loadAR();
}
