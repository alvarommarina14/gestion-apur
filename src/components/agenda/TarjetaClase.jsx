export default function TarjetaClase({ turno }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-slate-900 truncate">
        {turno.cliente}
      </p>
      <p className="text-xs text-slate-600">
        {turno.hora_inicio} - {turno.hora_fin}
      </p>
      {turno.notas && (
        <p className="text-xs text-slate-500 italic">{turno.notas}</p>
      )}
    </div>
  );
}