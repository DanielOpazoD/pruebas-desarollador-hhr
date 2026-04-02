import React from 'react';
import { FilePlus2 } from 'lucide-react';
import { BaseModal } from '@/components/shared/BaseModal';
import { printMedicalIndicationsPdf } from '@/services/pdf/medicalIndicationsPdfService';

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

const formatBirthDate = (rawDate: string) => {
  if (!rawDate) return '';

  const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}-${month}-${year}`;
  }

  const slashMatch = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${day}-${month}-${year}`;
  }

  return rawDate;
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
        fecha_nacimiento: formatBirthDate(selectedPatient.birthDate),
        paciente_alergias: selectedPatient.allergies,
        medicotratante: treatingDoctor,
        fecha_ingreso: selectedPatient.admissionDate,
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
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
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
              className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-600"
              value={formatBirthDate(selectedPatient?.birthDate ?? '')}
              readOnly
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Médico tratante
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              value={treatingDoctor}
              onChange={event => setTreatingDoctor(event.target.value)}
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Reposo
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              value={reposo}
              onChange={event => setReposo(event.target.value)}
              placeholder="Ej: absoluto"
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Régimen
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              value={regimen}
              onChange={event => setRegimen(event.target.value)}
              placeholder="Ej: liviano"
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Kinesiología
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
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
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              value={kineTimes}
              onChange={event => setKineTimes(event.target.value)}
              placeholder="Ej: 2"
            />
          </label>

          <label className="col-span-2 text-xs font-semibold text-slate-600">
            Pendientes
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              value={pendingNotes}
              onChange={event => setPendingNotes(event.target.value)}
            />
          </label>

          <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-xs font-semibold text-slate-700">Indicaciones clínicas</p>
            <div className="mt-2 flex gap-2">
              <input
                className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm bg-white"
                value={indicationDraft}
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
                disabled={!indicationDraft.trim() || activeIndications.length >= INDICATIONS_LINES}
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
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold text-medical-700">{`Indicacion${index + 1}: `}</span>
                      {item}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeIndication(index)}
                      className="text-xs text-rose-600 hover:text-rose-700"
                    >
                      Quitar
                    </button>
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
