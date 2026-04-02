import React from 'react';
import { ArrowDown, ArrowUp, FilePlus2, Pencil, Save } from 'lucide-react';
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
  const [isEditingIndications, setIsEditingIndications] = React.useState(false);
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
        title="Indicaciones médicas"
        size="3xl"
        variant="white"
      >
        <div className="grid grid-cols-2 gap-4 p-1">
          <label className="text-xs font-semibold text-slate-600">
            Paciente hospitalizado
            <select
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm"
              value={selectedPatient?.bedId || ''}
              onChange={event => setSelectedBedId(event.target.value)}
            >
              {patients.map(patient => (
                <option key={patient.bedId} value={patient.bedId}>
                  {patient.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Fecha de nacimiento
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 shadow-inner"
              value={formatDateToDDMMYYYY(selectedPatient?.birthDate ?? '')}
              readOnly
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Fecha de ingreso
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 shadow-inner"
              value={formatDateToDDMMYYYY(selectedPatient?.admissionDate ?? '')}
              readOnly
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Médico tratante
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm"
              value={treatingDoctor}
              onChange={event => setTreatingDoctor(event.target.value)}
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Reposo
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm"
              value={reposo}
              onChange={event => setReposo(event.target.value)}
              placeholder="Ej: absoluto"
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Régimen
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm"
              value={regimen}
              onChange={event => setRegimen(event.target.value)}
              placeholder="Ej: liviano"
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Kinesiología
            <select
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm"
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
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Veces por día
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm"
              value={kineTimes}
              onChange={event => setKineTimes(event.target.value)}
              placeholder="Ej: 2"
            />
          </label>

          <label className="col-span-2 text-xs font-semibold text-slate-600">
            Pendientes
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm"
              value={pendingNotes}
              onChange={event => setPendingNotes(event.target.value)}
            />
          </label>

          <div className="col-span-2 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-medical-50/40 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                Indicaciones clínicas
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${isOrderingIndications ? 'border-medical-500 bg-medical-50 text-medical-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                  onClick={() => setIsOrderingIndications(current => !current)}
                >
                  <ArrowUp size={12} />
                  <ArrowDown size={12} />
                  Cambiar orden
                </button>
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${isEditingIndications ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                  onClick={() => {
                    setIsEditingIndications(current => !current);
                    setEditingIndex(null);
                    setEditingValue('');
                  }}
                >
                  {isEditingIndications ? <Save size={12} /> : <Pencil size={12} />}
                  {isEditingIndications ? 'Guardar cambios' : 'Modificar indicaciones'}
                </button>
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <input
                className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm bg-white"
                value={indicationDraft}
                disabled={!isEditingIndications}
                onChange={event => setIndicationDraft(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addIndication();
                  }
                }}
                placeholder="Escribe una indicación y presiona Enter"
              />
              <button
                type="button"
                onClick={addIndication}
                disabled={
                  !isEditingIndications ||
                  !indicationDraft.trim() ||
                  activeIndications.length >= INDICATIONS_LINES
                }
                className="px-3 py-2 rounded-md bg-medical-600 text-white text-sm disabled:opacity-50"
              >
                Agregar
              </button>
            </div>
            <div className="mt-3 grid gap-2 max-h-[220px] overflow-y-auto pr-1">
              {activeIndications.length === 0 ? (
                <p className="text-xs text-slate-500">Aún no hay indicaciones agregadas.</p>
              ) : (
                activeIndications.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      {editingIndex === index ? (
                        <div className="space-y-2">
                          <input
                            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                            value={editingValue}
                            onChange={event => setEditingValue(event.target.value)}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={saveEditedIndication}
                              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingIndex(null);
                                setEditingValue('');
                              }}
                              className="text-xs text-slate-500 hover:text-slate-600"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm leading-5 text-slate-700">
                          <span className="font-semibold text-medical-700">{`#${index + 1} `}</span>
                          {item}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {isOrderingIndications && (
                        <>
                          <button
                            type="button"
                            onClick={() => moveIndication(index, 'up')}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            aria-label={`Subir indicación #${index + 1}`}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveIndication(index, 'down')}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            aria-label={`Bajar indicación #${index + 1}`}
                          >
                            <ArrowDown size={14} />
                          </button>
                        </>
                      )}
                      {isEditingIndications && editingIndex !== index && (
                        <button
                          type="button"
                          onClick={() => startEditing(index, item)}
                          className="text-xs text-medical-600 hover:text-medical-700"
                        >
                          Editar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeIndication(index)}
                        disabled={!isEditingIndications}
                        className="text-xs text-rose-600 hover:text-rose-700 disabled:opacity-40"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={() => setIsOpen(false)}
            className="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 text-sm"
          >
            Cerrar
          </button>
          <button
            onClick={() => void handlePrint()}
            disabled={isPrinting || !selectedPatient}
            className="px-3 py-1.5 rounded-md bg-medical-600 text-white text-sm disabled:opacity-60"
          >
            {isPrinting ? 'Generando PDF...' : 'PDF'}
          </button>
        </div>
      </BaseModal>
    </>
  );
};
