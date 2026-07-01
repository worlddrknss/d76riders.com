"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, {
  type Map as MapLibreMap,
  type GeoJSONSource,
  type MapMouseEvent,
  type MapTouchEvent,
} from "maplibre-gl";
import {
  CLARKSVILLE,
  EMPTY_LINE,
  ROUTE_CASING_LAYER,
  ROUTE_LAYER,
  ROUTE_SOURCE,
  coordinatesBounds,
  lineFeature,
  mapStyleUrl,
} from "@/lib/map";

const TRACE_PREVIEW_SOURCE = "trace-preview";
const TRACE_PREVIEW_LAYER = "trace-preview-line";

type UseRouteMapOptions = {
  token: string | undefined;
  interactive?: boolean;
  onMapClick?: (lng: number, lat: number) => void;
  traceDrawEnabled?: boolean;
  onTraceStrokeEnd?: (coordinates: [number, number][]) => void;
};

/**
 * Initializes a MapLibre map with the shared route line source/layers.
 * Used by both the editable planner and the read-only route renderer.
 */
export function useRouteMap({
  token,
  interactive = true,
  onMapClick,
  traceDrawEnabled = false,
  onTraceStrokeEnd,
}: UseRouteMapOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Keep the latest click handler without re-initializing the map.
  const clickRef = useRef(onMapClick);
  useEffect(() => {
    clickRef.current = onMapClick;
  }, [onMapClick]);

  const traceDrawEnabledRef = useRef(traceDrawEnabled);
  useEffect(() => {
    traceDrawEnabledRef.current = traceDrawEnabled;
  }, [traceDrawEnabled]);

  const traceStrokeEndRef = useRef(onTraceStrokeEnd);
  useEffect(() => {
    traceStrokeEndRef.current = onTraceStrokeEnd;
  }, [onTraceStrokeEnd]);

  const suppressClickRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !token) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyleUrl(token),
      center: CLARKSVILLE,
      zoom: 10,
      interactive,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    if (interactive) {
      map.addControl(new maplibregl.NavigationControl(), "bottom-right");
      map.addControl(new maplibregl.GeolocateControl({}), "bottom-right");
    }

    map.on("load", () => {
      map.addSource(ROUTE_SOURCE, { type: "geojson", data: EMPTY_LINE });
      map.addSource(TRACE_PREVIEW_SOURCE, { type: "geojson", data: EMPTY_LINE });
      // Casing underneath for a crisp, premium route line.
      map.addLayer({
        id: ROUTE_CASING_LAYER,
        type: "line",
        source: ROUTE_SOURCE,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#1c1c1c", "line-width": 8, "line-opacity": 0.35 },
      });
      map.addLayer({
        id: ROUTE_LAYER,
        type: "line",
        source: ROUTE_SOURCE,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#e8703a", "line-width": 5, "line-opacity": 0.95 },
      });
      map.addLayer({
        id: TRACE_PREVIEW_LAYER,
        type: "line",
        source: TRACE_PREVIEW_SOURCE,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#222222",
          "line-width": 4,
          "line-opacity": 0.8,
          "line-dasharray": [1.5, 1.5],
        },
      });
      setMapReady(true);
    });

    const setTracePreviewLine = (coordinates: [number, number][]) => {
      const source = map.getSource(TRACE_PREVIEW_SOURCE) as GeoJSONSource | undefined;
      source?.setData(coordinates.length ? lineFeature(coordinates) : EMPTY_LINE);
    };

    let drawing = false;
    let stroke: [number, number][] = [];
    let lastPointPx: { x: number; y: number } | null = null;
    const minimumPixelGap = 8;
    const minimumStrokePixels = 24;
    let strokePixelDistance = 0;

    const startStroke = (lng: number, lat: number, x: number, y: number) => {
      drawing = true;
      stroke = [[lng, lat]];
      lastPointPx = { x, y };
      strokePixelDistance = 0;
      setTracePreviewLine(stroke);
      map.dragPan.disable();
      map.getCanvas().style.cursor = "crosshair";
    };

    const extendStroke = (lng: number, lat: number, x: number, y: number) => {
      if (!drawing || !lastPointPx) {
        return;
      }

      const dx = x - lastPointPx.x;
      const dy = y - lastPointPx.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < minimumPixelGap * minimumPixelGap) {
        return;
      }

      strokePixelDistance += Math.sqrt(distanceSquared);
      stroke.push([lng, lat]);
      lastPointPx = { x, y };
      setTracePreviewLine(stroke);
    };

    const finishStroke = (lng?: number, lat?: number) => {
      if (!drawing) {
        return;
      }

      if (typeof lng === "number" && typeof lat === "number" && lastPointPx) {
        const prev = stroke[stroke.length - 1];
        if (prev[0] !== lng || prev[1] !== lat) {
          stroke.push([lng, lat]);
          setTracePreviewLine(stroke);
        }
      }

      const finalized = stroke;
      drawing = false;
      stroke = [];
      lastPointPx = null;
      setTracePreviewLine([]);
      map.dragPan.enable();
      map.getCanvas().style.cursor = "";

      if (finalized.length >= 2 && strokePixelDistance >= minimumStrokePixels) {
        suppressClickRef.current = true;
        traceStrokeEndRef.current?.(finalized);
      }
    };

    const onMouseDown = (e: MapMouseEvent) => {
      if (!traceDrawEnabledRef.current) {
        return;
      }
      if (e.originalEvent.button !== 0) {
        return;
      }
      startStroke(e.lngLat.lng, e.lngLat.lat, e.point.x, e.point.y);
    };

    const onMouseMove = (e: MapMouseEvent) => {
      if (!traceDrawEnabledRef.current) {
        return;
      }
      extendStroke(e.lngLat.lng, e.lngLat.lat, e.point.x, e.point.y);
    };

    const onMouseUp = (e: MapMouseEvent) => {
      finishStroke(e.lngLat.lng, e.lngLat.lat);
    };

    const onTouchStart = (e: MapTouchEvent) => {
      if (!traceDrawEnabledRef.current) {
        return;
      }
      startStroke(e.lngLat.lng, e.lngLat.lat, e.point.x, e.point.y);
    };

    const onTouchMove = (e: MapTouchEvent) => {
      if (!traceDrawEnabledRef.current) {
        return;
      }
      extendStroke(e.lngLat.lng, e.lngLat.lat, e.point.x, e.point.y);
    };

    const onTouchEnd = () => {
      finishStroke();
    };

    const onClick = (e: MapMouseEvent) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      clickRef.current?.(e.lngLat.lng, e.lngLat.lat);
    };

    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", onMouseUp);
    map.on("touchstart", onTouchStart);
    map.on("touchmove", onTouchMove);
    map.on("touchend", onTouchEnd);
    map.on("mouseleave", () => finishStroke());
    map.on("click", onClick);

    return () => {
      finishStroke();
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [token, interactive]);

  // Replace the route line geometry.
  const setRouteLine = (coordinates: [number, number][]) => {
    const source = mapRef.current?.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined;
    source?.setData(coordinates.length ? lineFeature(coordinates) : EMPTY_LINE);
  };

  // Frame the map to fit the given coordinates.
  const fitToCoordinates = (coordinates: [number, number][]) => {
    const bounds = coordinatesBounds(coordinates);
    if (bounds && mapRef.current) {
      mapRef.current.fitBounds(bounds, { padding: 80, duration: 600, maxZoom: 14 });
    }
  };

  // Smoothly center the map on a single point (e.g. a searched address).
  const flyTo = (lng: number, lat: number, zoom = 13) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 900 });
  };

  return { containerRef, mapRef, mapReady, setRouteLine, fitToCoordinates, flyTo };
}
