import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  AlertCircle,
  Info,
  ShieldCheck,
  FileJson,
  ChevronDown,
  Search,
  Wrench,
} from 'lucide-react';
import {
  exportMonthRecordsWithOutcome,
  exportYearToDateRecordsWithOutcome,
} from '@/services/admin/dataMaintenanceService';
import {
  auditAdmissionDateBackfill,
  applyAdmissionDateBackfill,
  type AdmissionDateBackfillResult,
} from '@/services/admin/admissionDateBackfillService';
import { DataImportModal } from './DataImportModal';
import clsx from 'clsx';

interface DataMaintenancePanelProps {
  onDailyExport?: () => void;
  onDailyImport?: () => void;
}

export const DataMaintenancePanel: React.FC<DataMaintenancePanelProps> = ({
  onDailyExport,
  onDailyImport,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportingScope, setExportingScope] = useState<'month' | 'year' | null>(null);
  const [isAuditingAdmissionDates, setIsAuditingAdmissionDates] = useState(false);
  const [isApplyingAdmissionDates, setIsApplyingAdmissionDates] = useState(false);
  const [admissionDateBackfillResult, setAdmissionDateBackfillResult] =
    useState<AdmissionDateBackfillResult | null>(null);
  const [admissionDateBackfillError, setAdmissionDateBackfillError] = useState<string | null>(null);
  const [backfillProgress, setBackfillProgress] = useState({ current: 0, total: 0 });

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
  ];

  const handleExport = async (scope: 'month' | 'year') => {
    setIsExporting(true);
    setExportingScope(scope);
    setExportError(null);
    setExportSuccess(false);
    try {
      const result =
        scope === 'month'
          ? await exportMonthRecordsWithOutcome(selectedYear, selectedMonth)
          : await exportYearToDateRecordsWithOutcome(selectedYear);

      if (result.status !== 'success' || !result.data) {
        setExportError(
          result.userSafeMessage || result.issues[0]?.message || 'No se pudo exportar.'
        );
        return;
      }

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 5000);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Error desconocido al exportar');
    } finally {
      setIsExporting(false);
      setExportingScope(null);
    }
  };

  const handleAuditAdmissionDates = async () => {
    setIsAuditingAdmissionDates(true);
    setAdmissionDateBackfillError(null);
    try {
      const result = await auditAdmissionDateBackfill();
      setAdmissionDateBackfillResult(result);
    } catch (err) {
      setAdmissionDateBackfillError(err instanceof Error ? err.message : 'No se pudo auditar.');
    } finally {
      setIsAuditingAdmissionDates(false);
    }
  };

  const handleApplyAdmissionDates = async () => {
    setIsApplyingAdmissionDates(true);
    setAdmissionDateBackfillError(null);
    setBackfillProgress({ current: 0, total: 0 });
    try {
      const result = await applyAdmissionDateBackfill((current, total) => {
        setBackfillProgress({ current, total });
      });
      setAdmissionDateBackfillResult(result);
    } catch (err) {
      setAdmissionDateBackfillError(
        err instanceof Error ? err.message : 'No se pudo aplicar la corrección.'
      );
    } finally {
      setIsApplyingAdmissionDates(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all flex flex-col">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
            <Download className="text-emerald-600" size={20} />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">Exportar Respaldo Mensual</h3>
          <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
            Selecciona el periodo y descarga todos los registros en un archivo JSON seguro.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">
                Año
              </label>
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                >
                  {years.map(y => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={14}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">
                Mes
              </label>
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                >
                  {months.map(m => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={14}
                />
              </div>
            </div>
          </div>

          <div className="mt-auto space-y-4">
            {exportError && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold border border-rose-100">
                <AlertCircle size={14} />
                {exportError}
              </div>
            )}
            {exportSuccess && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100">
                <ShieldCheck size={14} />
                Respaldo generado correctamente
              </div>
            )}
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => void handleExport('month')}
                disabled={isExporting}
                className={clsx(
                  'w-full py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg',
                  isExporting
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700 hover:scale-[1.02] active:scale-95'
                )}
              >
                {isExporting && exportingScope === 'month' ? (
                  <Database className="animate-spin" size={20} />
                ) : (
                  <FileJson size={20} />
                )}
                {isExporting && exportingScope === 'month'
                  ? 'Procesando...'
                  : 'Descargar mes en JSON'}
              </button>
              <button
                onClick={() => void handleExport('year')}
                disabled={isExporting}
                className={clsx(
                  'w-full py-3.5 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border',
                  isExporting
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300'
                )}
              >
                {isExporting && exportingScope === 'year' ? (
                  <Database className="animate-spin" size={18} />
                ) : (
                  <Download size={18} />
                )}
                {isExporting && exportingScope === 'year'
                  ? 'Procesando...'
                  : 'Descargar año hasta la fecha'}
              </button>
            </div>
          </div>
        </div>

        {/* Import Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all flex flex-col">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center mb-4">
            <Upload className="text-indigo-600" size={20} />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">Importar Respaldo Mensual</h3>
          <p className="text-[11px] text-slate-500 mb-6 leading-relaxed">
            Carga un archivo de respaldo generado anteriormente para restaurar los datos de un mes
            específico.
          </p>

          <div className="mt-auto">
            <button
              onClick={() => setShowImportModal(true)}
              className="w-full py-4 px-6 rounded-2xl bg-slate-900 font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-200 hover:bg-slate-800 hover:scale-[1.02] active:scale-95"
            >
              <Upload size={20} />
              Seleccionar Archivo
            </button>
          </div>
        </div>

        {/* Daily Backup - New Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all flex flex-col md:col-span-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <FileJson className="text-blue-600" size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 leading-none mb-1.5">
                  Respaldo de Seguridad Instantáneo
                </h3>
                <p className="text-[11px] text-slate-500 max-w-md">
                  Respalda o restaura el censo completo del día actual de forma rápida.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onDailyExport}
                className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
              >
                <Download size={16} />
                Exportar Día
              </button>
              <button
                onClick={onDailyImport}
                className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm flex items-center gap-2 hover:bg-slate-200 transition-all border border-slate-200"
              >
                <Upload size={16} />
                Importar día
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Admission Date Backfill */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Search className="text-amber-600" size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800 leading-none">
                Auditoría y corrección de fechas de ingreso
              </h3>
              <p className="text-[11px] text-slate-500 max-w-2xl leading-relaxed">
                Revisa el histórico y corrige{' '}
                <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-700">
                  admissionDate
                </code>{' '}
                cuando no coincide con la primera aparición del paciente en censo. La política usa
                la fecha de primera observación y la hora de ingreso si está disponible.
              </p>
              {admissionDateBackfillResult && (
                <div className="flex flex-wrap gap-2 pt-2 text-[11px] font-bold">
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    {admissionDateBackfillResult.scannedDays} días revisados
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    {admissionDateBackfillResult.reviewedEntries} casos evaluados
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                    {admissionDateBackfillResult.correctionCount} correcciones
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => void handleAuditAdmissionDates()}
              disabled={isAuditingAdmissionDates || isApplyingAdmissionDates}
              className={clsx(
                'px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all border',
                isAuditingAdmissionDates || isApplyingAdmissionDates
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50 hover:border-amber-300'
              )}
            >
              <Search size={16} />
              {isAuditingAdmissionDates ? 'Auditando...' : 'Auditar fechas'}
            </button>
            <button
              onClick={() => void handleApplyAdmissionDates()}
              disabled={
                isAuditingAdmissionDates ||
                isApplyingAdmissionDates ||
                !admissionDateBackfillResult ||
                admissionDateBackfillResult.correctionCount === 0
              }
              className={clsx(
                'px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md',
                isAuditingAdmissionDates ||
                  isApplyingAdmissionDates ||
                  !admissionDateBackfillResult ||
                  admissionDateBackfillResult.correctionCount === 0
                  ? 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed'
                  : 'bg-amber-600 text-white shadow-amber-100 hover:bg-amber-700'
              )}
            >
              <Wrench size={16} />
              {isApplyingAdmissionDates ? 'Corrigiendo...' : 'Aplicar correcciones'}
            </button>
          </div>
        </div>

        {isApplyingAdmissionDates && backfillProgress.total > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
              <span>Procesando corrección histórica</span>
              <span>
                {backfillProgress.current}/{backfillProgress.total}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{
                  width:
                    backfillProgress.total > 0
                      ? `${(backfillProgress.current / backfillProgress.total) * 100}%`
                      : '0%',
                }}
              />
            </div>
          </div>
        )}

        {admissionDateBackfillError && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold border border-rose-100">
            <AlertCircle size={14} />
            {admissionDateBackfillError}
          </div>
        )}

        {admissionDateBackfillResult && (
          <div className="mt-4 space-y-4">
            <div
              className={clsx(
                'rounded-2xl border p-4 text-sm',
                admissionDateBackfillResult.correctionCount > 0
                  ? 'bg-amber-50 border-amber-100 text-amber-900'
                  : 'bg-emerald-50 border-emerald-100 text-emerald-900'
              )}
            >
              <div className="font-bold mb-1">{admissionDateBackfillResult.userSafeMessage}</div>
              <div className="text-[11px] font-medium text-slate-600">
                Resultado: {admissionDateBackfillResult.outcome} · Registros tocados:{' '}
                {admissionDateBackfillResult.touchedRecords} · Aplicados:{' '}
                {admissionDateBackfillResult.appliedRecords}
                {admissionDateBackfillResult.failedRecords > 0
                  ? ` · Fallidos: ${admissionDateBackfillResult.failedRecords}`
                  : ''}
              </div>
            </div>

            {admissionDateBackfillResult.samples.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-3">
                  Muestras de corrección
                </h4>
                <div className="space-y-2">
                  {admissionDateBackfillResult.samples.map(sample => (
                    <div
                      key={`${sample.date}-${sample.bedId}-${sample.scope}-${sample.rut}`}
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-2 text-[11px]"
                    >
                      <div className="font-bold text-slate-700">
                        {sample.date} · {sample.patientName}
                        <span className="font-medium text-slate-400"> ({sample.bedName})</span>
                      </div>
                      <div className="text-slate-500">
                        {sample.previousAdmissionDate || 'sin fecha'} →{' '}
                        {sample.suggestedAdmissionDate}
                        {' · '}
                        FI {sample.firstSeenDate}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Warning Section */}
      <div className="bg-amber-50 border-2 border-amber-100 rounded-3xl p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <Info className="text-amber-600" size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-amber-900 mb-1">Información Importante</h4>
          <p className="text-xs text-amber-800 leading-relaxed">
            Estos archivos JSON contienen información clínica sensible. Deben ser almacenados en
            ubicaciones seguras y protegidas. Al importar, el sistema sincronizará automáticamente
            los datos con la base de datos central de Firebase, lo que actualizará la información
            para todos los usuarios.
          </p>
        </div>
      </div>

      {/* Modals */}
      <DataImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          // Could trigger a global refresh if needed
        }}
      />
    </div>
  );
};
