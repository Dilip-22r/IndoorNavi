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

// function updateDisplay(destination) {
//     const stepText = document.getElementById('stepText');
//     const stepCount = document.getElementById('stepCount');
//     const nextBtn = document.getElementById('nextBtn');
//     const arBtn = document.getElementById('arBtn');

//     // Determine length based on POINTS (AR) or INSTRUCTIONS (Text Only)
//     const totalSteps = route.points && route.points.length > 0 
//         ? route.points.length 
//         : (route.instructions ? route.instructions.length : 0);
    
//     // If we are at the end
//     if (step >= totalSteps) {
//         stepText.textContent = `You have arrived at ${destination}!`;
//         stepCount.textContent = `Total distance: ${route.distance}m`;
//         nextBtn.disabled = true;
//         nextBtn.textContent = 'Completed';
//         nextBtn.style.background = '#ccc';
//         if(arBtn) arBtn.style.display = 'none'; // Hide AR if done
//         speak("You have arrived at your destination.");
//     } else {
//         let instruction = "";
//         if (route.instructions && route.instructions[step]) {
//             instruction = route.instructions[step];
//         } else {
//              instruction = `Proceed to next waypoint.`;
//         }
        
//         stepText.textContent = instruction;
//         stepCount.textContent = `Step ${step + 1} of ${totalSteps} | Distance: ${route.distance > 0 ? route.distance : 'N/A'}`;
        
//         speak(instruction);
//     }
// }

function updateDisplay(destination) {
    const stepText = document.getElementById('stepText');
    const stepCount = document.getElementById('stepCount');
    const nextBtn = document.getElementById('nextBtn');
    const arBtn = document.getElementById('arBtn');

    // 1. Determine Total Count
    // For AR (Block C): uses points length.
    // For Text (Block E): uses instructions length.
    let totalSteps = 0;
    if (route.points && route.points.length > 0) {
        totalSteps = route.points.length;
        if(arBtn) arBtn.style.display = 'block';
    } else if (route.instructions && route.instructions.length > 0) {
        totalSteps = route.instructions.length;
        if(arBtn) arBtn.style.display = 'none'; // No AR for Block E
    }

    // 2. Check Arrival
    // If Step is beyond the last index (length usually)
    // Actually, usually steps are comparable to length.
    // If we have 3 instructions, step 0, 1, 2. Step 3 is done.
    
    if (step >= totalSteps) {
        stepText.textContent = `You have arrived at ${destination}!`;
        stepCount.textContent = `Destination Reached`;
        nextBtn.disabled = true;
        nextBtn.textContent = 'Completed';
        nextBtn.style.backgroundColor = '#888';
        speak("You have arrived at your destination.");
    } else {
        // Active Step
        let instruction = route.instructions[step] || "Proceed to next point.";
        stepText.textContent = instruction;
        stepCount.textContent = `Step ${step + 1} of ${totalSteps}`;
        nextBtn.disabled = false;
        nextBtn.textContent = 'Next Step';
        speak(instruction);
    }
}

document.getElementById('nextBtn').addEventListener('click', function() {
    const destination = localStorage.getItem('destination');
    
    // Increment Step
    step++;
    localStorage.setItem('step', step);
    updateDisplay(destination);
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
