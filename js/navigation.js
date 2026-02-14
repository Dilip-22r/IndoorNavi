let route = null;
let step = 0;

const TRANSLATIONS = {
    'en-US': {
        follow: "Proceed to next waypoint.",
        arrived: "You have arrived at your destination.",
        step: "Step",
        title: "Navigation",
        current_step: "Current Step:",
        next_btn: "Next Step",
        ar_btn: "Open AR View"
    },
    'te-IN': {
        follow: "తదుపరి పాయింట్‌కి వెళ్లండి.",
        arrived: "మీరు మీ గమ్యాన్ని చేరుకున్నారు.",
        step: "దశ",
        title: "నావిగేషన్",
        current_step: "ప్రస్తుత దశ:",
        next_btn: "తదుపరి దశ",
        ar_btn: "AR వీక్షణను తెరవండి"
    },
    'hi-IN': {
        follow: "अगले पड़ाव की ओर बढ़ें।",
        arrived: "आप अपने गंतव्य पर पहुंच गए हैं।",
        step: "चरण",
        title: "नेविगेशन",
        current_step: "वर्तमान चरण:",
        next_btn: "अगला कदम",
        ar_btn: "AR दृश्य खोलें"
    }
};

function getTranslation(key) {
    const lang = localStorage.getItem('appLanguage') || 'en-US';
    return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS['en-US'][key];
}

function updateUILanguage() {
    const lang = localStorage.getItem('appLanguage') || 'en-US';
    const t = TRANSLATIONS[lang] || TRANSLATIONS['en-US'];

    const titleEl = document.querySelector('h1');
    if (titleEl) titleEl.textContent = t.title;
    
    // Assuming h2 is "Current Step:"? Check HTML separately, maybe dynamic.
    // Based on remote repo, there's h2. In existing code? No h2 used for step.
    // Existing code uses `stepCount` and `stepText`.
    // I will adapt:
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) nextBtn.textContent = t.next_btn;
    
    const arBtn = document.getElementById('arBtn');
    if (arBtn) arBtn.textContent = t.ar_btn;
}

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
    
    updateUILanguage();
    updateDisplay(destination);
}

function updateDisplay(destination) {
    const stepText = document.getElementById('stepText');
    const stepCount = document.getElementById('stepCount');
    const nextBtn = document.getElementById('nextBtn');

    const totalPoints = route.points.length;
    
    // Get Language
    const lang = localStorage.getItem('appLanguage') || 'en-US';

    if (step >= totalPoints - 1) {
        // Arrived
        const arrivedText = getTranslation('arrived');
        stepText.textContent = arrivedText; // Simplified: just the translated text
        stepCount.textContent = `Total distance: ${route.distance}m`;
        nextBtn.disabled = true;
        nextBtn.textContent = 'Completed';
        speak(arrivedText);
    } else {
        // Instructions
        let instruction = "";

        if (lang.startsWith('en')) {
            // English: Use detailed instructions from route if available
            if (route.instructions && route.instructions[step]) {
                instruction = route.instructions[step];
            } else {
                instruction = getTranslation('follow');
            }
        } else {
            // Non-English: Use Generic Translated String
            instruction = getTranslation('follow');
        }

        stepText.textContent = instruction;

        const stepLabel = getTranslation('step');
        stepCount.textContent = `${stepLabel} ${step + 1} / ${totalPoints - 1} | Distance: ${route.distance}m`;

        // Speak instruction
        speak(instruction);
    }
}

// Text-to-Speech Helper
let isVoiceEnabled = localStorage.getItem('voiceEnabled') !== 'false';

function speak(text) {
    if (!isVoiceEnabled) return;

    if ('speechSynthesis' in window) {
        // Cancel previous speech to avoid queue buildup
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Get Selected Language
        const lang = localStorage.getItem('appLanguage') || 'en-US';
        utterance.lang = lang;

        // CRITICAL: Text-to-Speech often ignores .lang if .voice is not set
        // We must find a matching voice object.
        const voices = window.speechSynthesis.getVoices();

        // 1. Try exact match (e.g., 'Google Telugu', 'Lekha')
        let selectedVoice = voices.find(v => v.lang === lang);

        // 2. Try partial match (e.g., 'te' for 'te-IN')
        if (!selectedVoice) {
            const shortLang = lang.split('-')[0];
            selectedVoice = voices.find(v => v.lang.startsWith(shortLang));
        }

        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        window.speechSynthesis.speak(utterance);
    }
}

function toggleVoice() {
    isVoiceEnabled = !isVoiceEnabled;
    localStorage.setItem('voiceEnabled', isVoiceEnabled);
    
    const btn = document.getElementById('voiceBtn');
    if (btn) {
        btn.textContent = isVoiceEnabled ? "🔊" : "🔇";
        btn.style.backgroundColor = isVoiceEnabled ? "rgba(0, 0, 0, 0.5)" : "rgba(255, 68, 68, 0.8)";
    }
    // Only speak feedback if enabled, or if disabling (to confirm)
    if (isVoiceEnabled) speak("Voice enabled");
}

function setupVoiceButton() {
    let voiceBtn = document.getElementById('voiceBtn');
    if (!voiceBtn) {
        voiceBtn = document.createElement('button');
        voiceBtn.id = 'voiceBtn';
        voiceBtn.className = "btn"; 
        voiceBtn.style.cssText = `
            position: fixed; 
            top: 10px; 
            right: 10px; 
            z-index: 1001; 
            width: 32px;
            height: 32px;
            padding: 0;
            background: rgba(0, 0, 0, 0.5); 
            color: white; 
            border: 1px solid rgba(255,255,255,0.5); 
            border-radius: 50%; 
            font-size: 16px;
            cursor: pointer;
            display: flex; justify-content: center; align-items: center;
        `;
        document.body.appendChild(voiceBtn);
        voiceBtn.addEventListener('click', toggleVoice);
    }
    // Set initial state
    voiceBtn.textContent = isVoiceEnabled ? "🔊" : "🔇";
    voiceBtn.style.backgroundColor = isVoiceEnabled ? "rgba(0, 0, 0, 0.5)" : "rgba(255, 68, 68, 0.8)";
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



setupVoiceButton();
loadRoute();
