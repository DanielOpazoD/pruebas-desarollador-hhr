import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { HandoffSaveDropdown } from '@/components/layout/date-strip/actions/HandoffSaveDropdown';

describe('HandoffSaveDropdown', () => {
  it('runs local export first and then triggers firebase backup when clicking "Descarga local"', () => {
    const onExportPDF = vi.fn();
    const onBackupPDF = vi.fn().mockResolvedValue(undefined);

    render(
      <HandoffSaveDropdown
        onExportPDF={onExportPDF}
        onBackupPDF={onBackupPDF}
        isArchived={false}
        isBackingUp={false}
      />
    );

    fireEvent.click(screen.getByTitle('Opciones de guardado (PDF/Nube)'));
    fireEvent.click(screen.getByText('Descarga local'));

    expect(onExportPDF).toHaveBeenCalledTimes(1);
    expect(onBackupPDF).toHaveBeenCalledTimes(1);
    expect(onBackupPDF).toHaveBeenCalledWith(true);
    expect(onExportPDF.mock.invocationCallOrder[0]).toBeLessThan(
      onBackupPDF.mock.invocationCallOrder[0]
    );
  });

  it('runs only firebase backup when clicking "Respaldo en Firebase"', async () => {
    const onExportPDF = vi.fn();
    const onBackupPDF = vi.fn().mockResolvedValue(undefined);

    render(
      <HandoffSaveDropdown
        onExportPDF={onExportPDF}
        onBackupPDF={onBackupPDF}
        isArchived={false}
        isBackingUp={false}
      />
    );

    fireEvent.click(screen.getByTitle('Opciones de guardado (PDF/Nube)'));
    fireEvent.click(screen.getByText('Respaldo en Firebase'));

    expect(onBackupPDF).toHaveBeenCalledTimes(1);
    expect(onBackupPDF).toHaveBeenCalledWith(false);
    expect(onExportPDF).not.toHaveBeenCalled();
  });
});
