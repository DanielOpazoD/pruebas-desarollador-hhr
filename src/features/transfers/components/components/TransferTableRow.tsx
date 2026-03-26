import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { hasTransferDocumentConfig } from '@/constants/hospitalConfigs';
import type {
  TransferFormData,
  TransferNote,
  TransferRequest,
  TransferStatus,
} from '@/types/transfers';
import type { UserRole } from '@/types/auth';
import { TransferStatusInteraction } from './TransferStatusInteraction';
import { TransferTableRowActions } from './TransferTableRowActions';
import {
  getTransferRowActionState,
  getTransferTableDateLabel,
  isTransferActiveStatus,
  type TransferTableMode,
} from '../controllers/transferTableController';
import { formatTransferDateTime } from '@/shared/transfers/transferPresentation';
import { useAuth } from '@/context/AuthContext';
import { buildTransferNote } from '@/hooks/controllers/transferManagementController';

interface TransferTableRowProps {
  transfer: TransferRequest;
  mode: TransferTableMode;
  role?: UserRole;
  onEdit: (transfer: TransferRequest) => void;
  onQuickStatusChange: (transfer: TransferRequest, newStatus: TransferStatus) => Promise<void>;
  onDeleteHistoryEntry: (transfer: TransferRequest, historyIndex: number) => Promise<void>;
  onGenerateDocs: (transfer: TransferRequest) => void;
  onViewDocs: (transfer: TransferRequest) => void;
  onUndo: (transfer: TransferRequest) => void;
  onArchive: (transfer: TransferRequest) => void;
  onUpdateTransfer: (transferId: string, data: Partial<TransferFormData>) => Promise<void>;
  onOpenCloseMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const TransferTableRow: React.FC<TransferTableRowProps> = ({
  transfer,
  mode,
  role,
  onEdit,
  onQuickStatusChange,
  onDeleteHistoryEntry,
  onGenerateDocs,
  onViewDocs,
  onUndo,
  onArchive,
  onUpdateTransfer,
  onOpenCloseMenu,
}) => {
  const { currentUser } = useAuth();
  const hasDocumentSupport = hasTransferDocumentConfig(transfer.destinationHospital);
  const isActiveRow = isTransferActiveStatus(transfer.status);
  const actionState = getTransferRowActionState(transfer, mode, hasDocumentSupport, role);
  const canManageNotes = role === 'admin' && mode === 'active';
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const sortedNotes = useMemo(
    () =>
      (transfer.transferNotes || [])
        .slice()
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [transfer.transferNotes]
  );

  const resetNoteEditor = () => {
    setIsComposerOpen(false);
    setNoteDraft('');
    setEditingNoteId(null);
    setEditingContent('');
  };

  const persistNotes = async (nextNotes: TransferNote[]) => {
    setIsSavingNote(true);
    try {
      await onUpdateTransfer(transfer.id, { transferNotes: nextNotes });
      resetNoteEditor();
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleCreateNote = async () => {
    const content = noteDraft.trim();
    if (!content) {
      return;
    }

    await persistNotes([
      ...(transfer.transferNotes || []),
      buildTransferNote(content, currentUser?.email || 'usuario-desconocido'),
    ]);
  };

  const handleEditStart = (note: TransferNote) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
    setIsComposerOpen(false);
  };

  const handleSaveEditedNote = async (noteId: string) => {
    const content = editingContent.trim();
    if (!content) {
      return;
    }

    await persistNotes(
      (transfer.transferNotes || []).map(note =>
        note.id === noteId
          ? {
              ...note,
              content,
            }
          : note
      )
    );
  };

  const handleDeleteNote = async (noteId: string) => {
    await persistNotes((transfer.transferNotes || []).filter(note => note.id !== noteId));
  };

  return (
    <tr className={`hover:bg-gray-50 ${!isActiveRow ? 'opacity-60' : ''}`}>
      <td className="px-4 py-3 align-top">
        <TransferStatusInteraction
          transfer={transfer}
          onStatusChange={status => onQuickStatusChange(transfer, status)}
          onDeleteHistoryEntry={idx => onDeleteHistoryEntry(transfer, idx)}
        />
      </td>
      <td className="px-4 py-3 align-top">
        <div className="text-sm font-semibold leading-snug text-gray-900 whitespace-normal break-words">
          {transfer.patientSnapshot.name}
        </div>
        <div className="mt-0.5 text-xs text-gray-500 whitespace-normal break-words">
          RUT: {transfer.patientSnapshot.rut}
        </div>
        <div className="mt-0.5 text-xs text-gray-500 whitespace-normal break-words">
          Cama: {transfer.bedId.replace('BED_', '')}
        </div>
        <div className="mt-1 text-sm text-gray-600 whitespace-normal break-words leading-snug">
          Dg: {transfer.patientSnapshot.diagnosis}
        </div>
      </td>
      <td className="px-4 py-3 align-top text-sm text-gray-500">
        <div className="flex items-start gap-1.5">
          <div className="min-w-0 whitespace-normal break-words leading-snug">
            {transfer.destinationHospital}
          </div>
          {actionState.canEditInline && (
            <button
              type="button"
              onClick={() => onEdit(transfer)}
              className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              title="Editar traslado"
            >
              <Pencil size={12} />
            </button>
          )}
        </div>
      </td>
      <td className="px-4 py-3 align-top text-sm text-gray-500 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span>{getTransferTableDateLabel(transfer.requestDate)}</span>
          {actionState.canEditInline && (
            <button
              type="button"
              onClick={() => onEdit(transfer)}
              className="inline-flex shrink-0 items-center justify-center rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              title="Modificar fecha de solicitud"
            >
              <Pencil size={12} />
            </button>
          )}
        </div>
      </td>
      <td className="px-4 py-3 align-top text-sm text-gray-500">
        <div className="space-y-2">
          {sortedNotes.length > 0
            ? sortedNotes.map(note => {
                const isEditing = editingNoteId === note.id;

                return (
                  <div key={note.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <div className="normal-case tracking-normal text-[11px] font-medium text-slate-500">
                          {formatTransferDateTime(note.createdAt)} ({note.createdBy})
                        </div>
                      </div>
                      {canManageNotes && !isEditing && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditStart(note)}
                            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                            title="Editar nota"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleDeleteNote(note.id);
                            }}
                            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-rose-100 hover:text-rose-700"
                            title="Eliminar nota"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={editingContent}
                          onChange={event => setEditingContent(event.target.value)}
                          rows={3}
                          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          aria-label={`Editar nota ${note.id}`}
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={resetNoteEditor}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-white"
                          >
                            <X size={12} /> Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={isSavingNote || !editingContent.trim()}
                            onClick={() => {
                              void handleSaveEditedNote(note.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-300"
                          >
                            <Save size={12} /> Guardar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 whitespace-normal break-words leading-snug text-slate-600">
                        {note.content}
                      </p>
                    )}
                  </div>
                );
              })
            : null}

          {canManageNotes && (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 p-2">
              {isComposerOpen ? (
                <div className="space-y-2">
                  <textarea
                    value={noteDraft}
                    onChange={event => setNoteDraft(event.target.value)}
                    rows={5}
                    placeholder="Agregar nota de coordinación, observación clínica o seguimiento."
                    className="w-full min-h-28 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    aria-label="Agregar nota"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={resetNoteEditor}
                      className="inline-flex items-center justify-center rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-white"
                      title="Cancelar nota"
                    >
                      <X size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={isSavingNote || !noteDraft.trim()}
                      onClick={() => {
                        void handleCreateNote();
                      }}
                      className="inline-flex items-center justify-center rounded-md bg-blue-600 p-2 text-white disabled:cursor-not-allowed disabled:bg-blue-300"
                      title="Guardar nota"
                    >
                      <Save size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingNoteId(null);
                    setEditingContent('');
                    setIsComposerOpen(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  <Plus size={12} /> {sortedNotes.length > 0 ? 'Agregar nota' : 'Ingresar nota'}
                </button>
              )}
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3 align-top text-sm">
        <TransferTableRowActions
          transfer={transfer}
          actionState={actionState}
          hasDocumentSupport={hasDocumentSupport}
          onGenerateDocs={onGenerateDocs}
          onViewDocs={onViewDocs}
          onUndo={onUndo}
          onArchive={onArchive}
          onOpenCloseMenu={onOpenCloseMenu}
        />
      </td>
    </tr>
  );
};
