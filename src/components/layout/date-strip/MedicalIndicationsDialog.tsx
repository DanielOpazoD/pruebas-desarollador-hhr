import React from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ClipboardList,
  Pencil,
  Stethoscope,
  Trash2,
  UserRound,
} from 'lucide-react';
import { BaseModal } from '@/components/shared/BaseModal';
import { printMedicalIndicationsPdf } from '@/services/pdf/medicalIndicationsPdfService';
import {
  formatMedicalIndicationsDate,
  type MedicalIndicationsPatientOption,
} from '@/shared/contracts/medicalIndications';
import { useMedicalIndicationsEditor } from './useMedicalIndicationsEditor';

interface MedicalIndicationsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  patients: MedicalIndicationsPatientOption[];
}

const buildToday = () => {
  const date = new Date();
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

export const MedicalIndicationsDialog: React.FC<MedicalIndicationsDialogProps> = ({
  isOpen,
  onClose,
  patients,
}) => {
  const editor = useMedicalIndicationsEditor({ isOpen, patients });

  if (patients.length === 0) {
    return null;
  }

  const handlePrint = async () => {
    if (!editor.selectedPatient || editor.isPrinting) return;

    editor.setIsPrinting(true);
    try {
      await printMedicalIndicationsPdf({
        paciente_nombre: editor.selectedPatient.patientName,
        paciente_rut: editor.selectedPatient.rut,
        paciente_diagnostico: editor.selectedPatient.diagnosis,
        paciente_edad: editor.selectedPatient.age,
        fecha_nacimiento: formatMedicalIndicationsDate(editor.selectedPatient.birthDate),
        paciente_alergias: editor.selectedPatient.allergies,
        medicotratante: editor.treatingDoctor,
        fecha_ingreso: formatMedicalIndicationsDate(editor.selectedPatient.admissionDate),
        fecha_actual: buildToday(),
        diasEstada: editor.selectedPatient.daysOfStay,
        Reposoindicacion: editor.reposo,
        Regimenindicacion: editor.regimen,
        Kinemotora: editor.kineType === 'motora' || editor.kineType === 'ambas' ? 'X' : '',
        Kinerespiratoria:
          editor.kineType === 'respiratoria' || editor.kineType === 'ambas' ? 'X' : '',
        Kinecantidadvecesdia: editor.kineTimes,
        Pendientes: editor.pendingNotes,
        indicaciones: editor.indications,
      });
    } finally {
      editor.setIsPrinting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        editor.selectedPatient
          ? `Indicaciones médicas · ${editor.selectedPatient.patientName}`
          : 'Indicaciones médicas'
      }
      size="3xl"
      variant="white"
      className="max-w-[78vw]"
      bodyClassName="max-h-[84vh] overflow-y-auto px-4 py-3"
      headerActions={
        patients.length > 1 ? (
          <select
            className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
            value={editor.selectedPatient?.bedId || editor.selectedBedId}
            onChange={event => editor.setSelectedBedId(event.target.value)}
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
      <div className="grid grid-cols-2 gap-3 p-0.5 text-[13px]">
        <label className="text-[11px] font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1">
            <UserRound size={12} className="text-slate-400" />
            Médico tratante
          </span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px] shadow-sm"
            value={editor.treatingDoctor}
            onChange={event => editor.setTreatingDoctor(event.target.value)}
          />
        </label>

        <label className="text-[11px] font-semibold text-slate-600">
          Reposo
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px] shadow-sm"
            value={editor.reposo}
            onChange={event => editor.setReposo(event.target.value)}
            placeholder="Ej: absoluto"
          />
        </label>

        <label className="text-[11px] font-semibold text-slate-600">
          Régimen
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px] shadow-sm"
            value={editor.regimen}
            onChange={event => editor.setRegimen(event.target.value)}
            placeholder="Ej: liviano"
          />
        </label>

        <div className="col-span-2 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-[11px] font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Activity size={12} className="text-slate-400" />
              Kinesiología
            </span>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px] shadow-sm"
              value={editor.kineType}
              onChange={event =>
                editor.setKineType(
                  event.target.value as 'motora' | 'respiratoria' | 'ambas' | 'ninguna'
                )
              }
            >
              <option value="ninguna">Sin indicación</option>
              <option value="motora">Motora</option>
              <option value="respiratoria">Respiratoria</option>
              <option value="ambas">Motora y respiratoria</option>
            </select>
          </label>

          <label className="text-[11px] font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Stethoscope size={12} className="text-slate-400" />
              Frecuencia de atención
            </span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px] shadow-sm"
              value={editor.kineTimes}
              onChange={event => editor.setKineTimes(event.target.value)}
              placeholder="Ej: 2 veces/día"
            />
          </label>
        </div>

        <label className="col-span-2 text-[11px] font-semibold text-slate-600">
          Pendientes
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px] shadow-sm"
            value={editor.pendingNotes}
            onChange={event => editor.setPendingNotes(event.target.value)}
          />
        </label>

        <div className="col-span-2 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-medical-50/40 p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              <ClipboardList size={12} className="text-slate-500" />
              Indicaciones clínicas
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${editor.isOrderingIndications ? 'border-medical-500 bg-medical-50 text-medical-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                onClick={() => editor.setIsOrderingIndications(current => !current)}
              >
                <ArrowUp size={12} />
                <ArrowDown size={12} />
                Cambiar orden
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${editor.isEditingIndications ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                onClick={() => {
                  editor.setIsEditingIndications(current => !current);
                  editor.resetEditing();
                }}
              >
                <Pencil size={12} />
                {editor.isEditingIndications ? 'Edición activa' : 'Modificar indicaciones'}
              </button>
            </div>
          </div>
          <div className="mt-1.5 flex gap-2">
            <input
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[13px]"
              value={editor.indicationDraft}
              disabled={!editor.isEditingIndications}
              onChange={event => editor.setIndicationDraft(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  editor.addIndication();
                }
              }}
              placeholder="Escribe una indicación y presiona Enter"
            />
            <button
              type="button"
              onClick={editor.addIndication}
              disabled={
                !editor.isEditingIndications ||
                !editor.indicationDraft.trim() ||
                editor.activeIndications.length >= editor.maxIndications
              }
              className="rounded-md bg-medical-600 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              Agregar
            </button>
          </div>
          <div className="mt-2 grid gap-1.5">
            {editor.activeIndications.length === 0 ? (
              <p className="text-xs text-slate-500">Aún no hay indicaciones agregadas.</p>
            ) : (
              editor.activeIndications.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    {editor.editingIndex === index ? (
                      <div className="space-y-2">
                        <input
                          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                          value={editor.editingValue}
                          onChange={event => editor.setEditingValue(event.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={editor.saveEditedIndication}
                            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={editor.resetEditing}
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
                    {editor.isOrderingIndications && (
                      <>
                        <button
                          type="button"
                          onClick={() => editor.moveIndication(index, 'up')}
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                          aria-label={`Subir indicación #${index + 1}`}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => editor.moveIndication(index, 'down')}
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                          aria-label={`Bajar indicación #${index + 1}`}
                        >
                          <ArrowDown size={14} />
                        </button>
                      </>
                    )}
                    {editor.isEditingIndications && editor.editingIndex !== index && (
                      <button
                        type="button"
                        onClick={() => editor.startEditing(index, item)}
                        className="rounded p-1 text-medical-600 hover:bg-medical-50 hover:text-medical-700"
                        aria-label={`Editar indicación #${index + 1}`}
                        title={`Editar indicación #${index + 1}`}
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => editor.removeIndication(index)}
                      disabled={!editor.isEditingIndications}
                      className="rounded p-1 text-rose-600 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                      aria-label={`Quitar indicación #${index + 1}`}
                      title={`Quitar indicación #${index + 1}`}
                    >
                      <Trash2 size={14} />
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
          onClick={onClose}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
        >
          Cerrar
        </button>
        <button
          onClick={() => void handlePrint()}
          disabled={editor.isPrinting || !editor.selectedPatient}
          className="rounded-md bg-medical-600 px-3 py-1.5 text-sm text-white disabled:opacity-60"
        >
          {editor.isPrinting ? 'Generando PDF...' : 'PDF'}
        </button>
      </div>
    </BaseModal>
  );
};
