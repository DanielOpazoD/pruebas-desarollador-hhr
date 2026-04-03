import React from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ClipboardList,
  FilePlus2,
  GripVertical,
  Pencil,
  Plus,
  Printer,
  Stethoscope,
  Trash2,
  UserRound,
} from 'lucide-react';
import { BaseModal } from '@/components/shared/BaseModal';
import { printMedicalIndicationsPdf } from '@/services/pdf/medicalIndicationsPdfService';
import { formatDateToDDMMYYYY } from '@/components/layout/date-strip/medicalIndicationsUtils';

export interface MedicalIndicationsPatientOption {
  bedId: string;
  label: string;
  patientName: string;
  rut: string;
  diagnosis: string;
  age: string;
  birthDate: string;
  allergies: string;
  admissionDate: string;
  daysOfStay: string;
  treatingDoctor: string;
}

interface MedicalIndicationsQuickActionProps {
  patients: MedicalIndicationsPatientOption[];
}

const INDICATIONS_LINES = 15;

const defaultSelectedPatient = (patients: MedicalIndicationsPatientOption[]) => patients[0] ?? null;

const buildToday = () => {
  const date = new Date();
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

export const MedicalIndicationsQuickAction: React.FC<MedicalIndicationsQuickActionProps> = ({
  patients,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedBedId, setSelectedBedId] = React.useState<string>('');
  const [reposo, setReposo] = React.useState('');
  const [regimen, setRegimen] = React.useState('');
  const [kineType, setKineType] = React.useState<'motora' | 'respiratoria' | 'ambas' | 'ninguna'>(
    'ninguna'
  );
  const [kineTimes, setKineTimes] = React.useState('');
  const [treatingDoctor, setTreatingDoctor] = React.useState('');
  const [pendingNotes, setPendingNotes] = React.useState('');
  const [indicationDraft, setIndicationDraft] = React.useState('');
  const [indications, setIndications] = React.useState<string[]>(() =>
    Array.from({ length: INDICATIONS_LINES }, () => '')
  );
  const [isEditingIndications, setIsEditingIndications] = React.useState(true);
  const [isOrderingIndications, setIsOrderingIndications] = React.useState(false);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editingValue, setEditingValue] = React.useState('');
  const [isPrinting, setIsPrinting] = React.useState(false);

  const selectedPatient = React.useMemo(() => {
    const defaultPatient = defaultSelectedPatient(patients);
    if (!selectedBedId) return defaultPatient;
    return patients.find(patient => patient.bedId === selectedBedId) ?? defaultPatient;
  }, [patients, selectedBedId]);

  React.useEffect(() => {
    if (!isOpen || !selectedPatient) return;

    setSelectedBedId(current => (current ? current : selectedPatient.bedId));
  }, [isOpen, selectedPatient]);

  React.useEffect(() => {
    if (!isOpen || !selectedPatient) return;
    setTreatingDoctor(selectedPatient.treatingDoctor);
  }, [isOpen, selectedPatient]);

  const activeIndications = React.useMemo(
    () => indications.map(text => text.trim()).filter(Boolean),
    [indications]
  );

  if (patients.length === 0) {
    return null;
  }

  const handlePrint = async () => {
    if (!selectedPatient || isPrinting) return;

    setIsPrinting(true);
    try {
      await printMedicalIndicationsPdf({
        paciente_nombre: selectedPatient.patientName,
        paciente_rut: selectedPatient.rut,
        paciente_diagnostico: selectedPatient.diagnosis,
        paciente_edad: selectedPatient.age,
        fecha_nacimiento: formatDateToDDMMYYYY(selectedPatient.birthDate),
        paciente_alergias: selectedPatient.allergies,
        medicotratante: treatingDoctor,
        fecha_ingreso: formatDateToDDMMYYYY(selectedPatient.admissionDate),
        fecha_actual: buildToday(),
        diasEstada: selectedPatient.daysOfStay,
        Reposoindicacion: reposo,
        Regimenindicacion: regimen,
        Kinemotora: kineType === 'motora' || kineType === 'ambas' ? 'X' : '',
        Kinerespiratoria: kineType === 'respiratoria' || kineType === 'ambas' ? 'X' : '',
        Kinecantidadvecesdia: kineTimes,
        Pendientes: pendingNotes,
        indicaciones: indications,
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const addIndication = () => {
    const trimmed = indicationDraft.trim();
    if (!trimmed) return;

    setIndications(current => {
      const next = [...current];
      const firstEmptyIndex = next.findIndex(item => !item.trim());
      if (firstEmptyIndex === -1) return next;
      next[firstEmptyIndex] = trimmed;
      return next;
    });
    setIndicationDraft('');
  };

  const removeIndication = (targetIndex: number) => {
    setIndications(current => {
      const next = current.map(text => text.trim()).filter(Boolean);
      next.splice(targetIndex, 1);
      return [...next, ...Array.from({ length: INDICATIONS_LINES - next.length }, () => '')];
    });
  };

  const moveIndication = (targetIndex: number, direction: 'up' | 'down') => {
    setIndications(current => {
      const active = current.map(text => text.trim()).filter(Boolean);
      const destination = direction === 'up' ? targetIndex - 1 : targetIndex + 1;
      if (destination < 0 || destination >= active.length) return current;
      [active[targetIndex], active[destination]] = [active[destination], active[targetIndex]];
      return [...active, ...Array.from({ length: INDICATIONS_LINES - active.length }, () => '')];
    });
  };

  const startEditing = (index: number, text: string) => {
    setEditingIndex(index);
    setEditingValue(text);
  };

  const saveEditedIndication = () => {
    if (editingIndex === null) return;
    const trimmed = editingValue.trim();
    if (!trimmed) return;
    setIndications(current => {
      const active = current.map(text => text.trim()).filter(Boolean);
      active[editingIndex] = trimmed;
      return [...active, ...Array.from({ length: INDICATIONS_LINES - active.length }, () => '')];
    });
    setEditingIndex(null);
    setEditingValue('');
  };

  const remainingSlots = INDICATIONS_LINES - activeIndications.length;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 px-2.5 py-1.5 bg-medical-50 hover:bg-medical-100 text-medical-700 rounded-md border border-medical-200 transition-colors text-[11px] font-semibold"
        title="Indicaciones médicas"
      >
        <FilePlus2 size={14} />
        <span className="hidden sm:inline">Indicaciones</span>
      </button>

      <BaseModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-medical-500 to-medical-700 text-white shadow-md shadow-medical-500/20">
              <ClipboardList size={16} />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[15px] font-bold tracking-tight text-slate-800">Claude</span>
              {selectedPatient && (
                <span className="text-[11px] font-medium text-slate-400">
                  {selectedPatient.patientName}
                </span>
              )}
            </span>
          </span>
        }
        size="3xl"
        variant="white"
        className="max-w-[78vw] !rounded-2xl ring-1 ring-black/[0.03]"
        bodyClassName="max-h-[84vh] overflow-y-auto px-5 py-4"
        headerActions={
          patients.length > 1 ? (
            <select
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 focus:border-medical-400 focus:outline-none focus:ring-2 focus:ring-medical-500/10"
              value={selectedPatient?.bedId || ''}
              onChange={event => setSelectedBedId(event.target.value)}
              aria-label="Seleccionar paciente"
            >
              {patients.map(patient => (
                <option key={patient.bedId} value={patient.bedId}>
                  {patient.label}
                </option>
              ))}
            </select>
          ) : null
        }
      >
        {/* Patient info banner */}
        {selectedPatient && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-medical-100 bg-gradient-to-r from-medical-50/80 via-medical-50/40 to-transparent px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-medical-100 text-medical-600">
              <UserRound size={16} />
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
              <span className="font-semibold text-slate-700">{selectedPatient.patientName}</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-500">{selectedPatient.rut}</span>
              {selectedPatient.diagnosis && (
                <>
                  <span className="text-slate-400">|</span>
                  <span
                    className="text-slate-500 truncate max-w-[200px]"
                    title={selectedPatient.diagnosis}
                  >
                    {selectedPatient.diagnosis}
                  </span>
                </>
              )}
              {selectedPatient.daysOfStay && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-medical-100/80 px-2.5 py-0.5 text-[11px] font-semibold text-medical-700">
                  {selectedPatient.daysOfStay} días
                </span>
              )}
            </div>
          </div>
        )}

        {/* Form fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Médico tratante */}
          <div className="group relative">
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <UserRound size={11} className="text-slate-300" />
              Médico tratante
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-700 shadow-sm transition-all placeholder:text-slate-300 focus:border-medical-400 focus:outline-none focus:ring-4 focus:ring-medical-500/10"
              value={treatingDoctor}
              onChange={event => setTreatingDoctor(event.target.value)}
            />
          </div>

          {/* Reposo */}
          <div className="group relative">
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Reposo
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-700 shadow-sm transition-all placeholder:text-slate-300 focus:border-medical-400 focus:outline-none focus:ring-4 focus:ring-medical-500/10"
              value={reposo}
              onChange={event => setReposo(event.target.value)}
              placeholder="Ej: absoluto"
            />
          </div>

          {/* Régimen */}
          <div className="group relative">
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Régimen
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-700 shadow-sm transition-all placeholder:text-slate-300 focus:border-medical-400 focus:outline-none focus:ring-4 focus:ring-medical-500/10"
              value={regimen}
              onChange={event => setRegimen(event.target.value)}
              placeholder="Ej: liviano"
            />
          </div>

          {/* Pendientes */}
          <div className="group relative">
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Pendientes
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-700 shadow-sm transition-all placeholder:text-slate-300 focus:border-medical-400 focus:outline-none focus:ring-4 focus:ring-medical-500/10"
              value={pendingNotes}
              onChange={event => setPendingNotes(event.target.value)}
            />
          </div>

          {/* Kinesiología & Frecuencia — full width row */}
          <div className="col-span-1 grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2">
            <div className="group relative">
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <Activity size={11} className="text-slate-300" />
                Kinesiología
              </label>
              <select
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-700 shadow-sm transition-all focus:border-medical-400 focus:outline-none focus:ring-4 focus:ring-medical-500/10"
                value={kineType}
                onChange={event =>
                  setKineType(event.target.value as 'motora' | 'respiratoria' | 'ambas' | 'ninguna')
                }
              >
                <option value="ninguna">Sin indicación</option>
                <option value="motora">Motora</option>
                <option value="respiratoria">Respiratoria</option>
                <option value="ambas">Motora y respiratoria</option>
              </select>
            </div>

            <div className="group relative">
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <Stethoscope size={11} className="text-slate-300" />
                Frecuencia de atención
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-700 shadow-sm transition-all placeholder:text-slate-300 focus:border-medical-400 focus:outline-none focus:ring-4 focus:ring-medical-500/10"
                value={kineTimes}
                onChange={event => setKineTimes(event.target.value)}
                placeholder="Ej: 2 veces/día"
              />
            </div>
          </div>
        </div>

        {/* Clinical indications section */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-white shadow-sm">
          {/* Section header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-medical-100 text-medical-600">
                <ClipboardList size={14} />
              </span>
              <div>
                <p className="text-[13px] font-bold text-slate-700">Indicaciones clínicas</p>
                <p className="text-[11px] text-slate-400">
                  {activeIndications.length} de {INDICATIONS_LINES}
                  {remainingSlots > 0 && ` \u00B7 ${remainingSlots} disponibles`}
                </p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
                  isOrderingIndications
                    ? 'bg-medical-600 text-white shadow-sm shadow-medical-600/20'
                    : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
                onClick={() => setIsOrderingIndications(current => !current)}
              >
                <GripVertical size={12} />
                Ordenar
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
                  isEditingIndications
                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                    : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
                onClick={() => {
                  setIsEditingIndications(current => !current);
                  setEditingIndex(null);
                  setEditingValue('');
                }}
              >
                <Pencil size={11} />
                {isEditingIndications ? 'Editando' : 'Editar'}
              </button>
            </div>
          </div>

          {/* Add new indication input */}
          <div className="border-b border-slate-100 bg-white px-4 py-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 pr-10 text-[13px] text-slate-700 transition-all placeholder:text-slate-300 focus:border-medical-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-medical-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  value={indicationDraft}
                  disabled={!isEditingIndications}
                  onChange={event => setIndicationDraft(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addIndication();
                    }
                  }}
                  placeholder="Escribe una indicación y presiona Enter..."
                />
                {indicationDraft.trim() && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                    Enter
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={addIndication}
                disabled={
                  !isEditingIndications ||
                  !indicationDraft.trim() ||
                  activeIndications.length >= INDICATIONS_LINES
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-medical-600 px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm shadow-medical-600/20 transition-all hover:bg-medical-700 hover:shadow-md hover:shadow-medical-600/25 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
              >
                <Plus size={14} />
                Agregar
              </button>
            </div>
          </div>

          {/* Indications list */}
          <div className="divide-y divide-slate-100/80">
            {activeIndications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                  <ClipboardList size={22} />
                </span>
                <p className="text-[13px] font-medium text-slate-400">Sin indicaciones</p>
                <p className="mt-0.5 text-[11px] text-slate-300">
                  Escribe arriba para agregar la primera indicación
                </p>
              </div>
            ) : (
              activeIndications.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="group/row flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50/60"
                >
                  {/* Number badge */}
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-medical-100/70 text-[11px] font-bold text-medical-600">
                    {index + 1}
                  </span>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    {editingIndex === index ? (
                      <div className="space-y-2">
                        <input
                          className="w-full rounded-xl border border-medical-200 bg-white px-3.5 py-2 text-[13px] text-slate-700 shadow-sm focus:border-medical-400 focus:outline-none focus:ring-4 focus:ring-medical-500/10"
                          value={editingValue}
                          onChange={event => setEditingValue(event.target.value)}
                          onKeyDown={event => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              saveEditedIndication();
                            }
                            if (event.key === 'Escape') {
                              setEditingIndex(null);
                              setEditingValue('');
                            }
                          }}
                          autoFocus
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={saveEditedIndication}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition-all hover:bg-emerald-600 active:scale-[0.98]"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingIndex(null);
                              setEditingValue('');
                            }}
                            className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-slate-400 transition-colors hover:text-slate-600"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[13px] leading-relaxed text-slate-600">{item}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100">
                    {isOrderingIndications && (
                      <>
                        <button
                          type="button"
                          onClick={() => moveIndication(index, 'up')}
                          disabled={index === 0}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                          aria-label={`Subir indicación #${index + 1}`}
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveIndication(index, 'down')}
                          disabled={index === activeIndications.length - 1}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                          aria-label={`Bajar indicación #${index + 1}`}
                        >
                          <ArrowDown size={13} />
                        </button>
                      </>
                    )}
                    {isEditingIndications && editingIndex !== index && (
                      <button
                        type="button"
                        onClick={() => startEditing(index, item)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-medical-50 hover:text-medical-600"
                        aria-label={`Editar indicación #${index + 1}`}
                        title={`Editar indicación #${index + 1}`}
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeIndication(index)}
                      disabled={!isEditingIndications}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:pointer-events-none disabled:opacity-30"
                      aria-label={`Quitar indicación #${index + 1}`}
                      title={`Quitar indicación #${index + 1}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-5 flex items-center justify-between">
          <p className="text-[11px] text-slate-300">
            {activeIndications.length > 0 &&
              `${activeIndications.length} indicaci${activeIndications.length === 1 ? 'ón' : 'ones'}`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:text-slate-700 active:scale-[0.98]"
            >
              Cerrar
            </button>
            <button
              onClick={() => void handlePrint()}
              disabled={isPrinting || !selectedPatient}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-medical-500 to-medical-600 px-5 py-2 text-[13px] font-semibold text-white shadow-md shadow-medical-600/25 transition-all hover:from-medical-600 hover:to-medical-700 hover:shadow-lg hover:shadow-medical-600/30 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
            >
              <Printer size={14} />
              {isPrinting ? 'Generando...' : 'Imprimir PDF'}
            </button>
          </div>
        </div>
      </BaseModal>
    </>
  );
};
