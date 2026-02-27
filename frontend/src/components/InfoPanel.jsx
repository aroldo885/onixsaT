export default function InfoPanel({ pointCount }) {
  return (
    <>
      <b>Excesso &gt; 80 km/h (HOJE)</b>
      <span id="meta">Pontos: {pointCount}</span>
    </>
  );
}
