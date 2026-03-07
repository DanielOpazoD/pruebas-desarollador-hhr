export interface AnalyticsPresentationCopy {
  periodOccupancyTitle: string;
  periodOccupancySubtitle: string;
  currentSnapshotTitle: string;
  currentOccupancyLabel: string;
}

export const DEFAULT_ANALYTICS_PRESENTATION_COPY: AnalyticsPresentationCopy = {
  periodOccupancyTitle: 'Ocupación del período',
  periodOccupancySubtitle: 'Promedio del rango seleccionado',
  currentSnapshotTitle: 'Situación actual',
  currentOccupancyLabel: 'Ocupación Actual',
};

export const resolveAnalyticsPresentationCopy = (): AnalyticsPresentationCopy =>
  DEFAULT_ANALYTICS_PRESENTATION_COPY;
