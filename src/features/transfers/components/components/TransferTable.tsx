/**
 * Transfer Table Component
 * Displays list of transfer requests with actions
 */

import React, { useEffect, useState } from 'react';
import { TransferRequest, TransferStatus } from '@/types/transfers';
import { TransferStatusInteraction } from './TransferStatusInteraction';
// import { calculateDaysElapsed } from '@/constants/transferConstants';
import { FileDown, Eye, Undo2, Archive, Trash2, XCircle } from 'lucide-react';
import clsx from 'clsx';

interface TransferTableProps {
  transfers: TransferRequest[];
  onEdit: (transfer: TransferRequest) => void;
  onStatusChange: (transfer: TransferRequest) => void;
  onQuickStatusChange: (transfer: TransferRequest, newStatus: TransferStatus) => Promise<void>;
  onMarkTransferred: (transfer: TransferRequest) => void;
  onCancel: (transfer: TransferRequest) => void;
  onGenerateDocs: (transfer: TransferRequest) => void;
  onViewDocs: (transfer: TransferRequest) => void;
  onUndo: (transfer: TransferRequest) => void;
  onArchive: (transfer: TransferRequest) => void;
  onDelete: (transfer: TransferRequest) => Promise<void>;
  onDeleteHistoryEntry: (transfer: TransferRequest, historyIndex: number) => Promise<void>;
}

export const TransferTable: React.FC<TransferTableProps> = ({
  transfers,
  onEdit,
  onStatusChange: _onStatusChange,
  onQuickStatusChange,
  onMarkTransferred: _onMarkTransferred,
  onCancel,
  onGenerateDocs,
  onViewDocs,
  onUndo,
  onArchive,
  onDelete,
  onDeleteHistoryEntry,
}) => {
  if (transfers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No hay solicitudes de traslado para este período
      </div>
    );
  }

  const isActive = (status: string) =>
    status !== 'TRANSFERRED' &&
    status !== 'CANCELLED' &&
    status !== 'REJECTED' &&
    status !== 'NO_RESPONSE';
  const isTransferred = (status: string) => status === 'TRANSFERRED';
  const [openActionsMenu, setOpenActionsMenu] = useState<{
    transfer: TransferRequest;
    top: number;
    left: number;
  } | null>(null);
  const [pendingDeleteTransfer, setPendingDeleteTransfer] = useState<TransferRequest | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-transfer-actions-root="true"]')) {
        setOpenActionsMenu(null);
      }
    };
    const closeMenu = () => setOpenActionsMenu(null);

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, []);

  const handleDeleteTransfer = async (transfer: TransferRequest) => {
    await onDelete(transfer);
    setPendingDeleteTransfer(null);
    setOpenActionsMenu(null);
  };

  return (
    <div className="overflow-x-auto overflow-y-visible bg-white rounded-lg shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cama
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Paciente (RUT)
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Diagnóstico
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hospital Destino
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha Solicitud
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transfers.map(transfer => (
            <tr
              key={transfer.id}
              className={`hover:bg-gray-50 ${!isActive(transfer.status) ? 'opacity-60' : ''}`}
            >
              <td className="px-4 py-3 whitespace-nowrap">
                <TransferStatusInteraction
                  transfer={transfer}
                  onStatusChange={status => onQuickStatusChange(transfer, status)}
                  onDeleteHistoryEntry={idx => onDeleteHistoryEntry(transfer, idx)}
                />
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                {transfer.bedId.replace('BED_', '')}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {transfer.patientSnapshot.name}
                </div>
                <div className="text-xs text-gray-500">({transfer.patientSnapshot.rut})</div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                {transfer.patientSnapshot.diagnosis}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                <div>{transfer.destinationHospital}</div>
                {/* Hide Edit link for transferred patients */}
                {isActive(transfer.status) && (
                  <button
                    onClick={() => onEdit(transfer)}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-medium underline mt-0.5 block"
                  >
                    Editar
                  </button>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {new Date(transfer.requestDate).toLocaleDateString('es-CL')}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                <div className="flex items-center gap-2">
                  {/* Active transfers: show full action set */}
                  {isActive(transfer.status) && (
                    <>
                      <button
                        onClick={() => onGenerateDocs(transfer)}
                        className={clsx(
                          'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all',
                          transfer.questionnaireResponses
                            ? 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100'
                            : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200'
                        )}
                        title={
                          transfer.questionnaireResponses
                            ? 'Seguir editando datos'
                            : 'Preparar datos para documentos'
                        }
                      >
                        <FileDown size={14} />
                        {transfer.questionnaireResponses ? 'Editar' : 'Preparar documentos'}
                      </button>

                      {transfer.questionnaireResponses && (
                        <button
                          onClick={() => onViewDocs(transfer)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-all shadow-sm"
                          title="Ver documentos generados"
                        >
                          <Eye size={14} /> Ver documentos
                        </button>
                      )}
                    </>
                  )}

                  {/* Transferred patients: show Undo and Archive only */}
                  {isTransferred(transfer.status) && (
                    <>
                      <button
                        onClick={() => onUndo(transfer)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-all"
                        title="Deshacer traslado (volver a estado anterior)"
                      >
                        <Undo2 size={14} /> Deshacer
                      </button>
                      <button
                        onClick={() => onArchive(transfer)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-all"
                        title="Archivar (quitar de la lista)"
                      >
                        <Archive size={14} /> Archivar
                      </button>
                    </>
                  )}

                  <div className="relative" data-transfer-actions-root="true">
                    <button
                      onClick={event => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        const menuWidth = 280;
                        const targetLeft = Math.max(
                          12,
                          Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12)
                        );
                        const isSame = openActionsMenu?.transfer.id === transfer.id;
                        setOpenActionsMenu(
                          isSame
                            ? null
                            : {
                                transfer,
                                top: rect.bottom + 8,
                                left: targetLeft,
                              }
                        );
                      }}
                      className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                      title="Opciones de cierre"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {openActionsMenu && (
        <div
          data-transfer-actions-root="true"
          className="fixed z-[9999] w-[280px] rounded-lg border border-slate-200 bg-white shadow-lg p-1.5"
          style={{ top: openActionsMenu.top, left: openActionsMenu.left }}
        >
          <button
            onClick={() => {
              if (!isActive(openActionsMenu.transfer.status)) {
                return;
              }
              onCancel(openActionsMenu.transfer);
              setOpenActionsMenu(null);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-orange-700 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!isActive(openActionsMenu.transfer.status)}
            title={
              isActive(openActionsMenu.transfer.status)
                ? 'Cancelar traslado con justificación'
                : 'Solo disponible para solicitudes activas'
            }
          >
            <XCircle size={14} />
            <span>
              Cancelar traslado{' '}
              <span className="text-[10px] font-normal text-slate-400">(Justificar)</span>
            </span>
          </button>
          <button
            onClick={() => {
              setPendingDeleteTransfer(openActionsMenu.transfer);
              setOpenActionsMenu(null);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-red-700 hover:bg-red-50"
          >
            <Trash2 size={14} />
            <span>
              Eliminar solicitud{' '}
              <span className="text-[10px] font-normal text-slate-400">(Error de generación)</span>
            </span>
          </button>
        </div>
      )}
      {pendingDeleteTransfer && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Eliminar solicitud</h3>
            <p className="mt-2 text-sm text-slate-600">
              ¿Eliminar definitivamente la solicitud de{' '}
              <span className="font-semibold text-slate-800">
                {pendingDeleteTransfer.patientSnapshot.name}
              </span>
              ? Esta acción no se puede deshacer.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setPendingDeleteTransfer(null)}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  void handleDeleteTransfer(pendingDeleteTransfer);
                }}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
