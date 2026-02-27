export default function PlacaSelector({ id, placas, value, onChange }) {
  return (
    <select id={id} value={value} onChange={onChange}>
      <option value="">(todas)</option>
      {placas.filter(Boolean).map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}
