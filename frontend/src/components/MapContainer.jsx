import { MapContainer as LeafletMapContainer, TileLayer } from "react-leaflet";

export default function MapContainer({ children }) {
  return (
    <LeafletMapContainer
      center={[-23.2, -46.8]}
      zoom={7}
      style={{ height: "100vh", width: "100vw" }}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={18}
        attribution='&copy; OpenStreetMap'
      />
      {children}
    </LeafletMapContainer>
  );
}
