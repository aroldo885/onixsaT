import { useEffect } from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

function truckIcon(vel) {
  return L.divIcon({
    className: `truck${vel >= 100 ? " fast" : ""}`,
    html: "🚚",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function fmt(ts) {
  return new Date(ts).toLocaleString("pt-BR");
}

export default function ExcessMap({ points }) {
  const map = useMap();

  const validPoints = (points || []).filter(
    (p) => Number.isFinite(p.lat) && Number.isFinite(p.lon)
  );

  useEffect(() => {
    if (validPoints.length === 0) return;
    const bounds = L.latLngBounds(validPoints.map((p) => [p.lat, p.lon]));
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, points]);

  return (
    <>
      {validPoints.map((p, i) => (
        <Marker
          key={`${p.lat}-${p.lon}-${p.ts}-${i}`}
          position={[p.lat, p.lon]}
          icon={truckIcon(p.vel)}
          title={p.placa || ""}
        >
          <Popup>
            Placa: {p.placa || "-"}
            <br />
            Vel: {p.vel}
            <br />
            Horário: {fmt(p.ts)}
          </Popup>
        </Marker>
      ))}
    </>
  );
}
