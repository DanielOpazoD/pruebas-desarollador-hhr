/**
 * Transfer Management View
 * Main view for managing patient transfer requests
 */

import React, { useMemo, useState } from 'react';
import { TransferTable } from './components/TransferTable';
import { TransferFormModal } from './components/TransferFormModal';
import { StatusChangeModal } from './components/StatusChangeModal';
import { ConfirmTransferModal } from './components/ConfirmTransferModal';
import { CancelTransferModal } from './components/CancelTransferModal';
import { useTransferManagement } from '@/hooks/useTransferManagement';
import { useTransferViewStates } from '@/hooks/useTransferViewStates';
import { useDailyRecordData } from '@/context/DailyRecordContext';
import { getHospitalConfigById } from '@/constants/hospitalConfigs';
import type { TransferRequest, TransferStatus } from '@/types/transfers';

const TransferQuestionnaireModal = React.lazy(() =>
  import('./components/TransferQuestionnaireModal').then(module => ({
    default: module.TransferQuestionnaireModal,
  }))
);

const TransferDocumentPackageModal = React.lazy(() =>
  import('./components/TransferDocumentPackageModal').then(module => ({
    default: module.TransferDocumentPackageModal,
  }))
);

export const TransferManagementView: React.FC = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

  const {
    transfers,
    isLoading,
    error,
    createTransfer,
    updateTransfer,
    advanceStatus,
    setTransferStatus,
    markAsTransferred,
    cancelTransfer,
    deleteTransfer,
    undoTransfer,
    archiveTransfer,
    deleteHistoryEntry,
    getHospitalizedPatients,
  } = useTransferManagement();

  const { record } = useDailyRecordData();

  const {
    modals,
    selectedTransfer,
    selectedHospitalId,
    isGenerating,
    generatedDocs,
    patientDataForDocs,
    handlers,
  } = useTransferViewStates(
    record,
    updateTransfer,
    createTransfer,
    advanceStatus,
    markAsTransferred,
    cancelTransfer
  );

  const monthLabels = useMemo(
    () => ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    []
  );

  const closedStatuses = useMemo<Set<TransferStatus>>(
    () => new Set<TransferStatus>(['TRANSFERRED', 'CANCELLED', 'REJECTED', 'NO_RESPONSE']),
    []
  );

  const parseDate = (value: string | undefined): Date | null => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const selectedPeriodStart = useMemo(
    () => new Date(selectedYear, selectedMonth - 1, 1, 0, 0, 0, 0),
    [selectedYear, selectedMonth]
  );
  const selectedPeriodEnd = useMemo(
    () => new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999),
    [selectedYear, selectedMonth]
  );

  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);
    transfers.forEach(transfer => {
      const requestDate = parseDate(transfer.requestDate);
      if (requestDate) years.add(requestDate.getFullYear());
      const latestStatusDate = parseDate(transfer.statusHistory.at(-1)?.timestamp);
      if (latestStatusDate) years.add(latestStatusDate.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [currentYear, transfers]);

  const filteredTransfers = useMemo<TransferRequest[]>(() => {
    return transfers
      .filter(transfer => {
        const requestDate = parseDate(transfer.requestDate);
        if (!requestDate) {
          return false;
        }

        const isClosed = closedStatuses.has(transfer.status);
        if (!isClosed) {
          // Active/intermediate requests must carry over to following months.
          return requestDate <= selectedPeriodEnd;
        }

        const requestInPeriod =
          requestDate >= selectedPeriodStart && requestDate <= selectedPeriodEnd;
        const latestStatusDate = parseDate(transfer.statusHistory.at(-1)?.timestamp);
        const closedInPeriod = latestStatusDate
          ? latestStatusDate >= selectedPeriodStart && latestStatusDate <= selectedPeriodEnd
          : false;

        return requestInPeriod || closedInPeriod;
      })
      .sort((a, b) => b.requestDate.localeCompare(a.requestDate));
  }, [closedStatuses, selectedPeriodEnd, selectedPeriodStart, transfers]);

  const filteredActiveCount = useMemo(
    () => filteredTransfers.filter(transfer => !closedStatuses.has(transfer.status)).length,
    [closedStatuses, filteredTransfers]
  );

  return (
    <div className="p-4 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Traslados</h1>
          <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full shadow-sm">
            {filteredActiveCount} activos
          </span>
        </div>
        <button
          onClick={handlers.handleNewRequest}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 text-sm font-bold shadow-lg shadow-blue-100 active:scale-95"
        >
          <span className="text-lg">+</span>
          Nueva Solicitud
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-3 animate-in slide-in-from-top-2">
          <span className="font-bold">⚠️ Error:</span> {error}
        </div>
      )}

      <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {availableYears.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                selectedYear === year
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-6 gap-1.5 md:grid-cols-12">
          {monthLabels.map((label, index) => {
            const monthValue = index + 1;
            return (
              <button
                key={label}
                onClick={() => setSelectedMonth(monthValue)}
                className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-all ${
                  selectedMonth === monthValue
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-visible">
        {isLoading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400 font-medium tracking-tight">Cargando solicitudes...</p>
          </div>
        ) : (
          <TransferTable
            transfers={filteredTransfers}
            onEdit={handlers.handleEditTransfer}
            onStatusChange={handlers.handleStatusChange}
            onQuickStatusChange={setTransferStatus}
            onMarkTransferred={handlers.handleMarkTransferred}
            onCancel={handlers.handleCancel}
            onGenerateDocs={handlers.handleGenerateDocs}
            onViewDocs={handlers.handleViewDocs}
            onUndo={undoTransfer}
            onArchive={archiveTransfer}
            onDelete={transfer => deleteTransfer(transfer.id)}
            onDeleteHistoryEntry={deleteHistoryEntry}
          />
        )}
      </div>

      {/* Modals Orchestration */}
      {modals.form && (
        <TransferFormModal
          transfer={selectedTransfer}
          patients={getHospitalizedPatients()}
          onClose={handlers.handleCloseFormModal}
          onSave={handlers.handleSave}
        />
      )}

      {modals.status && selectedTransfer && (
        <StatusChangeModal
          transfer={selectedTransfer}
          onClose={handlers.handleCloseStatusModal}
          onConfirm={handlers.handleConfirmStatusChange}
        />
      )}

      {modals.transfer && selectedTransfer && (
        <ConfirmTransferModal
          transfer={selectedTransfer}
          onClose={handlers.handleCloseTransferModal}
          onConfirm={handlers.handleConfirmTransfer}
        />
      )}

      {modals.cancel && selectedTransfer && (
        <CancelTransferModal
          transfer={selectedTransfer}
          onClose={handlers.handleCloseCancelModal}
          onConfirm={handlers.handleConfirmCancel}
        />
      )}

      {modals.questionnaire && selectedTransfer && (
        <React.Suspense fallback={null}>
          <TransferQuestionnaireModal
            isOpen={modals.questionnaire}
            hospital={getHospitalConfigById(selectedHospitalId)!}
            patientData={{
              patientName: selectedTransfer.patientSnapshot.name,
              rut: selectedTransfer.patientSnapshot.rut,
              admissionDate: selectedTransfer.patientSnapshot.admissionDate,
              diagnosis: selectedTransfer.patientSnapshot.diagnosis,
              bedName: selectedTransfer.bedId.replace('BED_', ''),
              bedType: 'Básica',
              isUPC: false,
              originHospital: 'Hospital Hanga Roa',
            }}
            onClose={handlers.handleCloseQuestionnaire}
            initialResponses={selectedTransfer.questionnaireResponses}
            onComplete={handlers.handleQuestionnaireComplete}
          />
        </React.Suspense>
      )}

      {modals.package && selectedTransfer && patientDataForDocs && (
        <React.Suspense fallback={null}>
          <TransferDocumentPackageModal
            isOpen={modals.package}
            hospital={getHospitalConfigById(selectedHospitalId)!}
            patientData={patientDataForDocs}
            documents={generatedDocs}
            onClose={handlers.handleClosePackageModal}
          />
        </React.Suspense>
      )}

      {/* Processing Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white px-10 py-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-5 border border-white">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="font-black text-slate-800 text-lg tracking-tight">
                Preparando documentos
              </p>
              <p className="text-sm text-slate-400 font-medium">Esto puede tomar unos segundos</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferManagementView;
