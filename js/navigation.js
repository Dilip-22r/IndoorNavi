let route = null;
let step = 0;

function loadRoute() {
    const routeData = localStorage.getItem('currentRoute');
    const stepData = localStorage.getItem('step');
    const destination = localStorage.getItem('destination');

    if (!routeData) {
        window.location.href = 'index.html';
        return;
    }

    route = JSON.parse(routeData);
    step = parseInt(stepData) || 0;
    
    updateDisplay(destination);
}

function updateDisplay(destination) {
    const stepText = document.getElementById('stepText');
    const stepCount = document.getElementById('stepCount');
    const nextBtn = document.getElementById('nextBtn');

    const totalPoints = route.points.length;
    
    if (step >= totalPoints - 1) {
        stepText.textContent = `You have arrived at C-${destination}!`;
        stepCount.textContent = `Total distance: ${route.distance}m`;
        nextBtn.disabled = true;
        nextBtn.textContent = 'Completed';
    } else {
        const currentPoint = route.points[step];
        const nextPoint = route.points[step + 1];
        
        // Calculate direction
        let direction = 'forward';
        if (nextPoint.x > currentPoint.x) direction = 'right';
        else if (nextPoint.x < currentPoint.x) direction = 'left';
        else if (nextPoint.z > currentPoint.z) direction = 'forward';
        
        stepText.textContent = `Move ${direction} to next point (${route.segmentLength || 5}m)`;
        stepCount.textContent = `Step ${step + 1} of ${totalPoints - 1} | Distance: ${route.distance}m`;
    }
}

document.getElementById('nextBtn').addEventListener('click', function() {
    const destination = localStorage.getItem('destination');
    if (step < route.points.length - 2) {
        step++;
        localStorage.setItem('step', step);
        updateDisplay(destination);
    } else if (step === route.points.length - 2) {
        step++;
        localStorage.setItem('step', step);
        updateDisplay(destination);
    }
});

document.getElementById('arBtn').addEventListener('click', function() {
    const routeKey = localStorage.getItem('routeKey');
    if (routeKey) {
        window.location.href = 'ar.html?route=' + routeKey;
    } else {
        alert("No route selected!");
        window.location.href = 'index.html';
    }
});

loadRoute();
