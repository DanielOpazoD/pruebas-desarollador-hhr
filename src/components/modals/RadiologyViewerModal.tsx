import React, { useState, useCallback } from 'react';
import { FileText, Loader2, Monitor, Radio, Search, UserRound } from 'lucide-react';
import { BaseModal } from '@/components/shared/BaseModal';
import { searchMMRADExams, type MMRADSearchResult } from '@/services/radiology/mmradService';

interface RadiologyPatient {
  bedId: string;
  label: string;
  patientName: string;
  rut: string;
  diagnosis?: string;
}

interface RadiologyViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: RadiologyPatient[];
  initialPatientRut?: string;
}

export const RadiologyViewerModal: React.FC<RadiologyViewerModalProps> = ({
  isOpen,
  onClose,
  patients,
  initialPatientRut,
}) => {
  const [selectedRut, setSelectedRut] = useState(initialPatientRut || patients[0]?.rut || '');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MMRADSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedPatient = patients.find(p => p.rut === selectedRut);

  const handleSearch = useCallback(async () => {
    if (!selectedRut) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await searchMMRADExams(selectedRut);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar exámenes');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRut]);

  React.useEffect(() => {
    if (isOpen && initialPatientRut) {
      setSelectedRut(initialPatientRut);
      setResult(null);
      setError(null);
    }
  }, [isOpen, initialPatientRut]);

  if (!isOpen) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      variant="white"
      size="3xl"
      className="!rounded-2xl ring-1 ring-black/[0.03]"
      bodyClassName="max-h-[85vh] overflow-y-auto px-5 py-4"
      title={
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-md shadow-violet-500/20">
            <Radio size={16} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[15px] font-bold tracking-tight text-slate-800">
              Radiología / Imagenología
            </span>
            {selectedPatient && (
              <span className="text-[11px] font-medium text-slate-400">
                {selectedPatient.patientName}
              </span>
            )}
          </span>
        </span>
      }
    >
      {/* Patient selector + search */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 shrink-0">
            Paciente
          </label>
          <select
            value={selectedRut}
            onChange={e => {
              setSelectedRut(e.target.value);
              setResult(null);
              setError(null);
            }}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
          >
            {patients.map(p => (
              <option key={p.bedId} value={p.rut}>
                {p.label} — {p.patientName} ({p.rut})
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleSearch}
          disabled={!selectedRut || isLoading}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 px-4 py-2 text-[13px] font-semibold text-white shadow-md shadow-violet-600/25 transition-all hover:from-violet-600 hover:to-violet-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Buscar
        </button>
      </div>

      {/* Patient banner */}
      {selectedPatient && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50/80 via-violet-50/40 to-transparent px-4 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
            <UserRound size={14} />
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
            <span className="font-semibold text-slate-700">{selectedPatient.patientName}</span>
            <span className="text-slate-400">|</span>
            <span className="font-mono text-slate-500">{selectedPatient.rut}</span>
            {selectedPatient.diagnosis && (
              <>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500 truncate max-w-[200px]">
                  {selectedPatient.diagnosis}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 size={28} className="animate-spin text-violet-500 mb-3" />
          <p className="text-[13px] text-slate-400">Consultando sistema de imagenología...</p>
          <p className="text-[11px] text-slate-300 mt-1">Esto puede tomar unos segundos</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {result && !isLoading && (
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">
            {result.examenes.length} exámenes encontrados
          </p>
          {result.examenes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Radio size={28} className="text-slate-200 mb-2" />
              <p className="text-[13px] text-slate-400">
                No se encontraron exámenes para este paciente
              </p>
            </div>
          ) : (
            result.examenes.map((exam, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm ring-1 ring-black/[0.02] transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="text-[13px] font-semibold text-slate-700">
                      {exam.nombre_examen || 'Examen sin nombre'}
                    </h4>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-400">
                      {exam.fecha_examen && <span>Fecha: {exam.fecha_examen}</span>}
                      {exam.mod && <span>Mod: {exam.mod}</span>}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      (exam.estado || '').toLowerCase() === 'validado'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                        : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                    }`}
                  >
                    {exam.estado || 'Sin estado'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {exam.pdf_url && (
                    <a
                      href={exam.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
                    >
                      <FileText size={12} />
                      Ver PDF
                    </a>
                  )}
                  {exam.dicom_url && (
                    <a
                      href={exam.dicom_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-medium text-violet-700 transition-colors hover:bg-violet-100"
                    >
                      <Monitor size={12} />
                      Ver DICOM
                    </a>
                  )}
                  {!exam.pdf_url && !exam.dicom_url && (
                    <span className="text-[11px] text-slate-400 italic">
                      Sin acciones disponibles
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Initial empty state */}
      {!result && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
            <Radio size={26} />
          </span>
          <p className="text-[13px] font-medium text-slate-400">Selecciona un paciente y busca</p>
          <p className="text-[11px] text-slate-300 mt-0.5">
            Los exámenes del RIS MMRAD se mostrarán aquí
          </p>
        </div>
      )}
    </BaseModal>
  );
};
