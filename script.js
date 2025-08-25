// --- Seletores (mantém seu HTML/CSS) ---
const card = document.querySelector("body > div");
const input = card.querySelector('input[type="text"]');
const button = card.querySelector("button");
const resultBox = card.querySelector("div"); // o bloco interno

// ===== Placeholder inicial =====
function renderEmpty() {
  resultBox.innerHTML = `
    <div style="display:flex; align-items:center; gap:14px;">
      <!-- Ícone SVG leve (sem classes) -->
      <svg width="42" height="42" viewBox="0 0 24 24" fill="none" aria-hidden="true"
           style="flex:0 0 42px; filter: drop-shadow(0 2px 6px rgba(0,0,0,.25));">
        <path d="M21 21l-4.2-4.2" stroke="rgba(255,255,255,.9)" stroke-width="1.6" stroke-linecap="round"/>
        <circle cx="11" cy="11" r="6.5" stroke="rgba(255,255,255,.8)" stroke-width="1.6"/>
        <path d="M8 11a3 3 0 0 1 5.3-1.9" stroke="rgba(122,240,212,.9)" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
      <div>
        <h2>Busque uma cidade</h2>
        <p style="color:#c5d0db; margin-top:4px;">
          Digite no campo acima e pressione <strong>Enter</strong> ou clique em <strong>Buscar</strong>.
        </p>
      </div>
    </div>
  `;
}

// ===== Mapa WMO -> PT-BR =====
const WMO = {
  0: "Céu limpo",
  1: "Poucas nuvens",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Nevoeiro",
  48: "Nevoeiro com geada",
  51: "Garoa fraca",
  53: "Garoa moderada",
  55: "Garoa intensa",
  56: "Garoa congelante fraca",
  57: "Garoa congelante forte",
  61: "Chuva fraca",
  63: "Chuva moderada",
  65: "Chuva forte",
  66: "Chuva congelante fraca",
  67: "Chuva congelante forte",
  71: "Neve fraca",
  73: "Neve moderada",
  75: "Neve intensa",
  77: "Cristais de gelo",
  80: "Aguaceiros fracos",
  81: "Aguaceiros moderados",
  82: "Aguaceiros fortes",
  85: "Aguaceiros de neve fracos",
  86: "Aguaceiros de neve fortes",
  95: "Trovoada",
  96: "Trovoada com granizo leve",
  99: "Trovoada com granizo forte",
};
const ICON = (c) => {
  if ([0].includes(c)) return "☀️";
  if ([1, 2].includes(c)) return "🌤️";
  if ([3].includes(c)) return "☁️";
  if ([45, 48].includes(c)) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(c)) return "🌦️";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(c)) return "🌧️";
  if ([71, 73, 75, 85, 86].includes(c)) return "❄️";
  if ([95, 96, 99].includes(c)) return "⛈️";
  return "🌍";
};

// Loading/erro
function setLoading(v) {
  button.disabled = v;
  button.textContent = v ? "Buscando…" : "Buscar";
  resultBox.style.opacity = v ? 0.7 : 1;
}
function renderError(msg) {
  resultBox.innerHTML = `
    <h2>Não encontrado</h2>
    <p>—</p>
    <p>${msg}</p>
    <p>—</p>
  `;
}

// Geocoding
async function geocode(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    city
  )}&count=1&language=pt&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Falha no geocoding");
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  const r = data.results[0];
  return {
    name: r.name,
    country: r.country,
    admin1: r.admin1,
    lat: r.latitude,
    lon: r.longitude,
  };
}

// Clima atual
async function getCurrentWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Falha ao obter clima");
  const data = await res.json();
  return {
    temp: data.current?.temperature_2m,
    feels: data.current?.apparent_temperature,
    humidity: data.current?.relative_humidity_2m,
    code: data.current?.weather_code,
    timeISO: data.current?.time,
  };
}
const timeFmt = (iso) =>
  iso
    ? new Date(iso).toLocaleString([], { hour: "2-digit", minute: "2-digit" })
    : "";

// Render do resultado (substitui o conteúdo do bloco)
function render(city, weather) {
  const local =
    city.admin1 && city.country
      ? `${city.name} – ${city.admin1}, ${city.country}`
      : city.country
      ? `${city.name} – ${city.country}`
      : city.name;

  const condTxt = WMO[weather.code] ?? "Condição indisponível";
  const ico = ICON(weather.code);
  const hora = timeFmt(weather.timeISO);

  resultBox.innerHTML = `
    <h2>${ico} Tempo em ${local}</h2>
    <p>${Number(weather.temp).toFixed(1)} º C</p>
    <p>${condTxt}${hora ? ` • Atualizado às ${hora}` : ""}</p>
    <p>Umidade: ${Number(weather.humidity).toFixed(0)}%</p>
    <p style="color:#c5d0db">Sensação: ${Number(weather.feels).toFixed(
      1
    )} º C</p>
    <p style="color:#c5d0db; font-size:.9rem;">Fonte: Open‑Meteo</p>
  `;
}

// Buscar
async function searchCityWeather() {
  const cityName = (input.value || "").trim();
  if (!cityName) {
    // mantém o placeholder e dá foco
    input.focus();
    return;
  }
  try {
    setLoading(true);
    const g = await geocode(cityName);
    if (!g) {
      renderError("Cidade não encontrada.");
      return;
    }
    const w = await getCurrentWeather(g.lat, g.lon);
    render(g, w);
  } catch (e) {
    console.error(e);
    renderError("Erro ao buscar dados. Tente novamente.");
  } finally {
    setLoading(false);
  }
}

// Eventos
button.addEventListener("click", searchCityWeather);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchCityWeather();
});

// Inicial: sem cidade padrão, mostra apenas o placeholder
window.addEventListener("DOMContentLoaded", () => {
  input.value = "";
  renderEmpty();
  input.focus();
});
