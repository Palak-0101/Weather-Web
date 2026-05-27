let currentData = null;
let currentCoords = null;
let isPast = false;
let currentMethod = 'manual';

const elements = {
    bg: document.getElementById('weather-bg'),
    lightning: document.getElementById('lightning-layer'),
    input: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    loading: document.getElementById('loading'),
    result: document.getElementById('result-section'),
    error: document.getElementById('error-msg'),
    cityName: document.getElementById('city-name-value'),
    temp: document.getElementById('temp-value'),
    wind: document.getElementById('wind-value'),
    iconLarge: document.getElementById('weather-icon-large'),
    quoteText: document.getElementById('quote-text'),
    quoteIcon: document.getElementById('quote-icon'),
    forecastGrid: document.getElementById('forecast-grid')
};

// INITIAL LOAD
window.onload = () => {
    search('Lucknow, India');
};

// METHOD TOGGLES
document.getElementById('btn-manual').onclick = () => setMethod('manual');
document.getElementById('btn-pincode').onclick = () => setMethod('pincode');
document.getElementById('btn-current').onclick = () => getLiveLocation();

function setMethod(m) {
    currentMethod = m;
    document.querySelectorAll('.method-toggle button').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${m}`)?.classList.add('active');
    elements.input.disabled = (m === 'current');
    elements.input.placeholder = m === 'manual' ? "Enter City, Country or Landmark..." : "Enter 6-digit Pincode (e.g. 110001)...";
    if (m === 'current') elements.input.value = "Detecting your cozy spot...";
    else elements.input.value = "";
}

// SEARCH LOGIC
elements.searchBtn.onclick = () => {
    const q = elements.input.value;
    if (q) search(q);
};

async function search(query) {
    showLoading(true);
    hideError();

    try {
        // Pincode?  I have checked this code this is not working properly
        if (/^\d{6}$/.test(query.trim())) {
            const pinUrl = `https://api.postalpincode.in/pincode/${query}`;
            const pinRes = await fetch(pinUrl);
            const pinData = await pinRes.json();
            console.log(pinData);
            if (pinData[0].Status === "Success" && pinData[0].PostOffice.length > 0) {
                const p = pinData[0].PostOffice[0];
                // await fetchWeather(parseFloat(p.latitude), parseFloat(p.longitude), `${p['place name']}, ${p['state']}`);
                const village = p.Name;

            const district = p.District;

            const state = p.State;



            console.log(village);
            console.log(district);
            console.log(state);



            /*
            Example display
            */

            document.getElementById("result").innerHTML =

            `
            Village/Post Office: ${village}
            <br><br>

            District: ${district}
            <br><br>

            State: ${state}
            `;

            return;
            }
        }

        // Global Name Search
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();

        if (!geoData.results?.length) throw new Error("Not found");
        const r = geoData.results[0];
        await fetchWeather(r.latitude, r.longitude, `${r.name}, ${r.country}`);
    } catch (e) {
        showError("Our leaves are a bit tangled! We couldn't find that cozy spot. 🌿");
    } finally {
        showLoading(false);
    }
}

async function fetchWeather(lat, lon, cityName, past = false) {
    isPast = past;
    currentCoords = { lat, lon };
    
    let url = "";
    if (past) {
        const start = new Date(); start.setDate(start.getDate() - 7);
        const end = new Date(); end.setDate(end.getDate() - 2);
        const fmt = d => d.toISOString().split('T')[0];
        url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${fmt(start)}&end_date=${fmt(end)}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
    } else {
        url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&current_weather=true&timezone=auto`;
    }

    const res = await fetch(url);
    const w = await res.json();
    if (!w.daily) throw new Error("No data");

    const forecast = w.daily.time.map((t, i) => ({
        date: t, code: w.daily.weather_code[i], max: w.daily.temperature_2m_max[i], min: w.daily.temperature_2m_min[i]
    }));

    const current = {
        city: cityName,
        temp: w.current_weather?.temperature || forecast[forecast.length-1].max,
        code: w.current_weather?.weathercode || forecast[forecast.length-1].code,
        wind: w.current_weather?.windspeed || 0,
        forecast
    };

    renderWeather(current);
}

function renderWeather(w) {
    elements.result.classList.remove('hidden');
    elements.cityName.innerText = w.city;
    elements.temp.innerText = Math.round(w.temp);
    elements.wind.innerText = `${w.wind} km/h`;
    
    updateBackground(w.code, w.temp);
    updateQuotes(w.code, w.temp);
    renderForecast(w.forecast);

    elements.iconLarge.innerHTML = getIconHtml(w.code, 64);
    lucide.createIcons();
}

// UI HELPERS
function showLoading(s) { 
    if(s) elements.loading.classList.remove('hidden'); 
    else elements.loading.classList.add('hidden'); 
}
function showError(msg) {
    elements.error.innerText = msg;
    elements.error.classList.remove('hidden');
}
function hideError() { elements.error.classList.add('hidden'); }

function getIconHtml(code, size = 24) {
    if (code <= 1) return `<i data-lucide="sun" style="width:${size}px; height:${size}px; color:#facc15"></i>`;
    if (code <= 3) return `<i data-lucide="cloud" style="width:${size}px; height:${size}px; color:#94a3b8"></i>`;
    if (code >= 51 && code <= 67) return `<i data-lucide="cloud-rain" style="width:${size}px; height:${size}px; color:#60a5fa"></i>`;
    if (code >= 71 && code <= 77) return `<i data-lucide="cloud-snow" style="width:${size}px; height:${size}px; color:#94a3b8"></i>`;
    if (code >= 95) return `<i data-lucide="cloud-lightning" style="width:${size}px; height:${size}px; color:#7c3aed"></i>`;
    return `<i data-lucide="wind" style="width:${size}px; height:${size}px; color:#94a3b8"></i>`;
}

function updateBackground(code, temp) {
    elements.bg.innerHTML = "";
    elements.lightning.classList.remove('lightning-active');

    const isRaining = ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) && temp < 38;
    const isVeryHot = (temp >= 35);
    const isStormy = (code >= 95);

    if (temp >= 38) document.body.style.background = "#fff7ed";
    else if (temp >= 30) document.body.style.background = "var(--bg-pastel-yellow)";
    else if (isRaining) document.body.style.background = "var(--bg-pastel-blue)";
    else document.body.style.background = "var(--bg-pastel-green)";

    if (isRaining || isStormy) {
        for(let i=0; i<80; i++) {
            const r = document.createElement('div');
            r.className = 'raindrop';
            r.style.left = `${Math.random()*100}vw`;
            r.style.animationDuration = `${0.5 + Math.random()*0.5}s`;
            r.style.animationDelay = `${Math.random()*2}s`;
            elements.bg.appendChild(r);
        }
    }

    if ((code <= 3 || isVeryHot) && !isRaining) {
        const s = document.createElement('div');
        s.className = 'sun-ray';
        s.style.top = '10%'; s.style.right = '10%';
        s.style.width = isVeryHot ? '600px' : '400px';
        s.style.height = isVeryHot ? '600px' : '400px';
        elements.bg.appendChild(s);
    }
    
    if (isStormy) elements.lightning.classList.add('lightning-active');
}

function updateQuotes(code, temp) {
    let q = { text: "Nature sustains us every second. Plant a tree today! 🌳", icon: "tree-pine", color: "#4ade80" };
    if (temp >= 35) q = { text: "The Earth is feeling warm! Perfect time to switch off that AC and plant a tree. 🌳", icon: "sun", color: "#f97316" };
    else if (code >= 51 && code <= 67) q = { text: "Every raindrop is a precious gift. Let's save every drop! 💧", icon: "droplets", color: "#60a5fa" };
    
    elements.quoteText.innerText = q.text;
    elements.quoteIcon.innerHTML = `<i data-lucide="${q.icon}" style="color:${q.color}; width:32px; height:32px;"></i>`;
}

function renderForecast(days) {
    elements.forecastGrid.innerHTML = "";
    days.slice(0, 5).forEach(d => {
        const card = document.createElement('div');
        card.className = "glass forecast-card fade-in";
        const date = new Date(d.date).toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
        card.innerHTML = `
            <p style="font-weight:600; color:var(--text-soft); margin-bottom:1rem">${date}</p>
            <div style="margin-bottom:1rem">${getIconHtml(d.code, 32)}</div>
            <p style="font-size:1.5rem; font-weight:700">${Math.round(d.max)}°</p>
            <p style="font-size:0.9rem; color:var(--text-soft)">${Math.round(d.min)}°</p>
        `;
        elements.forecastGrid.appendChild(card);
    });
}

// TOGGLES FOR PAST/FUTURE
document.getElementById('btn-after').onclick = () => {
    isPast = false;
    document.getElementById('btn-after').classList.add('active');
    document.getElementById('btn-before').classList.remove('active');
    if(currentCoords) fetchWeather(currentCoords.lat, currentCoords.lon, elements.cityName.innerText, false);
};
document.getElementById('btn-before').onclick = () => {
    isPast = true;
    document.getElementById('btn-before').classList.add('active');
    document.getElementById('btn-after').classList.remove('active');
    if(currentCoords) fetchWeather(currentCoords.lat, currentCoords.lon, elements.cityName.innerText, true);
};

function getLiveLocation() {
    setMethod('current');
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(p => fetchWeather(p.coords.latitude, p.coords.longitude, "Your Location"));
    }
}
