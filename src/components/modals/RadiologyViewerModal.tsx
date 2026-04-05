import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, FileText, Loader2, Monitor, Radio, Search } from 'lucide-react';
import clsx from 'clsx';
import { BaseModal } from '@/components/shared/BaseModal';
import {
  searchMMRADExams,
  type MMRADExam,
  type MMRADSearchResult,
} from '@/services/radiology/mmradService';

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

/** Extract unique modality codes from exams, sorted with CT first. */
const extractModalities = (exams: MMRADExam[]): string[] => {
  const mods = new Set<string>();
  for (const exam of exams) {
    const mod = (exam.mod || '').trim().toUpperCase();
    if (mod) mods.add(mod);
  }
  const sorted = Array.from(mods).sort((a, b) => {
    if (a === 'CT') return -1;
    if (b === 'CT') return 1;
    return a.localeCompare(b);
  });
  return sorted;
};

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
  const [progress, setProgress] = useState<{ pct: number; text: string } | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeModTab, setActiveModTab] = useState<string | null>(null);

  // Deduplicate patients by RUT
  const uniquePatients = useMemo(() => {
    const seen = new Set<string>();
    return patients.filter(p => {
      if (!p.rut || seen.has(p.rut)) return false;
      seen.add(p.rut);
      return true;
    });
  }, [patients]);

  // Modality tabs from results
  const modalities = useMemo(() => (result ? extractModalities(result.examenes) : []), [result]);

  // Filtered exams by active tab
  const filteredExams = useMemo(() => {
    if (!result) return [];
    if (!activeModTab) return result.examenes;
    return result.examenes.filter(e => (e.mod || '').trim().toUpperCase() === activeModTab);
  }, [result, activeModTab]);

  // Reset tab when results change
  React.useEffect(() => {
    if (result && modalities.length > 0) {
      // Default to CT if available, otherwise first modality
      setActiveModTab(modalities.includes('CT') ? 'CT' : null);
    } else {
      setActiveModTab(null);
    }
  }, [result, modalities]);

  /**
   * Simulated progress bar.
   */
  React.useEffect(() => {
    if (!isLoading) {
      if (progress) {
        setProgress({ pct: 100, text: '¡Completado!' });
        const timeout = setTimeout(() => setProgress(null), 600);
        return () => clearTimeout(timeout);
      }
      return;
    }

    const steps = [
      { pct: 10, text: 'Conectando con el servidor de imágenes...' },
      { pct: 30, text: 'Iniciando sesión en RIS MMRAD...' },
      { pct: 50, text: 'Buscando exámenes del paciente...' },
      { pct: 70, text: 'Extrayendo informes y enlaces...' },
      { pct: 85, text: 'Procesando resultados...' },
    ];

    let step = 0;
    setProgress({ pct: steps[0].pct, text: steps[0].text });
    step = 1;

    const interval = setInterval(() => {
      if (step < steps.length) {
        setProgress({ pct: steps[step].pct, text: steps[step].text });
        step++;
      } else {
        setProgress(prev =>
          prev && prev.pct < 95
            ? { pct: Math.min(prev.pct + 1, 95), text: 'Finalizando consulta...' }
            : prev
        );
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = useCallback(async () => {
    if (!selectedRut) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await searchMMRADExams({
        rut: selectedRut,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar exámenes');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRut, dateFrom, dateTo]);

  const setDatePreset = (preset: 'last-month' | 'last-year' | 'last-5-years') => {
    const today = new Date();
    const to = today.toISOString().split('T')[0];
    const from = new Date(today);
    if (preset === 'last-month') from.setMonth(from.getMonth() - 1);
    else if (preset === 'last-year') from.setFullYear(from.getFullYear() - 1);
    else from.setFullYear(from.getFullYear() - 5);
    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(to);
  };

  React.useEffect(() => {
    if (isOpen && initialPatientRut) {
      setSelectedRut(initialPatientRut);
      setResult(null);
      setError(null);
    }
  }, [isOpen, initialPatientRut]);

  if (!isOpen) return null;

  return (
    <>
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
            <span className="text-[15px] font-bold tracking-tight text-slate-800">
              Radiología / Imagenología
            </span>
          </span>
        }
      >
        {/* Controls */}
        <div className="mb-4 space-y-2">
          {/* Row 1: Patient + Search */}
          <div className="flex items-center gap-2">
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
                {uniquePatients.map(p => (
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

          {/* Row 2: Date range + presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar size={13} className="text-slate-400 shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[12px] text-slate-600 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/10"
              title="Fecha desde"
            />
            <span className="text-[10px] text-slate-400">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[12px] text-slate-600 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/10"
              title="Fecha hasta"
            />
            <div className="h-4 w-px bg-slate-200/60" />
            <button
              type="button"
              onClick={() => setDatePreset('last-month')}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Último mes
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('last-year')}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Último año
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('last-5-years')}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Últimos 5 años
            </button>
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {progress && (
          <div className="mb-4">
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-slate-200/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-[width] duration-500 ease-out"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
            <p className="mt-1.5 text-center text-[11px] text-slate-400">{progress.text}</p>
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
            {/* Modality tabs */}
            {modalities.length > 1 && (
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveModTab(null)}
                  className={clsx(
                    'rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all',
                    activeModTab === null
                      ? 'bg-violet-100 text-violet-800 ring-1 ring-violet-200/50 shadow-sm'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  )}
                >
                  Todos ({result.examenes.length})
                </button>
                {modalities.map(mod => {
                  const count = result.examenes.filter(
                    e => (e.mod || '').trim().toUpperCase() === mod
                  ).length;
                  return (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => setActiveModTab(mod)}
                      className={clsx(
                        'rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all',
                        activeModTab === mod
                          ? 'bg-violet-100 text-violet-800 ring-1 ring-violet-200/50 shadow-sm'
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                      )}
                    >
                      {mod} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">
              {filteredExams.length} exámenes
              {activeModTab ? ` · ${activeModTab}` : ''}
            </p>

            {filteredExams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Radio size={28} className="text-slate-200 mb-2" />
                <p className="text-[13px] text-slate-400">
                  No se encontraron exámenes
                  {activeModTab ? ` de tipo ${activeModTab}` : ''}
                </p>
              </div>
            ) : (
              filteredExams.map((exam, index) => {
                const isCR = (exam.mod || '').trim().toUpperCase() === 'CR';
                return (
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
                          {exam.mod && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-500">
                              {exam.mod}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Hide status badge for CR (always "por informar") */}
                      {!isCR && exam.estado && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            exam.estado.toLowerCase() === 'validado'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                              : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                          }`}
                        >
                          {exam.estado}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
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
                          Visualizador DICOM HTML5
                        </a>
                      )}
                      {!exam.pdf_url && !exam.dicom_url && (
                        <span className="text-[11px] text-slate-400 italic">
                          Sin acciones disponibles
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
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
    </>
  );
};
