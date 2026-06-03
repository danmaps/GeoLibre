import { useAppStore } from "@geolibre/core";
import { cn } from "@geolibre/ui";
import { LogIn, User } from "lucide-react";
import { useArcGISOAuth } from "../../hooks/useArcGISOAuth";

interface StatusBarProps {
  compact?: boolean;
  onOpenAccountSettings?: () => void;
}

export function StatusBar({ compact = false, onOpenAccountSettings }: StatusBarProps) {
  const pointerCoords = useAppStore((s) => s.pointerCoords);
  const mapView = useAppStore((s) => s.mapView);
  const arcGISOAuth = useArcGISOAuth();

  const coordText = pointerCoords
    ? `${pointerCoords[0].toFixed(5)}, ${pointerCoords[1].toFixed(5)}`
    : "—";

  const bboxText = mapView.bbox
    ? mapView.bbox.map((n) => n.toFixed(4)).join(", ")
    : "—";

  return (
    <footer
      className={cn(
        "flex h-7 shrink-0 items-center border-t bg-muted/40 font-mono text-xs text-muted-foreground",
      )}
    >
      <div
        className={cn(
          "flex flex-1 items-center gap-4 overflow-y-hidden whitespace-nowrap px-3",
          compact ? "overflow-hidden" : "overflow-x-auto",
        )}
      >
        <span className="shrink-0">
          {compact ? "XY" : "Coords"}: {coordText}
        </span>
        <span className="shrink-0">Zoom: {mapView.zoom.toFixed(2)}</span>
        <span className="shrink-0">
          Bearing: {mapView.bearing.toFixed(1)}°
        </span>
        <span className="shrink-0">Pitch: {mapView.pitch.toFixed(1)}°</span>
        {compact ? null : <span className="min-w-0 truncate">BBox: {bboxText}</span>}
      </div>
      {arcGISOAuth.clientId ? (
        <button
          type="button"
          onClick={onOpenAccountSettings}
          className="flex shrink-0 items-center gap-1.5 border-l px-3 py-1 hover:bg-muted/60 hover:text-foreground"
          title={arcGISOAuth.token ? `Signed in as ${arcGISOAuth.token.username}` : "Sign in to ArcGIS Online"}
        >
          {arcGISOAuth.token ? (
            <>
              <User className="h-3 w-3" />
              <span>{arcGISOAuth.token.username}</span>
            </>
          ) : (
            <>
              <LogIn className="h-3 w-3" />
              {compact ? null : <span>ArcGIS Sign In</span>}
            </>
          )}
        </button>
      ) : null}
    </footer>
  );
}
