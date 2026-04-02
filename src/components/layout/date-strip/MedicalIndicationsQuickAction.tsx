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
  }, [isOpen, selectedPatient?.bedId]);

  React.useEffect(() => {
    if (!isOpen || !selectedPatient) return;
    setTreatingDoctor(selectedPatient.treatingDoctor);
  }, [isOpen, selectedPatient?.bedId, selectedPatient?.treatingDoctor]);

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
        fecha_nacimiento: selectedPatient.birthDate,
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
        <div className="grid grid-cols-2 gap-3 p-1">
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

          <div className="col-span-2 grid grid-cols-1 gap-1.5 max-h-[280px] overflow-y-auto border border-slate-200 rounded-md p-2 bg-slate-50">
            {indications.map((value, index) => (
              <input
                key={`indication-${index + 1}`}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs bg-white"
                value={value}
                onChange={event =>
                  setIndications(current => {
                    const next = [...current];
                    next[index] = event.target.value;
                    return next;
                  })
                }
                placeholder={`Indicación ${index + 1}`}
              />
            ))}
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
