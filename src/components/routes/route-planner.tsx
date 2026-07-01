"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Lock,
  LockOpen,
  Compass,
  Coffee,
  Crosshair,
  Flag,
  Fuel,
  Hand,
  MapPin,
  MousePointerClick,
  PencilLine,
  RotateCcw,
  Redo2,
  Route as RouteIcon,
  Trash2,
  Undo2,
} from "lucide-react";
import { useRouteMap } from "@/hooks/use-route-map";
import { useWaypointMarkers } from "@/hooks/use-waypoint-markers";
import { LocationSearch } from "@/components/routes/location-search";
import { KIND_META } from "@/lib/map";
import {
  fetchRoute,
  formatDistance,
  formatDuration,
  simplifyRouteGeometry,
  type PlannerWaypoint,
  type RouteResult,
  type WaypointKind,
} from "@/lib/routing";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

type PlannerMode = "waypoints" | "trace";

type TracePoint = {
  id: string;
  lng: number;
  lat: number;
  label?: string;
};

type TraceDetail = "high" | "balanced" | "light";
type TraceTool = "draw" | "anchors";
type DrawStrokeBehavior = "replace" | "append";
type TraceLockMode = "unlocked" | "auto" | "manual";

type PlannerSnapshot = {
  waypoints: PlannerWaypoint[];
  tracePoints: TracePoint[];
};

const TRACE_TOLERANCE_METERS: Record<TraceDetail, number> = {
  high: 0,
  balanced: 12,
  light: 35,
};

const TRACE_DRAW_INPUT_SIMPLIFY_METERS = 45;

function areCoordinatesClose(
  a: [number, number],
  b: [number, number],
  toleranceDegrees = 0.00012,
): boolean {
  return Math.abs(a[0] - b[0]) <= toleranceDegrees && Math.abs(a[1] - b[1]) <= toleranceDegrees;
}

const ANCHORED: WaypointKind[] = ["KSU", "FUEL", "FOOD", "REST"];

// First point is START, last is END; user-tagged kinds (KSU/Fuel/Food/Rest) stick.
function deriveKind(index: number, total: number, current: WaypointKind): WaypointKind {
  if (ANCHORED.includes(current)) {
    return current;
  }
  if (index === 0) {
    return "START";
  }
  if (index === total - 1) {
    return "END";
  }
  return "STOP";
}

function rederiveKinds(list: PlannerWaypoint[]): PlannerWaypoint[] {
  return list.map((wp, i) => ({ ...wp, kind: deriveKind(i, list.length, wp.kind) }));
}

function cloneWaypoints(list: PlannerWaypoint[]): PlannerWaypoint[] {
  return list.map((wp) => ({ ...wp }));
}

function cloneTracePoints(list: TracePoint[]): TracePoint[] {
  return list.map((point) => ({ ...point }));
}

function snapshotsEqual(a: PlannerSnapshot, b: PlannerSnapshot): boolean {
  if (a.waypoints.length !== b.waypoints.length || a.tracePoints.length !== b.tracePoints.length) {
    return false;
  }

  for (let i = 0; i < a.waypoints.length; i += 1) {
    const left = a.waypoints[i];
    const right = b.waypoints[i];
    if (
      left.id !== right.id ||
      left.lng !== right.lng ||
      left.lat !== right.lat ||
      left.kind !== right.kind ||
      left.label !== right.label
    ) {
      return false;
    }
  }

  for (let i = 0; i < a.tracePoints.length; i += 1) {
    const left = a.tracePoints[i];
    const right = b.tracePoints[i];
    if (
      left.id !== right.id ||
      left.lng !== right.lng ||
      left.lat !== right.lat ||
      left.label !== right.label
    ) {
      return false;
    }
  }

  return true;
}

export function RoutePlanner() {
  const token = process.env.NEXT_PUBLIC_MAPTILER_KEY;

  const [mode, setMode] = useState<PlannerMode>("waypoints");
  const [traceTool, setTraceTool] = useState<TraceTool>("draw");
  const [drawStrokeBehavior, setDrawStrokeBehavior] = useState<DrawStrokeBehavior>("replace");
  const [traceLockMode, setTraceLockMode] = useState<TraceLockMode>("unlocked");
  const [smartAutoLock, setSmartAutoLock] = useState(true);
  const [traceDetail, setTraceDetail] = useState<TraceDetail>("high");
  const [waypoints, setWaypoints] = useState<PlannerWaypoint[]>([]);
  const [tracePoints, setTracePoints] = useState<TracePoint[]>([]);
  const [undoStack, setUndoStack] = useState<PlannerSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<PlannerSnapshot[]>([]);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routing, setRouting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  const traceLocked = traceLockMode !== "unlocked";
  const waypointsRef = useRef(waypoints);
  const tracePointsRef = useRef(tracePoints);
  const traceLockModeRef = useRef(traceLockMode);
  const autoUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    waypointsRef.current = waypoints;
  }, [waypoints]);

  useEffect(() => {
    tracePointsRef.current = tracePoints;
  }, [tracePoints]);

  useEffect(() => {
    traceLockModeRef.current = traceLockMode;
  }, [traceLockMode]);

  useEffect(() => {
    return () => {
      if (autoUnlockTimerRef.current) {
        clearTimeout(autoUnlockTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!smartAutoLock && traceLockMode === "auto") {
      setTraceLockMode("unlocked");
    }
  }, [smartAutoLock, traceLockMode]);

  const getSnapshot = useCallback((): PlannerSnapshot => {
    return {
      waypoints: cloneWaypoints(waypointsRef.current),
      tracePoints: cloneTracePoints(tracePointsRef.current),
    };
  }, []);

  const applySnapshot = useCallback((snapshot: PlannerSnapshot) => {
    setWaypoints(cloneWaypoints(snapshot.waypoints));
    setTracePoints(cloneTracePoints(snapshot.tracePoints));
  }, []);

  const commitUpdate = useCallback(
    (produce: (current: PlannerSnapshot) => PlannerSnapshot) => {
      const current = getSnapshot();
      const next = produce(current);
      if (snapshotsEqual(current, next)) {
        return;
      }

      setUndoStack((prev) => [...prev, current]);
      setRedoStack([]);
      applySnapshot(next);
    },
    [applySnapshot, getSnapshot],
  );

  const triggerSmartLock = useCallback(() => {
    if (!smartAutoLock || traceLockModeRef.current === "manual") {
      return;
    }

    if (autoUnlockTimerRef.current) {
      clearTimeout(autoUnlockTimerRef.current);
    }

    setTraceLockMode("auto");
    autoUnlockTimerRef.current = setTimeout(() => {
      setTraceLockMode((value) => (value === "auto" ? "unlocked" : value));
      autoUnlockTimerRef.current = null;
    }, 850);
  }, [smartAutoLock]);

  const toggleManualTraceLock = useCallback(() => {
    if (autoUnlockTimerRef.current) {
      clearTimeout(autoUnlockTimerRef.current);
      autoUnlockTimerRef.current = null;
    }
    setTraceLockMode((value) => (value === "manual" ? "unlocked" : "manual"));
  }, []);

  const addWaypoint = useCallback((lng: number, lat: number) => {
    commitUpdate((current) => ({
      ...current,
      waypoints: rederiveKinds([...current.waypoints, { id: uid(), lng, lat, kind: "STOP" }]),
    }));
  }, [commitUpdate]);

  const addTracePoint = useCallback((lng: number, lat: number) => {
    commitUpdate((current) => ({
      ...current,
      tracePoints: [...current.tracePoints, { id: uid(), lng, lat }],
    }));
    triggerSmartLock();
  }, [commitUpdate, triggerSmartLock]);

  const applyTraceStroke = useCallback(
    (coordinates: [number, number][]) => {
      const reduced = simplifyRouteGeometry(coordinates, TRACE_DRAW_INPUT_SIMPLIFY_METERS);
      commitUpdate((current) => {
        if (drawStrokeBehavior === "replace" || current.tracePoints.length === 0) {
          return {
            ...current,
            tracePoints: reduced.map(([lng, lat]) => ({ id: uid(), lng, lat })),
          };
        }

        const prevCoords: [number, number][] = current.tracePoints.map((point) => [point.lng, point.lat]);
        const lastExisting = prevCoords[prevCoords.length - 1];
        const firstIncoming = reduced[0];
        const incoming = areCoordinatesClose(lastExisting, firstIncoming) ? reduced.slice(1) : reduced;
        if (incoming.length === 0) {
          return current;
        }

        return {
          ...current,
          tracePoints: [...current.tracePoints, ...incoming.map(([lng, lat]) => ({ id: uid(), lng, lat }))],
        };
      });
      triggerSmartLock();
    },
    [commitUpdate, drawStrokeBehavior, triggerSmartLock],
  );

  const handleMapClick = useCallback(
    (lng: number, lat: number) => {
      if (mode === "trace") {
        if (traceTool === "draw") {
          return;
        }
        if (traceLocked) {
          return;
        }
        addTracePoint(lng, lat);
        return;
      }
      addWaypoint(lng, lat);
    },
    [addTracePoint, addWaypoint, mode, traceLocked, traceTool],
  );

  const { containerRef, mapRef, mapReady, setRouteLine, flyTo } = useRouteMap({
    token,
    onMapClick: handleMapClick,
    traceDrawEnabled: mode === "trace" && traceTool === "draw" && !traceLocked,
    onTraceStrokeEnd: applyTraceStroke,
  });

  // Add a labeled waypoint from an address search or geolocation, and fly to it.
  const addLocation = useCallback(
    ({ lng, lat, label }: { lng: number; lat: number; label: string }) => {
      if (mode === "trace") {
        commitUpdate((current) => ({
          ...current,
          tracePoints: [...current.tracePoints, { id: uid(), lng, lat, label }],
        }));
        triggerSmartLock();
      } else {
        commitUpdate((current) => ({
          ...current,
          waypoints: rederiveKinds([...current.waypoints, { id: uid(), lng, lat, kind: "STOP", label }]),
        }));
      }
      flyTo(lng, lat);
    },
    [commitUpdate, flyTo, mode, triggerSmartLock],
  );

  const handleDragEnd = useCallback((id: string, lng: number, lat: number) => {
    commitUpdate((current) => ({
      ...current,
      waypoints: current.waypoints.map((wp) => (wp.id === id ? { ...wp, lng, lat } : wp)),
    }));
  }, [commitUpdate]);

  const handleTraceDragEnd = useCallback((id: string, lng: number, lat: number) => {
    commitUpdate((current) => ({
      ...current,
      tracePoints: current.tracePoints.map((point) =>
        point.id === id ? { ...point, lng, lat } : point,
      ),
    }));
  }, [commitUpdate]);

  const traceMarkerWaypoints = useMemo<PlannerWaypoint[]>(() => {
    return tracePoints.map((point, index, list) => ({
      id: point.id,
      lng: point.lng,
      lat: point.lat,
      label: point.label,
      kind: index === 0 ? "START" : index === list.length - 1 ? "END" : "STOP",
    }));
  }, [tracePoints]);

  useWaypointMarkers({
    mapRef,
    mapReady,
    waypoints: mode === "trace" ? [] : waypoints,
    draggable: true,
    onDragEnd: handleDragEnd,
  });

  useWaypointMarkers({
    mapRef,
    mapReady,
    waypoints: mode === "trace" ? traceMarkerWaypoints : [],
    draggable: true,
    onDragEnd: handleTraceDragEnd,
  });

  const activePoints = useMemo(() => {
    if (mode === "trace") {
      return tracePoints.map(({ lng, lat }) => ({ lng, lat }));
    }
    return waypoints.map(({ lng, lat }) => ({ lng, lat }));
  }, [mode, tracePoints, waypoints]);

  // Recompute the OSRM route whenever active planner inputs change.
  // All state updates happen inside async callbacks to avoid cascading renders.
  useEffect(() => {
    if (!mapReady) {
      return;
    }

    if (activePoints.length < 2) {
      setRoute(null);
      setError(null);
      setRouteLine([]);
      return;
    }

    const controller = new AbortController();
    Promise.resolve().then(() => setRouting(true));

    fetchRoute(activePoints, controller.signal)
      .then((result) => {
        if (!result) {
          setRoute(null);
          setError("No road route found between those points.");
          setRouteLine([]);
          return;
        }
        setError(null);
        setRoute(result);
        setRouteLine(result.coordinates);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== "AbortError") {
          setError("Routing service unavailable. Try again.");
        }
      })
      .finally(() => setRouting(false));

    return () => controller.abort();
    // setRouteLine is a stable map helper.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePoints, mapReady]);

  const setKind = useCallback((id: string, kind: WaypointKind) => {
    commitUpdate((current) => ({
      ...current,
      waypoints: current.waypoints.map((wp) => (wp.id === id ? { ...wp, kind } : wp)),
    }));
  }, [commitUpdate]);

  const removeWaypoint = useCallback((id: string) => {
    commitUpdate((current) => ({
      ...current,
      waypoints: rederiveKinds(current.waypoints.filter((wp) => wp.id !== id)),
    }));
  }, [commitUpdate]);

  const removeTracePoint = useCallback((id: string) => {
    commitUpdate((current) => ({
      ...current,
      tracePoints: current.tracePoints.filter((point) => point.id !== id),
    }));
  }, [commitUpdate]);

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) {
        return prev;
      }

      const target = prev[prev.length - 1];
      const current = getSnapshot();
      setRedoStack((redo) => [...redo, current]);
      applySnapshot(target);
      return prev.slice(0, -1);
    });
  }, [applySnapshot, getSnapshot]);

  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) {
        return prev;
      }

      const target = prev[prev.length - 1];
      const current = getSnapshot();
      setUndoStack((undoItems) => [...undoItems, current]);
      applySnapshot(target);
      return prev.slice(0, -1);
    });
  }, [applySnapshot, getSnapshot]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const commandHeld = event.metaKey || event.ctrlKey;
      if (!commandHeld) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, undo]);

  const clear = useCallback(() => {
    if (mode === "trace") {
      commitUpdate((current) => ({ ...current, tracePoints: [] }));
      return;
    }
    commitUpdate((current) => ({ ...current, waypoints: [] }));
  }, [commitUpdate, mode]);

  const activeCount = mode === "trace" ? tracePoints.length : waypoints.length;
  const activeRoute = activeCount >= 2 ? route : null;

  const displayedCoordinates = useMemo(() => {
    if (!activeRoute) {
      return [];
    }
    if (mode !== "trace") {
      return activeRoute.coordinates;
    }
    return simplifyRouteGeometry(activeRoute.coordinates, TRACE_TOLERANCE_METERS[traceDetail]);
  }, [activeRoute, mode, traceDetail]);

  useEffect(() => {
    if (!mapReady) {
      return;
    }
    setRouteLine(displayedCoordinates);
  }, [displayedCoordinates, mapReady, setRouteLine]);

  const exportJson = useMemo(() => {
    return JSON.stringify(
      {
        planningMode: mode,
        waypoints:
          mode === "waypoints"
            ? waypoints.map(({ lng, lat, kind, label }) => ({ lng, lat, kind, label }))
            : [],
        tracePoints:
          mode === "trace"
            ? tracePoints.map(({ lng, lat, label }) => ({ lng, lat, label }))
            : [],
        distanceMeters: activeRoute?.distanceMeters ?? null,
        durationSeconds: activeRoute?.durationSeconds ?? null,
        geometry:
          activeRoute && displayedCoordinates.length >= 2
            ? { type: "LineString", coordinates: displayedCoordinates }
            : null,
        geometryPoints: displayedCoordinates.length,
      },
      null,
      2,
    );
  }, [mode, waypoints, tracePoints, activeRoute, displayedCoordinates]);

  if (!token) {
    return (
      <div className="grid h-full place-items-center bg-canvas px-6">
        <div className="max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-soft">
          <MapPin className="mx-auto h-8 w-8 text-sunset" />
          <h3 className="mt-4 font-display text-lg font-bold text-asphalt">Map key needed</h3>
          <p className="mt-2 text-sm text-muted">
            Add a free MapTiler key to <code className="rounded bg-canvas px-1">.env</code> as{" "}
            <code className="rounded bg-canvas px-1">NEXT_PUBLIC_MAPTILER_KEY</code> and restart the
            dev server to load the planner.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* FULL-BLEED MAP. MapLibre forces position:relative on its container, so
          the map fills via explicit height rather than absolute positioning. */}
      <div ref={containerRef} className="h-full w-full" />

      {/* TOP-LEFT: title + search + hint */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 w-[min(20rem,calc(100vw-2rem))]">
        <div className="glass-card pointer-events-auto rounded-2xl border border-white/40 px-4 py-3 shadow-lift">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-sunset">
            Route Planner
          </p>
          <h1 className="mt-0.5 font-display text-xl font-bold leading-tight text-asphalt">
            Plan Your Ride
          </h1>
          <div className="mt-3">
            <LocationSearch token={token} onSelect={addLocation} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-white/70 p-1">
            <button
              type="button"
              onClick={() => setMode("waypoints")}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                mode === "waypoints"
                  ? "bg-asphalt text-panel-text"
                  : "bg-transparent text-asphalt hover:bg-white"
              }`}
            >
              <MapPin className="h-3.5 w-3.5" /> Waypoints
            </button>
            <button
              type="button"
              onClick={() => setMode("trace")}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                mode === "trace"
                  ? "bg-asphalt text-panel-text"
                  : "bg-transparent text-asphalt hover:bg-white"
              }`}
            >
              <PencilLine className="h-3.5 w-3.5" /> Trace
            </button>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            {mode === "trace" ? (
              <>
                {traceLocked ? (
                  <Lock className="h-3.5 w-3.5 text-sunset" />
                ) : traceTool === "draw" ? (
                  <Crosshair className="h-3.5 w-3.5 text-sunset" />
                ) : (
                  <Hand className="h-3.5 w-3.5 text-sunset" />
                )}
                {traceLocked
                  ? traceLockMode === "manual"
                    ? "Trace input is manually locked. Unlock to continue."
                    : "Smart lock active for a moment to prevent accidental input."
                  : traceTool === "draw"
                    ? "Press, drag, and release to draw your route path."
                    : "Click to trace anchor points. No waypoints required."}
              </>
            ) : (
              <>
                <MousePointerClick className="h-3.5 w-3.5 text-sunset" />
                Or click the map to drop waypoints
              </>
            )}
          </p>
        </div>
      </div>

      {/* PANEL TOGGLE (mobile + collapse) */}
      <button
        type="button"
        onClick={() => setPanelOpen((v) => !v)}
        className="absolute right-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-asphalt px-3 py-2 text-xs font-semibold text-panel-text shadow-lift transition hover:bg-asphalt/90"
      >
        <RouteIcon className="h-4 w-4" />
        {panelOpen ? "Hide route" : "Show route"}
      </button>

      {/* RIGHT OVERLAY PANEL */}
      {panelOpen && (
        <aside className="absolute inset-x-3 bottom-3 top-auto z-10 flex max-h-[60svh] flex-col gap-3 overflow-y-auto sm:inset-x-auto sm:right-4 sm:top-16 sm:bottom-4 sm:max-h-none sm:w-84">
          {/* SUMMARY */}
          <div className="glass-card rounded-2xl border border-white/40 p-4 shadow-lift">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-asphalt">
                Route Summary
              </h2>
              {routing && (
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Compass className="h-3.5 w-3.5 animate-spin" /> routing…
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/70 p-3">
                <p className="text-xs text-muted">Distance</p>
                <p className="mt-1 font-display text-xl font-bold text-asphalt">
                  {activeRoute ? formatDistance(activeRoute.distanceMeters) : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-white/70 p-3">
                <p className="text-xs text-muted">Ride time</p>
                <p className="mt-1 font-display text-xl font-bold text-asphalt">
                  {activeRoute ? formatDuration(activeRoute.durationSeconds) : "—"}
                </p>
              </div>
            </div>
            {activeCount >= 2 && error && (
              <p className="mt-3 text-xs text-red-600">{error}</p>
            )}
            {mode === "trace" && (
              <div className="mt-3 rounded-xl bg-white/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-asphalt">Shape detail</p>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {([
                    ["draw", "Draw stroke"],
                    ["anchors", "Anchor clicks"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTraceTool(value)}
                      className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${
                        traceTool === value
                          ? "bg-asphalt text-panel-text"
                          : "bg-white text-asphalt hover:bg-surface"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={toggleManualTraceLock}
                  className={`mt-2 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                    traceLocked
                      ? "border-asphalt bg-asphalt text-panel-text"
                      : "border-border bg-white text-asphalt hover:bg-surface"
                  }`}
                >
                  {traceLocked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                  {traceLockMode === "manual" ? "Manual lock on" : "Manual lock off"}
                </button>
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-[11px] text-muted">
                  <input
                    type="checkbox"
                    checked={smartAutoLock}
                    onChange={(e) => setSmartAutoLock(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border"
                  />
                  Smart auto-lock (brief cooldown)
                </label>
                {traceTool === "draw" && (
                  <>
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {([
                        ["replace", "Replace stroke"],
                        ["append", "Append stroke"],
                      ] as const).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setDrawStrokeBehavior(value)}
                          className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${
                            drawStrokeBehavior === value
                              ? "bg-asphalt text-panel-text"
                              : "bg-white text-asphalt hover:bg-surface"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-muted">
                      {drawStrokeBehavior === "append"
                        ? "Each new stroke extends the current trace line."
                        : "Each new stroke replaces the current trace line."}
                    </p>
                  </>
                )}
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {([
                    ["high", "High"],
                    ["balanced", "Balanced"],
                    ["light", "Light"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTraceDetail(value)}
                      className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${
                        traceDetail === value
                          ? "bg-asphalt text-panel-text"
                          : "bg-white text-asphalt hover:bg-surface"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted">
                  Geometry points: {displayedCoordinates.length}
                  {activeRoute ? ` / ${activeRoute.coordinates.length}` : ""}
                </p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={undo}
                disabled={undoStack.length === 0}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/60 px-3 py-1.5 text-xs font-medium text-asphalt transition hover:bg-white disabled:opacity-40"
              >
                <Undo2 className="h-3.5 w-3.5" /> Undo
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={redoStack.length === 0}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/60 px-3 py-1.5 text-xs font-medium text-asphalt transition hover:bg-white disabled:opacity-40"
              >
                <Redo2 className="h-3.5 w-3.5" /> Redo
              </button>
              <button
                type="button"
                onClick={clear}
                disabled={activeCount === 0}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/60 px-3 py-1.5 text-xs font-medium text-asphalt transition hover:bg-white disabled:opacity-40"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          </div>

          {/* WAYPOINTS / TRACE POINTS */}
          <div className="glass-card rounded-2xl border border-white/40 p-4 shadow-lift">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-asphalt">
              {mode === "trace" ? "Trace Points" : "Waypoints"}
            </h2>
            {activeCount === 0 ? (
              <p className="mt-3 text-sm text-muted">
                {mode === "trace"
                  ? "No trace points yet. Click the map to sketch your ride line."
                  : "No waypoints yet. Click the map to start planning a ride."}
              </p>
            ) : (
              <ol className="mt-3 space-y-2">
                {mode === "trace"
                  ? traceMarkerWaypoints.map((point, i) => (
                      <li
                        key={point.id}
                        className="flex items-start gap-2 rounded-xl border border-border bg-white/70 px-3 py-2"
                      >
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: KIND_META[point.kind].color }}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-asphalt">{KIND_META[point.kind].label}</p>
                          {point.label ? (
                            <p className="mt-0.5 truncate text-[11px] text-muted" title={point.label}>
                              {point.label}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-[11px] text-muted">
                              {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTracePoint(point.id)}
                          className="rounded-md p-1 text-muted transition hover:bg-surface hover:text-red-600"
                          aria-label={`Remove trace point ${i + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))
                  : waypoints.map((wp, i) => (
                      <li
                        key={wp.id}
                        className="flex items-start gap-2 rounded-xl border border-border bg-white/70 px-3 py-2"
                      >
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: KIND_META[wp.kind].color }}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <select
                            value={wp.kind}
                            onChange={(e) => setKind(wp.id, e.target.value as WaypointKind)}
                            className="w-full rounded-md border border-border bg-surface px-2 py-1 text-xs text-asphalt"
                          >
                            {(Object.keys(KIND_META) as WaypointKind[]).map((k) => (
                              <option key={k} value={k}>
                                {KIND_META[k].label}
                              </option>
                            ))}
                          </select>
                          {wp.label && (
                            <p className="mt-0.5 truncate text-[11px] text-muted" title={wp.label}>
                              {wp.label}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeWaypoint(wp.id)}
                          className="rounded-md p-1 text-muted transition hover:bg-surface hover:text-red-600"
                          aria-label={`Remove waypoint ${i + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
              </ol>
            )}

            {mode === "waypoints" ? (
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                  <Flag className="h-3.5 w-3.5 text-forest" /> Start/End
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-sunset" /> KSU
                </span>
                <span className="inline-flex items-center gap-1">
                  <Fuel className="h-3.5 w-3.5 text-blue-600" /> Fuel
                </span>
                <span className="inline-flex items-center gap-1">
                  <Coffee className="h-3.5 w-3.5 text-purple-600" /> Food
                </span>
              </div>
            ) : (
              <p className="mt-4 text-xs text-muted">
                Trace mode saves route geometry from anchor points, so routes can be stored with no
                waypoint stops.
              </p>
            )}
          </div>

          {/* EXPORT (matches Prisma Route/Waypoint shape) */}
          {activeCount > 0 && (
            <details className="glass-card rounded-2xl border border-white/40 p-4 shadow-lift">
              <summary className="cursor-pointer font-display text-sm font-bold uppercase tracking-wide text-asphalt">
                Route data (JSON)
              </summary>
              <pre className="mt-3 max-h-48 overflow-auto rounded-xl bg-asphalt p-3 text-[11px] leading-relaxed text-panel-text">
                {exportJson}
              </pre>
            </details>
          )}
        </aside>
      )}
    </div>
  );
}
