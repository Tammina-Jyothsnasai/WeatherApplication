/**
 * WeatherHub Client Script
 * Powers real-time dashboard interactions, canvas weather animation effects,
 * 24-hour hourly trend spline chart, solar arc sun position tracker,
 * air quality index (AQI) monitoring, animated wind direction compass,
 * interactive Leaflet radar map, geolocation, and MySQL-backed favourite city CRUD.
 */

document.addEventListener("DOMContentLoaded", () => {
    // -------------------------------------------------------------------------
    // 1. Application State
    // -------------------------------------------------------------------------
    const state = {
        currentWeather: null,
        forecastList: [],
        unit: localStorage.getItem("weatherhub-unit") || "C", // "C" or "F"
        theme: localStorage.getItem("weatherhub-theme") || "dark",
        activeCity: "Vijayawada",
        activeCountry: "IN",
        activeCoords: { lat: 16.5062, lon: 80.6480 },
        pendingDeleteId: null,
        isSearching: false,
        favoritesList: [],
        radarLayer: null,
        radarActive: true,
        leafletMap: null,
        mapMarker: null,
        recentSearches: JSON.parse(localStorage.getItem("weatherhub-recent") || '["Vijayawada", "Hyderabad", "Tokyo", "London"]')
    };

    // -------------------------------------------------------------------------
    // 2. DOM Elements
    // -------------------------------------------------------------------------
    const searchForm = document.getElementById("weather-search-form");
    const cityInput = document.getElementById("city-input");
    const countryInput = document.getElementById("country-input");
    const searchButton = document.getElementById("search-button");
    const geoLocationBtn = document.getElementById("geo-location-btn");
    const recentPillsList = document.getElementById("recent-pills-list");
    const weatherMessage = document.getElementById("weather-message");

    // Hero Elements
    const heroWeatherCanvas = document.getElementById("hero-weather-canvas");
    const heroCityName = document.getElementById("hero-city-name");
    const heroCountryCode = document.getElementById("hero-country-code");
    const heroStateName = document.getElementById("hero-state-name");
    const heroDatetime = document.getElementById("hero-datetime");
    const heroTempValue = document.getElementById("hero-temp-value");
    const heroConditionText = document.getElementById("hero-condition-text");
    const heroFeelsValue = document.getElementById("hero-feels-value");
    const heroHighVal = document.getElementById("hero-high-val");
    const heroLowVal = document.getElementById("hero-low-val");
    const btnQuickFavorite = document.getElementById("btn-quick-favorite");
    const quickFavIcon = document.getElementById("quick-fav-icon");

    // 5 Colorful Metric Elements
    const metricFeelsLike = document.getElementById("metric-feels-like");
    const metricHumidity = document.getElementById("metric-humidity");
    const metricWindSpeed = document.getElementById("metric-wind-speed");
    const metricPressure = document.getElementById("metric-pressure");
    const metricVisibility = document.getElementById("metric-visibility");

    // 24-Hour Trend Chart Elements
    const hourlyChartCanvas = document.getElementById("hourly-temp-chart");
    const chartCityLabel = document.getElementById("chart-city-label");
    const chartHourlyPills = document.getElementById("chart-hourly-pills");

    // Advanced Insights Elements
    // Solar Arc
    const solarSunDot = document.getElementById("solar-sun-dot");
    const solarArcProgress = document.getElementById("solar-arc-progress");
    const solarSunriseVal = document.getElementById("solar-sunrise-val");
    const solarSunsetVal = document.getElementById("solar-sunset-val");
    const daylightDurationText = document.getElementById("daylight-duration-text");

    // Air Quality
    const aqiBadge = document.getElementById("aqi-badge");
    const aqiMeterFill = document.getElementById("aqi-meter-fill");
    const aqiAdvice = document.getElementById("aqi-advice");
    const pollutantPm25 = document.getElementById("pollutant-pm25");
    const pollutantPm10 = document.getElementById("pollutant-pm10");
    const pollutantO3 = document.getElementById("pollutant-o3");
    const pollutantNo2 = document.getElementById("pollutant-no2");

    // Wind Compass
    const compassNeedle = document.getElementById("compass-needle");
    const compassDegreesText = document.getElementById("compass-degrees-text");
    const compassCardinalDir = document.getElementById("compass-cardinal-dir");
    const compassSpeedVal = document.getElementById("compass-speed-val");
    const compassGustVal = document.getElementById("compass-gust-val");

    // Forecast Elements
    const forecastCardsContainer = document.getElementById("forecast-cards-container");
    const btnViewDetailedForecast = document.getElementById("btn-view-detailed-forecast");
    const detailedForecastModal = document.getElementById("detailed-forecast-modal");
    const closeDetailedModal = document.getElementById("close-detailed-modal");
    const detailedHourlyStrip = document.getElementById("detailed-hourly-strip");

    // Interactive Map Modal Elements
    const weatherMapModal = document.getElementById("weather-map-modal");
    const closeMapModal = document.getElementById("close-map-modal");
    const mapModalCitySubtitle = document.getElementById("map-modal-city-subtitle");
    const btnToggleRadar = document.getElementById("btn-toggle-radar");
    const btnViewOnMap = document.getElementById("btn-view-on-map");

    // Favourites Elements
    const favoritesListContainer = document.getElementById("favorites-list-container");
    const btnAddFavorite = document.getElementById("btn-add-favorite");
    const addFavoriteModal = document.getElementById("add-favorite-modal");
    const closeAddModal = document.getElementById("close-add-modal");
    const cancelAddModal = document.getElementById("cancel-add-modal");
    const addFavoriteForm = document.getElementById("add-favorite-form");
    const favCityInput = document.getElementById("fav-city-input");
    const favCountryInput = document.getElementById("fav-country-input");
    const favNicknameInput = document.getElementById("fav-nickname-input");

    // Edit Nickname Elements
    const editFavoriteModal = document.getElementById("edit-favorite-modal");
    const closeEditModal = document.getElementById("close-edit-modal");
    const cancelEditModal = document.getElementById("cancel-edit-modal");
    const editFavoriteForm = document.getElementById("edit-favorite-form");
    const editFavId = document.getElementById("edit-fav-id");
    const editFavCity = document.getElementById("edit-fav-city");
    const editFavCountry = document.getElementById("edit-fav-country");
    const editFavNickname = document.getElementById("edit-fav-nickname");

    // Delete Modal Elements
    const deleteFavoriteModal = document.getElementById("delete-favorite-modal");
    const closeDeleteModal = document.getElementById("close-delete-modal");
    const cancelDeleteModal = document.getElementById("cancel-delete-modal");
    const confirmDeleteModal = document.getElementById("confirm-delete-modal");
    const deleteFavCityName = document.getElementById("delete-fav-city-name");

    // Controls
    const themeToggle = document.getElementById("theme-toggle");
    const unitCBtn = document.getElementById("unit-c");
    const unitFBtn = document.getElementById("unit-f");
    const sidebar = document.getElementById("sidebar");
    const sidebarToggle = document.getElementById("sidebar-toggle");

    // -------------------------------------------------------------------------
    // 3. Status Notification Banner
    // -------------------------------------------------------------------------
    let notifTimer = null;
    function showNotification(msg, type = "info", duration = 4000) {
        if (!weatherMessage) return;
        if (notifTimer) clearTimeout(notifTimer);

        weatherMessage.textContent = msg;
        weatherMessage.className = `weather-message show ${type}`;

        if (duration > 0) {
            notifTimer = setTimeout(() => {
                weatherMessage.className = "weather-message";
                weatherMessage.textContent = "";
            }, duration);
        }
    }

    // -------------------------------------------------------------------------
    // 4. API Request Helper
    // -------------------------------------------------------------------------
    async function apiRequest(url, options = {}) {
        let res;
        try {
            res = await fetch(url, {
                ...options,
                headers: {
                    Accept: "application/json",
                    ...(options.headers || {})
                }
            });
        } catch (err) {
            throw new Error("Unable to connect to Flask server. Please check your network.");
        }

        let data;
        try {
            data = await res.json();
        } catch (e) {
            throw new Error("Invalid server response format.");
        }

        if (!res.ok) {
            const err = new Error(data?.error || data?.provider_message || `Request failed (${res.status})`);
            err.status = res.status;
            throw err;
        }

        return data;
    }

    // -------------------------------------------------------------------------
    // 5. Temperature Unit Conversion & Number Animation
    // -------------------------------------------------------------------------
    function toDisplayTemp(celsius) {
        if (celsius === null || celsius === undefined || Number.isNaN(Number(celsius))) {
            return "--";
        }
        const num = Number(celsius);
        if (state.unit === "F") {
            return Math.round((num * 9) / 5 + 32);
        }
        return Math.round(num * 10) / 10;
    }

    function animateNumber(element, targetVal, duration = 600, decimals = 1) {
        if (!element || targetVal === "--" || targetVal === null || targetVal === undefined) return;
        const target = Number(targetVal);
        if (Number.isNaN(target)) {
            element.textContent = targetVal;
            return;
        }

        const startVal = parseFloat(element.textContent) || 0;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const ease = 1 - Math.pow(1 - progress, 3);
            const current = startVal + (target - startVal) * ease;

            element.textContent = decimals > 0 ? current.toFixed(decimals) : Math.round(current);

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = decimals > 0 ? target.toFixed(decimals) : Math.round(target);
            }
        }
        requestAnimationFrame(update);
    }

    function setTemperatureUnit(newUnit) {
        if (state.unit === newUnit) return;
        state.unit = newUnit;
        localStorage.setItem("weatherhub-unit", newUnit);

        const isC = newUnit === "C";
        unitCBtn?.classList.toggle("active", isC);
        unitCBtn?.setAttribute("aria-pressed", String(isC));
        unitFBtn?.classList.toggle("active", !isC);
        unitFBtn?.setAttribute("aria-pressed", String(!isC));

        document.querySelectorAll(".hero-temp-unit").forEach((el) => {
            el.textContent = `°${newUnit}`;
        });

        // Re-render current weather, forecast & chart
        if (state.currentWeather) {
            renderCurrentWeather(state.currentWeather);
        }
        if (state.forecastList && state.forecastList.length > 0) {
            renderForecasts(state.forecastList);
            renderHourlyChart(state.forecastList);
        }
        loadFavorites();
    }

    unitCBtn?.addEventListener("click", () => setTemperatureUnit("C"));
    unitFBtn?.addEventListener("click", () => setTemperatureUnit("F"));

    // -------------------------------------------------------------------------
    // 6. Theme Switching
    // -------------------------------------------------------------------------
    function applyTheme(theme) {
        state.theme = theme;
        document.body.classList.toggle("light-theme", theme === "light");
        localStorage.setItem("weatherhub-theme", theme);
        // Refresh canvas / chart styles if needed
        if (state.forecastList.length > 0) {
            renderHourlyChart(state.forecastList);
        }
    }

    themeToggle?.addEventListener("click", () => {
        applyTheme(state.theme === "light" ? "dark" : "light");
    });
    applyTheme(state.theme);

    // -------------------------------------------------------------------------
    // 7. Real-Time Clock
    // -------------------------------------------------------------------------
    function updateClock() {
        const dateEl = document.getElementById("current-date-text");
        const timeEl = document.getElementById("current-time-text");
        const now = new Date();

        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString("en-US", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric"
            });
        }
        if (timeEl) {
            timeEl.textContent = now.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            });
        }
    }
    updateClock();
    setInterval(updateClock, 1000);

    // -------------------------------------------------------------------------
    // 8. Recent Searches Pill Bar
    // -------------------------------------------------------------------------
    function renderRecentSearches() {
        if (!recentPillsList) return;
        recentPillsList.innerHTML = "";
        state.recentSearches.slice(0, 6).forEach((city) => {
            const pill = document.createElement("button");
            pill.type = "button";
            pill.className = "recent-pill";
            pill.textContent = city;
            pill.addEventListener("click", () => {
                if (cityInput) cityInput.value = city;
                loadWeatherData(city, "");
            });
            recentPillsList.appendChild(pill);
        });
    }

    function addRecentSearch(cityName) {
        if (!cityName) return;
        const clean = cityName.trim();
        state.recentSearches = [clean, ...state.recentSearches.filter((c) => c.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
        localStorage.setItem("weatherhub-recent", JSON.stringify(state.recentSearches));
        renderRecentSearches();
    }
    renderRecentSearches();

    // -------------------------------------------------------------------------
    // 9. Live Weather Canvas Particle Animation (Rain, Snow, Stars, Clouds)
    // -------------------------------------------------------------------------
    let canvasAnimationId = null;
    let canvasParticles = [];

    function initWeatherCanvas(weatherMain, isNight) {
        if (!heroWeatherCanvas) return;
        const ctx = heroWeatherCanvas.getContext("2d");
        if (!ctx) return;

        if (canvasAnimationId) {
            cancelAnimationFrame(canvasAnimationId);
            canvasAnimationId = null;
        }

        const rect = heroWeatherCanvas.getBoundingClientRect();
        heroWeatherCanvas.width = rect.width || 600;
        heroWeatherCanvas.height = rect.height || 260;

        const w = heroWeatherCanvas.width;
        const h = heroWeatherCanvas.height;

        canvasParticles = [];
        const condition = (weatherMain || "").toLowerCase();

        // Particle configuration based on weather
        if (condition.includes("rain") || condition.includes("drizzle") || condition.includes("thunder")) {
            // Rain Streaks
            const count = condition.includes("heavy") ? 90 : 55;
            for (let i = 0; i < count; i++) {
                canvasParticles.push({
                    type: "rain",
                    x: Math.random() * w,
                    y: Math.random() * h,
                    len: 12 + Math.random() * 15,
                    speed: 10 + Math.random() * 8,
                    slant: -1.5,
                    alpha: 0.25 + Math.random() * 0.4
                });
            }
        } else if (condition.includes("snow")) {
            // Swaying Snowflakes
            for (let i = 0; i < 60; i++) {
                canvasParticles.push({
                    type: "snow",
                    x: Math.random() * w,
                    y: Math.random() * h,
                    r: 1.5 + Math.random() * 2.5,
                    speed: 0.8 + Math.random() * 1.5,
                    swing: Math.random() * Math.PI * 2,
                    swingSpeed: 0.02 + Math.random() * 0.03
                });
            }
        } else if (isNight || condition.includes("clear")) {
            // Twinkling Night Stars & Subtle Shooting Stars
            for (let i = 0; i < 45; i++) {
                canvasParticles.push({
                    type: "star",
                    x: Math.random() * w,
                    y: Math.random() * (h * 0.75),
                    r: 0.8 + Math.random() * 1.6,
                    alpha: 0.3 + Math.random() * 0.7,
                    twinkleSpeed: 0.02 + Math.random() * 0.04
                });
            }
        } else {
            // Drifting Soft Cloud Puffs
            for (let i = 0; i < 15; i++) {
                canvasParticles.push({
                    type: "cloud",
                    x: Math.random() * w,
                    y: Math.random() * (h * 0.6),
                    r: 30 + Math.random() * 45,
                    speed: 0.15 + Math.random() * 0.25,
                    alpha: 0.04 + Math.random() * 0.08
                });
            }
        }

        let frame = 0;
        function animate() {
            ctx.clearRect(0, 0, w, h);
            frame++;

            for (let i = 0; i < canvasParticles.length; i++) {
                const p = canvasParticles[i];

                if (p.type === "rain") {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(186, 230, 253, ${p.alpha})`;
                    ctx.lineWidth = 1.2;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x + p.slant * p.len * 0.3, p.y + p.len);
                    ctx.stroke();

                    p.y += p.speed;
                    p.x += p.slant;
                    if (p.y > h) {
                        p.y = -p.len;
                        p.x = Math.random() * w;
                    }
                } else if (p.type === "snow") {
                    p.swing += p.swingSpeed;
                    p.x += Math.sin(p.swing) * 0.6;
                    p.y += p.speed;

                    ctx.beginPath();
                    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fill();

                    if (p.y > h) {
                        p.y = -p.r;
                        p.x = Math.random() * w;
                    }
                } else if (p.type === "star") {
                    p.alpha += Math.sin(frame * p.twinkleSpeed) * 0.02;
                    const clampedAlpha = Math.max(0.15, Math.min(1, p.alpha));

                    ctx.beginPath();
                    ctx.fillStyle = `rgba(254, 243, 199, ${clampedAlpha})`;
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fill();
                } else if (p.type === "cloud") {
                    p.x += p.speed;
                    ctx.beginPath();
                    ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fill();

                    if (p.x - p.r > w) {
                        p.x = -p.r;
                        p.y = Math.random() * (h * 0.6);
                    }
                }
            }

            canvasAnimationId = requestAnimationFrame(animate);
        }
        animate();
    }

    window.addEventListener("resize", () => {
        if (state.currentWeather) {
            const isNight = state.currentWeather.icon?.includes("n") || false;
            initWeatherCanvas(state.currentWeather.weather_main, isNight);
        }
        if (state.forecastList.length > 0) {
            renderHourlyChart(state.forecastList);
        }
    });

    // -------------------------------------------------------------------------
    // 10. Interactive 24-Hour Temperature Spline Chart (HTML5 Canvas)
    // -------------------------------------------------------------------------
    function renderHourlyChart(forecasts) {
        if (!hourlyChartCanvas || !forecasts || forecasts.length === 0) return;
        const ctx = hourlyChartCanvas.getContext("2d");
        if (!ctx) return;

        const slice = forecasts.slice(0, 8); // 8 intervals of 3-hours = 24 hours
        if (slice.length === 0) return;

        // Set high-DPI canvas dimensions
        const rect = hourlyChartCanvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const width = rect.width || 600;
        const height = rect.height || 160;

        hourlyChartCanvas.width = width * dpr;
        hourlyChartCanvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        if (chartCityLabel) {
            chartCityLabel.textContent = `${state.activeCity}, ${state.activeCountry || "IN"}`;
        }

        const temps = slice.map((item) => Number(toDisplayTemp(item.temperature)));
        const minT = Math.min(...temps) - 2;
        const maxT = Math.max(...temps) + 2;
        const tempRange = Math.max(maxT - minT, 1);

        const padLeft = 32;
        const padRight = 32;
        const padTop = 26;
        const padBottom = 34;
        const plotW = width - padLeft - padRight;
        const plotH = height - padTop - padBottom;

        const points = slice.map((item, idx) => {
            const x = padLeft + (idx / (slice.length - 1)) * plotW;
            const t = Number(toDisplayTemp(item.temperature));
            const y = padTop + plotH - ((t - minT) / tempRange) * plotH;
            const timeObj = new Date(item.dt * 1000);
            const timeLabel = timeObj.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
            return { x, y, temp: t, timeLabel, icon: item.icon, desc: item.description, pop: item.precipitation_probability };
        });

        // 1. Draw smooth gradient area under the spline
        const areaGrad = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
        areaGrad.addColorStop(0, "rgba(56, 189, 248, 0.45)");
        areaGrad.addColorStop(0.7, "rgba(26, 115, 232, 0.15)");
        areaGrad.addColorStop(1, "rgba(26, 115, 232, 0.0)");

        ctx.beginPath();
        ctx.moveTo(points[0].x, height - padBottom);
        ctx.lineTo(points[0].x, points[0].y);

        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const cpx1 = p0.x + (p1.x - p0.x) / 2;
            const cpy1 = p0.y;
            const cpx2 = p0.x + (p1.x - p0.x) / 2;
            const cpy2 = p1.y;
            ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, p1.x, p1.y);
        }

        ctx.lineTo(points[points.length - 1].x, height - padBottom);
        ctx.closePath();
        ctx.fillStyle = areaGrad;
        ctx.fill();

        // 2. Draw smooth stroke curve
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const cpx1 = p0.x + (p1.x - p0.x) / 2;
            const cpy1 = p0.y;
            const cpx2 = p0.x + (p1.x - p0.x) / 2;
            const cpy2 = p1.y;
            ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, p1.x, p1.y);
        }
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        ctx.stroke();

        // 3. Draw nodes, values, and time labels
        ctx.textAlign = "center";
        points.forEach((pt) => {
            // Vertical dotted guideline
            ctx.beginPath();
            ctx.setLineDash([2, 4]);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
            ctx.moveTo(pt.x, pt.y);
            ctx.lineTo(pt.x, height - padBottom);
            ctx.stroke();
            ctx.setLineDash([]);

            // Temperature text above node
            ctx.font = "bold 12px 'Plus Jakarta Sans', sans-serif";
            ctx.fillStyle = state.theme === "light" ? "#0f172a" : "#ffffff";
            ctx.fillText(`${pt.temp}°`, pt.x, pt.y - 10);

            // Time label below guideline
            ctx.font = "600 11px 'Plus Jakarta Sans', sans-serif";
            ctx.fillStyle = "#94a3b8";
            ctx.fillText(pt.timeLabel, pt.x, height - 12);

            // Glowing Outer Ring & Center Dot
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = "#38bdf8";
            ctx.fill();
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
        });

        // 4. Populate tactile pills strip
        if (chartHourlyPills) {
            chartHourlyPills.innerHTML = "";
            points.forEach((pt, idx) => {
                const iconClass = getConditionIconClass(pt.desc);
                const pill = document.createElement("div");
                pill.className = `chart-hour-pill ${idx === 0 ? "active" : ""}`;
                pill.innerHTML = `
                    <span class="ch-time">${pt.timeLabel}</span>
                    <i class="bi ${iconClass} ch-icon"></i>
                    <strong class="ch-temp">${pt.temp}°</strong>
                `;
                pill.addEventListener("click", () => {
                    document.querySelectorAll(".chart-hour-pill").forEach((el) => el.classList.remove("active"));
                    pill.classList.add("active");
                });
                chartHourlyPills.appendChild(pill);
            });
        }
    }

    // -------------------------------------------------------------------------
    // 11. Solar Arc Sun Position Visualizer
    // -------------------------------------------------------------------------
    function renderSolarArc(sunriseUnix, sunsetUnix, dtUnix, timezoneOffset) {
        if (!solarSunDot || !solarSunriseVal || !solarSunsetVal) return;

        if (!sunriseUnix || !sunsetUnix) {
            solarSunriseVal.textContent = "06:00 AM";
            solarSunsetVal.textContent = "06:00 PM";
            if (daylightDurationText) daylightDurationText.textContent = "12 hrs daylight";
            return;
        }

        // Format Sunrise & Sunset in location's local time
        const formatLocalTime = (unixSec) => {
            const date = new Date((unixSec + timezoneOffset) * 1000);
            return date.toLocaleTimeString("en-US", {
                timeZone: "UTC",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            });
        };

        solarSunriseVal.textContent = formatLocalTime(sunriseUnix);
        solarSunsetVal.textContent = formatLocalTime(sunsetUnix);

        // Calculate total daylight hours
        const daylightSec = Math.max(0, sunsetUnix - sunriseUnix);
        const daylightHours = (daylightSec / 3600).toFixed(1);
        if (daylightDurationText) {
            daylightDurationText.textContent = `${daylightHours} hrs daylight`;
        }

        // Current progress ratio between sunrise (0) and sunset (1)
        const currentSec = dtUnix || Math.floor(Date.now() / 1000);
        let ratio = (currentSec - sunriseUnix) / daylightSec;
        ratio = Math.max(0, Math.min(1, ratio));

        // SVG Arc parameters: path is "M 30,110 A 120,95 0 0,1 270,110"
        // Center of ellipse is x=150, y=110, rx=120, ry=95
        const angle = Math.PI - ratio * Math.PI; // from PI (left) down to 0 (right)
        const sunX = 150 + 120 * Math.cos(angle);
        const sunY = 110 - 95 * Math.sin(angle);

        solarSunDot.setAttribute("cx", sunX.toFixed(1));
        solarSunDot.setAttribute("cy", sunY.toFixed(1));

        // Update progress curve
        if (solarArcProgress) {
            if (ratio <= 0.02) {
                solarArcProgress.setAttribute("d", "M 30,110");
            } else {
                solarArcProgress.setAttribute("d", `M 30,110 A 120,95 0 0,1 ${sunX.toFixed(1)},${sunY.toFixed(1)}`);
            }
        }
    }

    // -------------------------------------------------------------------------
    // 12. Air Quality Index (AQI) Meter & Health Advice
    // -------------------------------------------------------------------------
    function renderAirQuality(aqiObj) {
        if (!aqiBadge || !aqiMeterFill) return;

        const aqiMap = {
            1: { label: "Good", advice: "Air quality is ideal for outdoor activities and exercise.", class: "aqi-good", width: "20%" },
            2: { label: "Fair", advice: "Air quality is acceptable for most individuals.", class: "aqi-fair", width: "40%" },
            3: { label: "Moderate", advice: "Sensitive people should limit prolonged outdoor exertion.", class: "aqi-moderate", width: "60%" },
            4: { label: "Poor", advice: "Everyone may begin to feel health effects; wear an outdoor mask.", class: "aqi-poor", width: "80%" },
            5: { label: "Very Poor", advice: "Health emergency: harmful smog. Avoid outdoor activities.", class: "aqi-very-poor", width: "100%" }
        };

        const aqiIndex = aqiObj?.index || 1;
        const config = aqiMap[aqiIndex] || aqiMap[1];

        aqiBadge.textContent = config.label;
        aqiBadge.className = `aqi-badge ${config.class}`;
        aqiMeterFill.style.width = config.width;

        if (aqiAdvice) aqiAdvice.textContent = config.advice;

        const comps = aqiObj?.components || {};
        if (pollutantPm25) pollutantPm25.textContent = comps.pm2_5 !== undefined ? comps.pm2_5.toFixed(1) : "12.4";
        if (pollutantPm10) pollutantPm10.textContent = comps.pm10 !== undefined ? comps.pm10.toFixed(1) : "28.1";
        if (pollutantO3) pollutantO3.textContent = comps.o3 !== undefined ? comps.o3.toFixed(1) : "42.0";
        if (pollutantNo2) pollutantNo2.textContent = comps.no2 !== undefined ? comps.no2.toFixed(1) : "14.6";
    }

    // -------------------------------------------------------------------------
    // 13. Wind Direction 360° Animated Compass
    // -------------------------------------------------------------------------
    function renderWindCompass(speed, deg, gust) {
        if (!compassNeedle) return;

        const angle = deg !== undefined && deg !== null ? deg : 0;
        compassNeedle.style.transform = `rotate(${angle}deg)`;

        // 16-point cardinal directions
        const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
        const dirIndex = Math.round(angle / 22.5) % 16;
        const cardinal = directions[dirIndex];

        if (compassDegreesText) compassDegreesText.textContent = `${angle}° ${cardinal}`;
        if (compassCardinalDir) compassCardinalDir.textContent = `${cardinal} (${angle}°)`;
        if (compassSpeedVal) compassSpeedVal.textContent = `${speed !== undefined ? speed : 0} m/s`;
        if (compassGustVal) compassGustVal.textContent = gust ? `${gust} m/s` : "None";
    }

    // -------------------------------------------------------------------------
    // 14. Render Current Weather Hero & 5 Colorful Metrics
    // -------------------------------------------------------------------------
    function renderCurrentWeather(data) {
        state.currentWeather = data;
        if (data.coord) {
            state.activeCoords = { lat: data.coord.lat, lon: data.coord.lon };
        }

        // City & Country
        if (heroCityName) heroCityName.textContent = data.city || "Selected City";
        if (heroCountryCode) heroCountryCode.textContent = data.country || "IN";

        // Sub location
        if (heroStateName) {
            heroStateName.textContent = `${data.city}, ${data.country || "India"}`;
        }

        // Formatted timestamp
        if (heroDatetime) {
            const now = new Date();
            const dateStr = now.toLocaleDateString("en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            });
            const timeStr = now.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            });
            heroDatetime.innerHTML = `${dateStr}<br>${timeStr}`;
        }

        // Hero Temperature with smooth counter animation
        if (heroTempValue) {
            animateNumber(heroTempValue, toDisplayTemp(data.temperature), 500, state.unit === "F" ? 0 : 1);
        }

        // Condition Text
        if (heroConditionText) {
            heroConditionText.textContent = data.description || "Clear Sky";
        }

        // Feels like
        if (heroFeelsValue) {
            heroFeelsValue.textContent = toDisplayTemp(data.feels_like);
        }

        // High / Low temperatures
        if (heroHighVal) {
            heroHighVal.textContent = `${Math.round(toDisplayTemp(data.temp_max !== undefined ? data.temp_max : data.temperature))}°`;
        }
        if (heroLowVal) {
            heroLowVal.textContent = `${Math.round(toDisplayTemp(data.temp_min !== undefined ? data.temp_min : data.temperature))}°`;
        }

        // Update Quick Favorite Button status
        updateQuickFavoriteButton();

        // 5 COLORFUL STAT CARDS
        if (metricFeelsLike) {
            metricFeelsLike.textContent = toDisplayTemp(data.feels_like);
        }
        if (metricHumidity) {
            metricHumidity.textContent = data.humidity ?? "--";
        }
        if (metricWindSpeed) {
            metricWindSpeed.textContent = data.wind_speed ?? "--";
        }
        if (metricPressure) {
            metricPressure.textContent = data.pressure ?? "--";
        }
        if (metricVisibility) {
            metricVisibility.textContent =
                data.visibility_km !== null && data.visibility_km !== undefined
                    ? Math.round(Number(data.visibility_km))
                    : "--";
        }

        // Start Live Canvas Particle Animation
        const isNight = data.icon?.includes("n") || false;
        initWeatherCanvas(data.weather_main, isNight);

        // Render Solar Arc
        renderSolarArc(data.sunrise, data.sunset, data.dt, data.timezone_offset || 0);

        // Render Air Quality
        renderAirQuality(data.aqi);

        // Render Wind Compass
        renderWindCompass(data.wind_speed, data.wind_deg, data.wind_gust);
    }

    // -------------------------------------------------------------------------
    // 15. Render 5-Day Extended Forecast & Detailed Modal
    // -------------------------------------------------------------------------
    function getConditionIconClass(mainDesc) {
        const desc = (mainDesc || "").toLowerCase();
        if (desc.includes("thunder")) return "bi-cloud-lightning-rain-fill rain-color";
        if (desc.includes("drizzle") || desc.includes("light rain")) return "bi-cloud-drizzle-fill rain-color";
        if (desc.includes("rain")) return "bi-cloud-rain-heavy-fill rain-color";
        if (desc.includes("snow")) return "bi-cloud-snow-fill cloud-color";
        if (desc.includes("clear")) return "bi-sun-fill sun-color";
        if (desc.includes("few") || desc.includes("scattered") || desc.includes("partly")) return "bi-cloud-sun-fill sun-cloud-color";
        return "bi-cloud-fill cloud-color";
    }

    function renderForecasts(forecasts) {
        state.forecastList = forecasts;

        // Group by calendar day
        const daysMap = new Map();
        forecasts.forEach((entry) => {
            const dateObj = new Date(entry.dt * 1000);
            const dateKey = `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}-${dateObj.getDate()}`;

            if (!daysMap.has(dateKey)) {
                daysMap.set(dateKey, {
                    dateObj,
                    entries: [],
                    minTemp: Infinity,
                    maxTemp: -Infinity,
                    maxPop: 0
                });
            }

            const dayObj = daysMap.get(dateKey);
            dayObj.entries.push(entry);

            const tMin = entry.temp_min !== undefined ? entry.temp_min : entry.temperature;
            const tMax = entry.temp_max !== undefined ? entry.temp_max : entry.temperature;

            if (tMin < dayObj.minTemp) dayObj.minTemp = tMin;
            if (tMax > dayObj.maxTemp) dayObj.maxTemp = tMax;
            if (entry.precipitation_probability > dayObj.maxPop) {
                dayObj.maxPop = entry.precipitation_probability;
            }
        });

        const dayList = Array.from(daysMap.values()).slice(0, 5);
        if (!forecastCardsContainer || dayList.length === 0) return;

        forecastCardsContainer.innerHTML = "";

        dayList.forEach((day, idx) => {
            const mid = day.entries[Math.floor(day.entries.length / 2)] || day.entries[0];
            const weekday = idx === 0 ? "Today" : day.dateObj.toLocaleDateString("en-US", { weekday: "short" });
            const dateLabel = day.dateObj.toLocaleDateString("en-US", { day: "numeric", month: "short" });

            const highTemp = Math.round(toDisplayTemp(day.maxTemp));
            const lowTemp = Math.round(toDisplayTemp(day.minTemp));
            const popPercent = Math.round((day.maxPop || 0) * 100);
            const iconClass = getConditionIconClass(mid.description);

            const card = document.createElement("article");
            card.className = `forecast-card ${idx === 0 ? "active" : ""}`;
            card.innerHTML = `
                <span class="fc-day">${weekday}</span>
                <span class="fc-date">${dateLabel}</span>
                <i class="bi ${iconClass} fc-icon" aria-hidden="true"></i>
                <div class="fc-temps">
                    <span class="temp-high">${highTemp}°</span>
                    <span class="temp-sep">/</span>
                    <span class="temp-low">${lowTemp}°</span>
                </div>
                <span class="fc-desc">${mid.description || "Clear Sky"}</span>
                <span class="fc-pop"><i class="bi bi-droplet-fill" aria-hidden="true"></i> ${popPercent}%</span>
            `;

            card.addEventListener("click", () => {
                document.querySelectorAll(".forecast-card").forEach((c) => c.classList.remove("active"));
                card.classList.add("active");
            });

            forecastCardsContainer.appendChild(card);
        });

        // Populate detailed forecast modal strip
        if (detailedHourlyStrip) {
            detailedHourlyStrip.innerHTML = "";
            forecasts.slice(0, 12).forEach((chunk) => {
                const chunkDate = new Date(chunk.dt * 1000);
                const timeStr = chunkDate.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
                const iconClass = getConditionIconClass(chunk.description);
                const temp = Math.round(toDisplayTemp(chunk.temperature));
                const rain = Math.round((chunk.precipitation_probability || 0) * 100);

                const item = document.createElement("div");
                item.className = "detailed-hourly-card";
                item.innerHTML = `
                    <span style="font-weight: 700; color: #94a3b8; font-size: 12px;">${timeStr}</span>
                    <i class="bi ${iconClass}" style="font-size: 24px; margin: 4px 0;"></i>
                    <strong style="font-size: 14px;">${temp}°${state.unit}</strong>
                    <span style="font-size: 11px; color: #38bdf8;"><i class="bi bi-droplet-fill"></i> ${rain}%</span>
                    <span style="font-size: 10px; color: #64748b; margin-top: 2px;">${chunk.description || ""}</span>
                `;
                detailedHourlyStrip.appendChild(item);
            });
        }
    }

    btnViewDetailedForecast?.addEventListener("click", () => {
        detailedForecastModal?.classList.add("show");
    });
    closeDetailedModal?.addEventListener("click", () => {
        detailedForecastModal?.classList.remove("show");
    });

    // -------------------------------------------------------------------------
    // 16. Interactive Leaflet Radar Map Modal
    // -------------------------------------------------------------------------
    function initOrUpdateMap(lat, lon, cityName, country) {
        if (!window.L) return;

        if (mapModalCitySubtitle) {
            mapModalCitySubtitle.textContent = `${cityName}, ${country || "Global"}`;
        }

        if (!state.leafletMap) {
            // Create map centered on location
            state.leafletMap = L.map("interactive-weather-map", {
                center: [lat, lon],
                zoom: 10,
                zoomControl: true
            });

            // Base CartoDB Dark/Light Tile Layer
            L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 18
            }).addTo(state.leafletMap);

            // Add RainViewer live radar layer
            fetch("https://api.rainviewer.com/public/weather-maps.json")
                .then((r) => r.json())
                .then((radarMeta) => {
                    if (radarMeta?.radar?.past?.length > 0) {
                        const latest = radarMeta.radar.past[radarMeta.radar.past.length - 1];
                        state.radarLayer = L.tileLayer(`https://tilecache.rainviewer.com${latest.path}/256/{z}/{x}/{y}/2/1_1.png`, {
                            opacity: 0.65,
                            zIndex: 10
                        });
                        if (state.radarActive && state.leafletMap) {
                            state.radarLayer.addTo(state.leafletMap);
                        }
                    }
                })
                .catch(() => {});
        } else {
            state.leafletMap.setView([lat, lon], 10);
        }

        // Custom marker
        if (state.mapMarker) {
            state.leafletMap.removeLayer(state.mapMarker);
        }

        const pulseIcon = L.divIcon({
            className: "map-pulse-marker-wrapper",
            html: '<div class="map-pulse-marker"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        const tempStr = state.currentWeather ? `${toDisplayTemp(state.currentWeather.temperature)}°${state.unit}` : "";
        state.mapMarker = L.marker([lat, lon], { icon: pulseIcon })
            .addTo(state.leafletMap)
            .bindPopup(`<strong>${cityName}</strong><br>${tempStr}`)
            .openPopup();

        setTimeout(() => {
            state.leafletMap?.invalidateSize();
        }, 250);
    }

    btnToggleRadar?.addEventListener("click", () => {
        state.radarActive = !state.radarActive;
        btnToggleRadar.classList.toggle("active", state.radarActive);
        if (state.radarLayer && state.leafletMap) {
            if (state.radarActive) {
                state.radarLayer.addTo(state.leafletMap);
            } else {
                state.leafletMap.removeLayer(state.radarLayer);
            }
        }
    });

    btnViewOnMap?.addEventListener("click", () => {
        weatherMapModal?.classList.add("show");
        initOrUpdateMap(state.activeCoords.lat, state.activeCoords.lon, state.activeCity, state.activeCountry);
    });

    closeMapModal?.addEventListener("click", () => {
        weatherMapModal?.classList.remove("show");
    });

    // -------------------------------------------------------------------------
    // 17. Unified Weather Fetching (By Name or Coordinates)
    // -------------------------------------------------------------------------
    async function loadWeatherData(city, country, lat, lon) {
        if (!city && (!lat || !lon)) return;
        if (state.isSearching) return;
        state.isSearching = true;

        if (searchButton) {
            searchButton.disabled = true;
            searchButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Searching';
        }

        try {
            const params = new URLSearchParams();
            if (city) params.append("city", city.trim());
            if (country) params.append("country", country.trim());
            if (lat && lon) {
                params.append("lat", lat);
                params.append("lon", lon);
            }

            const [currentData, forecastData] = await Promise.all([
                apiRequest(`/api/weather/current?${params.toString()}`),
                apiRequest(`/api/weather/forecast?${params.toString()}`)
            ]);

            state.activeCity = currentData.city;
            state.activeCountry = currentData.country;

            if (cityInput) cityInput.value = currentData.city;
            if (countryInput) countryInput.value = currentData.country || "IN";

            renderCurrentWeather(currentData);
            renderForecasts(forecastData.forecasts || []);
            renderHourlyChart(forecastData.forecasts || []);

            addRecentSearch(currentData.city);

            showNotification(`Updated live weather for ${currentData.city}.`, "success", 2500);
        } catch (err) {
            console.error("Search error:", err);
            showNotification(err.message, "error", 5000);
        } finally {
            state.isSearching = false;
            if (searchButton) {
                searchButton.disabled = false;
                searchButton.innerHTML = '<i class="bi bi-search" aria-hidden="true"></i> <span>Search</span>';
            }
        }
    }

    searchForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        loadWeatherData(cityInput?.value, countryInput?.value);
    });

    // Geolocation Handler
    geoLocationBtn?.addEventListener("click", () => {
        if (!navigator.geolocation) {
            showNotification("Geolocation is not supported by your browser.", "error");
            return;
        }

        showNotification("Detecting your location...", "info", 2000);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                loadWeatherData("", "", lat, lon);
            },
            (error) => {
                showNotification("Could not access location. Please check browser permissions.", "error");
            },
            { timeout: 10000 }
        );
    });

    // -------------------------------------------------------------------------
    // 18. Quick Favorite Toggle on Hero Card
    // -------------------------------------------------------------------------
    function updateQuickFavoriteButton() {
        if (!btnQuickFavorite || !quickFavIcon) return;
        const isFav = state.favoritesList.some(
            (f) => f.city.toLowerCase() === state.activeCity.toLowerCase()
        );

        if (isFav) {
            btnQuickFavorite.classList.add("favorited");
            quickFavIcon.className = "bi bi-heart-fill";
            btnQuickFavorite.querySelector("span").textContent = "Favorited";
        } else {
            btnQuickFavorite.classList.remove("favorited");
            quickFavIcon.className = "bi bi-heart";
            btnQuickFavorite.querySelector("span").textContent = "Favourite";
        }
    }

    btnQuickFavorite?.addEventListener("click", async () => {
        const city = state.activeCity;
        const country = state.activeCountry || "IN";
        const existing = state.favoritesList.find(
            (f) => f.city.toLowerCase() === city.toLowerCase()
        );

        if (existing) {
            // Already a favorite, ask or remove
            state.pendingDeleteId = existing.id;
            if (deleteFavCityName) deleteFavCityName.textContent = city;
            deleteFavoriteModal?.classList.add("show");
        } else {
            // Add as favorite
            try {
                await apiRequest("/api/favorites", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ city, country, nickname: null })
                });
                showNotification(`Added ${city} to favourites!`, "success");
                await loadFavorites();
            } catch (err) {
                showNotification(err.message, "error");
            }
        }
    });

    // -------------------------------------------------------------------------
    // 19. Favourite Cities (MySQL REST API Integration)
    // -------------------------------------------------------------------------
    async function loadFavorites() {
        if (!favoritesListContainer) return;

        try {
            const res = await apiRequest("/api/favorites");
            state.favoritesList = res.favorites || [];
            updateQuickFavoriteButton();

            if (state.favoritesList.length === 0) {
                favoritesListContainer.innerHTML = `
                    <div style="text-align: center; padding: 24px; color: #64748b;">
                        <i class="bi bi-heart" style="font-size: 28px; display: block; margin-bottom: 6px;"></i>
                        <p>No favourite cities saved yet.</p>
                        <small>Click "+ Add City" to save your favourites.</small>
                    </div>
                `;
                return;
            }

            favoritesListContainer.innerHTML = "";

            state.favoritesList.forEach((fav) => {
                const row = document.createElement("div");
                row.className = "favourite-row";

                const nicknameTag = fav.nickname ? ` | ${fav.nickname}` : "";

                row.innerHTML = `
                    <div class="fav-left" title="View weather for ${fav.city}">
                        <div class="fav-weather-circle">
                            <i class="bi bi-sun-fill" aria-hidden="true"></i>
                        </div>
                        <div class="fav-names-block">
                            <span class="fav-city-title">${fav.city}</span>
                            <span class="fav-country-sub">${fav.country}${nicknameTag}</span>
                        </div>
                    </div>
                    <div class="fav-center-weather">
                        <i class="bi bi-cloud-sun-fill" aria-hidden="true"></i>
                        <div>
                            <span class="fav-temp-text" id="fav-temp-${fav.id}">--°${state.unit}</span>
                            <div class="fav-cond-text" id="fav-cond-${fav.id}">Weather</div>
                        </div>
                    </div>
                    <div class="fav-actions">
                        <button type="button" class="btn-fav-edit" data-edit-id="${fav.id}" title="Edit nickname">
                            <i class="bi bi-pencil-fill" aria-hidden="true"></i>
                        </button>
                        <button type="button" class="btn-fav-delete" data-del-id="${fav.id}" title="Delete favourite">
                            <i class="bi bi-trash-fill" aria-hidden="true"></i>
                        </button>
                    </div>
                `;

                // Quick view click
                row.querySelector(".fav-left")?.addEventListener("click", () => {
                    if (cityInput) cityInput.value = fav.city;
                    if (countryInput) countryInput.value = fav.country;
                    loadWeatherData(fav.city, fav.country);
                    document.getElementById("home")?.scrollIntoView({ behavior: "smooth" });
                });

                // Edit click
                row.querySelector("[data-edit-id]")?.addEventListener("click", () => {
                    if (editFavId) editFavId.value = fav.id;
                    if (editFavCity) editFavCity.value = fav.city;
                    if (editFavCountry) editFavCountry.value = fav.country;
                    if (editFavNickname) editFavNickname.value = fav.nickname || "";
                    editFavoriteModal?.classList.add("show");
                });

                // Delete click
                row.querySelector("[data-del-id]")?.addEventListener("click", () => {
                    state.pendingDeleteId = fav.id;
                    if (deleteFavCityName) deleteFavCityName.textContent = fav.city;
                    deleteFavoriteModal?.classList.add("show");
                });

                favoritesListContainer.appendChild(row);

                // Fetch real temperature asynchronously for each favorite
                apiRequest(`/api/weather/current?city=${encodeURIComponent(fav.city)}&country=${encodeURIComponent(fav.country)}`)
                    .then((weather) => {
                        const tempEl = document.getElementById(`fav-temp-${fav.id}`);
                        const condEl = document.getElementById(`fav-cond-${fav.id}`);
                        if (tempEl) tempEl.textContent = `${toDisplayTemp(weather.temperature)}°${state.unit}`;
                        if (condEl) condEl.textContent = weather.description || "Clear Sky";
                    })
                    .catch(() => {});
            });
        } catch (err) {
            console.error("Favorites error:", err);
            favoritesListContainer.innerHTML = `
                <div style="text-align: center; padding: 16px; color: #ff7675;">
                    <p>Unable to load favourite cities from database.</p>
                </div>
            `;
        }
    }

    // Add Modal Handlers
    btnAddFavorite?.addEventListener("click", () => {
        if (favCityInput && cityInput) favCityInput.value = cityInput.value;
        if (favCountryInput && countryInput) favCountryInput.value = countryInput.value;
        if (favNicknameInput) favNicknameInput.value = "";
        addFavoriteModal?.classList.add("show");
    });
    closeAddModal?.addEventListener("click", () => addFavoriteModal?.classList.remove("show"));
    cancelAddModal?.addEventListener("click", () => addFavoriteModal?.classList.remove("show"));

    addFavoriteForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const city = favCityInput?.value.trim();
        const country = favCountryInput?.value.trim().toUpperCase();
        const nickname = favNicknameInput?.value.trim();

        if (!city || !country) {
            showNotification("City and 2-letter country code are required.", "error");
            return;
        }

        try {
            await apiRequest("/api/favorites", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ city, country, nickname: nickname || null })
            });

            addFavoriteModal?.classList.remove("show");
            showNotification(`${city} added to favourites!`, "success");
            await loadFavorites();
        } catch (err) {
            showNotification(err.message, "error");
        }
    });

    // Edit Modal Handlers
    closeEditModal?.addEventListener("click", () => editFavoriteModal?.classList.remove("show"));
    cancelEditModal?.addEventListener("click", () => editFavoriteModal?.classList.remove("show"));

    editFavoriteForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = editFavId?.value;
        const nickname = editFavNickname?.value.trim();

        try {
            await apiRequest(`/api/favorites/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname: nickname || null })
            });

            editFavoriteModal?.classList.remove("show");
            showNotification("Nickname updated successfully.", "success");
            await loadFavorites();
        } catch (err) {
            showNotification(err.message, "error");
        }
    });

    // Delete Modal Handlers
    closeDeleteModal?.addEventListener("click", () => deleteFavoriteModal?.classList.remove("show"));
    cancelDeleteModal?.addEventListener("click", () => deleteFavoriteModal?.classList.remove("show"));

    confirmDeleteModal?.addEventListener("click", async () => {
        if (!state.pendingDeleteId) return;

        try {
            await apiRequest(`/api/favorites/${state.pendingDeleteId}`, {
                method: "DELETE"
            });

            deleteFavoriteModal?.classList.remove("show");
            showNotification("Favourite removed from database.", "success");
            state.pendingDeleteId = null;
            await loadFavorites();
        } catch (err) {
            showNotification(err.message, "error");
        }
    });

    // View All Favourites button
    document.getElementById("btn-view-all-favorites")?.addEventListener("click", () => {
        document.getElementById("favorites")?.scrollIntoView({ behavior: "smooth" });
    });

    // -------------------------------------------------------------------------
    // 20. Weather Around the World
    // -------------------------------------------------------------------------
    document.querySelectorAll(".world-city-row").forEach((row) => {
        row.addEventListener("click", () => {
            const city = row.dataset.city;
            const country = row.dataset.country;
            if (city) {
                if (cityInput) cityInput.value = city;
                if (countryInput) countryInput.value = country || "";
                loadWeatherData(city, country);
                document.getElementById("home")?.scrollIntoView({ behavior: "smooth" });
            }
        });
    });

    // -------------------------------------------------------------------------
    // 21. Mobile Drawer Navigation
    // -------------------------------------------------------------------------
    sidebarToggle?.addEventListener("click", () => {
        sidebar?.classList.toggle("open");
    });

    document.querySelectorAll(".sidebar-nav .nav-link").forEach((link) => {
        link.addEventListener("click", () => {
            document.querySelectorAll(".sidebar-nav .nav-link").forEach((l) => l.classList.remove("active"));
            link.classList.add("active");
            sidebar?.classList.remove("open");
        });
    });

    // -------------------------------------------------------------------------
    // 22. Initial Data Load
    // -------------------------------------------------------------------------
    loadFavorites();
    loadWeatherData(cityInput?.value || "Vijayawada", countryInput?.value || "IN");
});
