import React from 'react';
import { CheckCircle2, ClipboardList } from 'lucide-react';

const CHECKLIST_ITEMS = [
  'Revisar usuarios en estado CRITICO en Telemetria.',
  'Validar que "Cola mas antigua" sea menor a 15 min.',
  'Confirmar que "Sync Fallido" y "Conflictos" esten en 0.',
  'Si hay reintentos persistentes, pedir recarga de sesion y revalidar.',
  'Si aparece permission-denied, escalar a revision de reglas/permisos.',
  'Si aparece modo degradado IndexedDB, aplicar Reintentar o Limpieza Dura.',
];

export const DailyOpsChecklistCard: React.FC = () => (
  <div className="rounded-2xl border border-medical-100 bg-gradient-to-br from-medical-50 to-white p-4 shadow-sm">
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg bg-medical-100 p-2 text-medical-700">
        <ClipboardList size={16} />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-black tracking-wide text-slate-900">
          Checklist Diario (Soporte)
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          Rutina rapida para detectar degradacion antes de que impacte al equipo clinico.
        </p>
      </div>
    </div>

    <ul className="mt-4 grid gap-2">
      {CHECKLIST_ITEMS.map(item => (
        <li key={item} className="flex items-start gap-2 text-xs text-slate-700">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);
