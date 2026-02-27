import { useState, useEffect, useCallback } from "react";
import MapContainer from "./components/MapContainer";
import ExcessMap from "./components/ExcessMap";
import PlacaSelector from "./components/PlacaSelector";
import InfoPanel from "./components/InfoPanel";

function apiUrl(placa) {
  const q = new URLSearchParams({
    today: "1",
    company80: "1",
    dedupe: "0",
    stats: "1",
  });
  if (placa) q.set("placa", placa);
  return `/api/excessos?${q.toString()}`;
}

function App() {
  const [placa, setPlaca] = useState("");
  const [data, setData] = useState({ points: [], placas: [] });

  const refresh = useCallback(async () => {
    const r = await fetch(apiUrl(placa), { cache: "no-store" });
    const json = await r.json();
    setData({
      points: json.points || [],
      placas: json.placas || [],
    });
  }, [placa]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(refresh, 60000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <>
      <div id="bar">
        <div id="box">
          <InfoPanel pointCount={data.points.length} />
          <label htmlFor="selPlaca">Placa:</label>
          <PlacaSelector
            id="selPlaca"
            placas={data.placas}
            value={placa}
            onChange={(e) => setPlaca(e.target.value)}
          />
        </div>
      </div>

      <MapContainer>
        <ExcessMap points={data.points} />
      </MapContainer>
    </>
  );
}

export default App;
