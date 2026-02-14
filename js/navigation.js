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
    
    const stepTextEl = stepText; // Alias for clarity
    
    if (step >= totalPoints - 1) {
        stepText.textContent = `You have arrived at ${destination}!`;
        stepCount.textContent = `Total distance: ${route.distance}m`;
        nextBtn.disabled = true;
        nextBtn.textContent = 'Completed';
        speak("You have arrived at your destination.");
    } else {
        // Use Pre-calculated instructions from MapService
        let instruction = "Proceed to next waypoint.";
        if (route.instructions && route.instructions[step]) {
            instruction = route.instructions[step];
        } else {
             instruction = `Move to next point.`;
        }
        
        stepText.textContent = instruction;
        stepCount.textContent = `Step ${step + 1} of ${totalPoints - 1} | Distance: ${route.distance}m`;
        
        // Speak instruction (Debounced)
        speak(instruction);
    }
}

// Text-to-Speech Helper
function speak(text) {
    if ('speechSynthesis' in window) {
        // Cancel previous speech to avoid queue buildup
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
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
