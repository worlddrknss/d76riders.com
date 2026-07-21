import "server-only";

// Weather via Open-Meteo — free, no API key, forecast up to ~16 days out.
// Best-effort: every call returns null on any failure so a weather hiccup never
// breaks a page. Responses are cached for an hour.

const BASE = "https://api.open-meteo.com/v1/forecast";
const FORECAST_HORIZON_DAYS = 15;

export type DailyForecast = { highF: number; lowF: number; precipChance: number; code: number };
export type CurrentWeather = { tempF: number; code: number; windMph: number };

/** Human label for a WMO weather code. */
export function weatherLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorm";
}

/** True when `date` (YYYY-MM-DD, local) is close enough for a real forecast. */
export function withinForecastWindow(date: string, now = new Date()): boolean {
  const target = new Date(`${date}T12:00:00Z`).getTime();
  const today = new Date(`${now.toISOString().slice(0, 10)}T12:00:00Z`).getTime();
  const days = (target - today) / 86_400_000;
  return days >= 0 && days <= FORECAST_HORIZON_DAYS;
}

/** Daily forecast for a specific local date at a point (e.g. an event's date). */
export async function getDailyForecast(
  lat: number,
  lng: number,
  date: string,
): Promise<DailyForecast | null> {
  try {
    const url =
      `${BASE}?latitude=${lat}&longitude=${lng}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code` +
      `&temperature_unit=fahrenheit&timezone=auto&start_date=${date}&end_date=${date}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    const d = data?.daily;
    if (!d?.weather_code?.length) return null;
    return {
      highF: Math.round(d.temperature_2m_max[0]),
      lowF: Math.round(d.temperature_2m_min[0]),
      precipChance: Math.round(d.precipitation_probability_max?.[0] ?? 0),
      code: d.weather_code[0],
    };
  } catch {
    return null;
  }
}

/** Current conditions at a point (e.g. a road's location). */
export async function getCurrentWeather(lat: number, lng: number): Promise<CurrentWeather | null> {
  try {
    const url =
      `${BASE}?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,weather_code,wind_speed_10m` +
      `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    const c = data?.current;
    if (c?.weather_code == null) return null;
    return {
      tempF: Math.round(c.temperature_2m),
      code: c.weather_code,
      windMph: Math.round(c.wind_speed_10m),
    };
  } catch {
    return null;
  }
}
