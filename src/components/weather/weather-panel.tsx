import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Sun,
  Wind,
} from "lucide-react";

import { weatherLabel, type CurrentWeather, type DailyForecast } from "@/lib/weather";

/** WMO weather code → the matching Lucide icon, rendered directly. */
function WeatherIcon({ code, className }: { code: number; className?: string }) {
  if (code === 0) return <Sun className={className} />;
  if (code <= 2) return <CloudSun className={className} />;
  if (code === 3) return <Cloud className={className} />;
  if (code <= 48) return <CloudFog className={className} />;
  if (code <= 57) return <CloudDrizzle className={className} />;
  if (code <= 67) return <CloudRain className={className} />;
  if (code <= 77) return <CloudSnow className={className} />;
  if (code <= 82) return <CloudRain className={className} />;
  if (code <= 86) return <CloudSnow className={className} />;
  return <CloudLightning className={className} />;
}

/** Event-day forecast — icon, high/low, condition, and rain chance. */
export function EventWeatherPanel({ forecast }: { forecast: DailyForecast }) {
  return (
    <div className="rounded-xl border border-border bg-canvas p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sunset">
        <WeatherIcon code={forecast.code} className="h-4 w-4" /> Ride-day forecast
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="font-display text-2xl text-ink">{forecast.highF}°</p>
        <p className="text-sm text-muted">/ {forecast.lowF}°</p>
        <p className="text-sm font-medium text-ink">{weatherLabel(forecast.code)}</p>
      </div>
      <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
        <Droplets className="h-3 w-3 text-sunset" />
        {forecast.precipChance}% chance of precip
      </p>
    </div>
  );
}

/** Current conditions at a road's location. */
export function RoadWeatherPanel({ current }: { current: CurrentWeather }) {
  return (
    <div className="rounded-lg border border-border bg-canvas p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sunset">
        <WeatherIcon code={current.code} className="h-3.5 w-3.5" /> Conditions now
      </div>
      <p className="mt-1.5 text-sm font-medium text-ink">
        {current.tempF}° · {weatherLabel(current.code)}
      </p>
      <p className="inline-flex items-center gap-1 text-xs text-muted">
        <Wind className="h-3 w-3 text-sunset" />
        {current.windMph} mph wind
      </p>
    </div>
  );
}
