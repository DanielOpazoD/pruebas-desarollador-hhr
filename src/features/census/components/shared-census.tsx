import React from 'react';
import clsx from 'clsx';
import type { StoredCensusFile } from '@/types/backupArtifacts';
import { formatFileSize } from '@/types/backupArtifacts';
import { buildSharedCensusFileCardModel } from '@/features/census/controllers/sharedCensusViewController';

interface SharedCensusDeniedStateProps {
  error: string | null;
}

export const SharedCensusDeniedState: React.FC<SharedCensusDeniedStateProps> = ({ error }) => (
  <div className="mx-auto max-w-2xl rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center">
    <h2 className="text-lg font-semibold text-rose-800">Acceso Denegado</h2>
    <p className="mt-2 text-sm text-rose-700">{error || 'No tienes acceso al censo compartido.'}</p>
  </div>
);

export const SharedCensusLoadingState: React.FC = () => (
  <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-slate-600">
    Cargando censo compartido...
  </div>
);

interface SharedCensusHeaderProps {
  accessDisplayName: string;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
}

export const SharedCensusHeader: React.FC<SharedCensusHeaderProps> = ({
  accessDisplayName,
  searchTerm,
  onSearchTermChange,
}) => (
  <header className="mx-auto mb-6 max-w-4xl rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Archivos de Censo Diario</h1>
        <p className="mt-1 text-sm text-slate-600">Acceso autorizado para {accessDisplayName}</p>
      </div>
      <label className="w-full max-w-sm">
        <span className="sr-only">Buscar archivo</span>
        <input
          value={searchTerm}
          onChange={event => onSearchTermChange(event.target.value)}
          placeholder="Buscar por nombre o fecha"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        />
      </label>
    </div>
  </header>
);

interface SharedCensusEmptyStateProps {
  hasSearchTerm: boolean;
}

export const SharedCensusEmptyState: React.FC<SharedCensusEmptyStateProps> = ({
  hasSearchTerm,
}) => (
  <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-600">
    {hasSearchTerm
      ? 'No se encontraron archivos con ese filtro.'
      : 'No hay archivos de censo disponibles.'}
  </div>
);

interface SharedCensusLoadErrorStateProps {
  loadError: string;
}

export const SharedCensusLoadErrorState: React.FC<SharedCensusLoadErrorStateProps> = ({
  loadError,
}) => (
  <div className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-amber-800">
    {loadError}
  </div>
);

interface SharedCensusFileCardProps {
  file: StoredCensusFile;
  canDownload: boolean;
  onViewFile: (file: StoredCensusFile) => void;
  onDownloadFile: (file: StoredCensusFile) => void;
}

export const SharedCensusFileCard: React.FC<SharedCensusFileCardProps> = ({
  file,
  canDownload,
  onViewFile,
  onDownloadFile,
}) => {
  const card = buildSharedCensusFileCardModel(file);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-slate-900">
            {card.monthName} {card.year}
          </div>
          <div
            className={clsx('mt-1 text-sm text-slate-500', card.isCurrentMonth && 'font-medium')}
          >
            {file.name}
          </div>
        </div>
        <div className="text-xs text-slate-500">{formatFileSize(file.size)}</div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onViewFile(file)}
          className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          Visualizar Censo
        </button>
        {canDownload && (
          <button
            type="button"
            onClick={() => onDownloadFile(file)}
            title="Descargar"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Descargar
          </button>
        )}
      </div>
    </article>
  );
};

export const SharedCensusFooter: React.FC = () => (
  <footer className="mx-auto mt-8 max-w-4xl text-center text-xs text-slate-500">
    Archivo compartido con acceso auditado.
  </footer>
);
