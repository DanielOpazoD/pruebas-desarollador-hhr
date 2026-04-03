/**
 * ExamRequestModal Component
 *
 * Modularized laboratory exam request form with print functionality.
 * Uses extracted components and hooks for better maintainability.
 * Premium aesthetic matching MedicalIndicationsDialog style.
 *
 * @see /docs/LABORATORY_FORM_GUIDE.md for design specifications
 */

import React from 'react';
import { Printer, ClipboardList, FlaskConical, UserRound } from 'lucide-react';
import { PatientData } from '@/types/domain/patient';
import { BaseModal } from '@/components/shared/BaseModal';
import { EXAM_CATEGORIES } from '@/constants/examCategories';
import { useExamRequest } from '@/hooks/useExamRequest';
import {
  ExamCheckbox,
  ExamFormHeader,
  ExamPatientInfo,
  ExamMetadata,
} from '@/components/exam-request';

// Print styles - must match original working version
const PRINT_STYLES = `
@media print {
    @page {
        margin: 0;
    }

    html, body {
        height: auto !important;
        overflow: visible !important;
    }

    body > * {
        display: none !important;
    }

    body > div[role="dialog"] {
        display: block !important;
        visibility: visible !important;
        position: relative !important;
    }

    div[role="dialog"],
    div[role="dialog"] > div {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        background: transparent !important;
    }

    div[role="dialog"] {
        background: white !important;
        padding: 0 !important;
        margin: 0 !important;
        height: auto !important;
        overflow: visible !important;
        backdrop-filter: none !important;
        animation: none !important;
    }

    div[role="dialog"] > div {
        display: block !important;
        position: static !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: none !important;
        border: none !important;
        box-shadow: none !important;
        background: white !important;
        border-radius: 0 !important;
        animation: none !important;
    }

    div[role="dialog"] > div > div:first-child,
    #modal-title,
    div[role="dialog"] h3,
    div[role="dialog"] button,
    div[role="dialog"] .sticky,
    .modal-header,
    .print\\:hidden {
        display: none !important;
        height: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        overflow: hidden !important;
        visibility: hidden !important;
        opacity: 0 !important;
    }

    div[role="dialog"] .overflow-y-auto,
    div[role="dialog"] .p-6 {
        padding: 0 !important;
        margin: 0 !important;
        overflow: visible !important;
        max-height: none !important;
        width: 100% !important;
    }
    /* 7. The Form itself */
    #exam-request-form {
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 10mm !important;
        border: none !important;
        box-shadow: none !important;
        color: black !important;
    }

    /* 8. Selection Marks forcing */
    .font-bold {
        color: black !important;
        -webkit-print-color-adjust: exact !important;
    }

    /* Support for colors and icons */
    * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
}
`;

interface ExamRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientData;
}

export const ExamRequestModal: React.FC<ExamRequestModalProps> = ({ isOpen, onClose, patient }) => {
  const {
    selectedExams,
    procedencia,
    prevision,
    setProcedencia,
    setPrevision,
    toggleExam,
    handlePrint,
  } = useExamRequest({ patient, isOpen });

  const renderExamItem = (exam: string, categoryTitle: string) => (
    <ExamCheckbox
      key={`${categoryTitle}|${exam}`}
      exam={exam}
      categoryTitle={categoryTitle}
      isSelected={selectedExams.has(`${categoryTitle}|${exam}`)}
      onToggle={toggleExam}
    />
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      printable={true}
      title={
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-500/20">
            <FlaskConical size={16} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[15px] font-bold tracking-tight text-slate-800">
              Solicitud de Laboratorio
            </span>
            <span className="text-[11px] font-medium text-slate-400">{patient.patientName}</span>
          </span>
        </span>
      }
      size="full"
      variant="white"
      className="!rounded-2xl ring-1 ring-black/[0.03]"
      bodyClassName="max-h-[90vh] overflow-y-auto px-5 py-4"
      headerActions={
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-4 py-2 text-[13px] font-semibold text-white shadow-md shadow-emerald-600/25 transition-all hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg hover:shadow-emerald-600/30 active:scale-[0.98] print:hidden"
        >
          <Printer size={14} />
          Imprimir
        </button>
      }
    >
      {/* Patient info banner */}
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50/80 via-emerald-50/40 to-transparent px-4 py-3 print:hidden">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <UserRound size={16} />
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
          <span className="font-semibold text-slate-700">{patient.patientName}</span>
          {patient.rut && (
            <>
              <span className="text-slate-400">|</span>
              <span className="text-slate-500">{patient.rut}</span>
            </>
          )}
          {patient.pathology && (
            <>
              <span className="text-slate-400">|</span>
              <span className="max-w-[260px] truncate text-slate-500" title={patient.pathology}>
                {patient.pathology}
              </span>
            </>
          )}
          {patient.bedName && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              {patient.bedName}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* PDF Replica Container */}
        <div
          id="exam-request-form"
          className="bg-white p-2 border border-slate-300 shadow-sm mx-auto max-w-[800px] font-sans text-slate-900 print:p-0 print:border-none print:shadow-none print:m-0 print:max-w-none"
        >
          <ExamFormHeader />
          <ExamMetadata
            procedencia={procedencia}
            prevision={prevision}
            onProcedenciaChange={setProcedencia}
            onPrevisionChange={setPrevision}
          />
          <ExamPatientInfo patient={patient} />

          {/* Exams Grid */}
          <div className="grid grid-cols-12 border-2 border-slate-900 rounded-lg overflow-hidden min-h-[480px]">
            {/* Column 1: Bioquimica */}
            <div className="col-span-4 border-r-2 border-slate-900 flex flex-col">
              <div className="bg-white border-b-2 border-slate-900 text-slate-900 py-0.5 text-center flex flex-col items-center">
                <span className="text-[9px] font-black tracking-widest uppercase">
                  {EXAM_CATEGORIES[0].name}
                </span>
                <span className="text-[6px] text-slate-500 font-bold">
                  ({EXAM_CATEGORIES[0].tube})
                </span>
              </div>
              <div className="p-2 flex flex-col gap-0.5 flex-1">
                {EXAM_CATEGORIES[0].exams.map(exam =>
                  renderExamItem(exam, EXAM_CATEGORIES[0].name)
                )}
              </div>
              <div className="bg-white border-t border-slate-300 p-2">
                <span className="text-[8px] font-black text-slate-400 uppercase block mb-1 underline">
                  TUBO VERDE
                </span>
                {renderExamItem('ELECTROLITOS PLASMATICOS', 'TUBO VERDE')}
                {renderExamItem('LACTATO', 'TUBO VERDE')}
              </div>
            </div>

            {/* Column 2: Hematologia, Coagulacion, Microbiologicos */}
            <div className="col-span-4 border-r-2 border-slate-900 flex flex-col">
              <div className="bg-white border-b-2 border-slate-900 text-slate-900 py-0.5 text-center flex flex-col items-center">
                <span className="text-[9px] font-black tracking-widest uppercase">
                  {EXAM_CATEGORIES[1].name}
                </span>
                <span className="text-[6px] text-slate-500 font-bold">
                  ({EXAM_CATEGORIES[1].tube})
                </span>
              </div>
              <div className="p-1 flex flex-col gap-0.5">
                <div className="grid grid-cols-2 gap-x-2">
                  {EXAM_CATEGORIES[1].exams.map(exam =>
                    renderExamItem(exam, EXAM_CATEGORIES[1].name)
                  )}
                </div>
              </div>

              <div className="bg-white border-b-2 border-t-2 border-slate-900 text-slate-900 py-0.5 text-center flex flex-col items-center">
                <span className="text-[9px] font-black tracking-widest uppercase">
                  {EXAM_CATEGORIES[2].name}
                </span>
                <span className="text-[6px] text-slate-500 font-bold">
                  ({EXAM_CATEGORIES[2].tube})
                </span>
              </div>
              <div className="p-2 flex flex-col gap-0.5">
                {EXAM_CATEGORIES[2].exams.map(exam =>
                  renderExamItem(exam, EXAM_CATEGORIES[2].name)
                )}
              </div>

              <div className="bg-white border-t-2 border-b-2 border-slate-900 text-slate-900 p-1 text-center">
                <span className="text-[10px] font-black tracking-widest uppercase">
                  {EXAM_CATEGORIES[4].name}
                </span>
              </div>
              <div className="p-2 flex flex-col gap-0.5 flex-1 bg-slate-50/50">
                {EXAM_CATEGORIES[4].exams.map(exam =>
                  renderExamItem(exam, EXAM_CATEGORIES[4].name)
                )}
              </div>
            </div>

            {/* Column 3: Hormonas, Orina, Virologia */}
            <div className="col-span-4 flex flex-col">
              <div className="bg-white border-b-2 border-slate-900 text-slate-900 py-0.5 text-center flex flex-col items-center">
                <span className="text-[9px] font-black tracking-widest uppercase">
                  {EXAM_CATEGORIES[3].name}
                </span>
                <span className="text-[6px] text-slate-500 font-bold">
                  ({EXAM_CATEGORIES[3].tube})
                </span>
              </div>
              <div className="p-1 flex flex-col gap-0.5 border-b border-slate-200">
                {EXAM_CATEGORIES[3].exams.map(exam =>
                  renderExamItem(exam, EXAM_CATEGORIES[3].name)
                )}
              </div>

              <div className="bg-white border-t-2 border-b-2 border-slate-900 text-slate-900 py-0.5 text-center">
                <span className="text-[9px] font-black tracking-widest uppercase">
                  Orina / Parásitos
                </span>
              </div>
              <div className="p-2 flex flex-col gap-0.5 border-b border-slate-200">
                {EXAM_CATEGORIES[5].exams.map(exam =>
                  renderExamItem(exam, EXAM_CATEGORIES[5].name)
                )}
                <div className="h-px bg-slate-200 my-1"></div>
                {EXAM_CATEGORIES[6].exams.map(exam =>
                  renderExamItem(exam, EXAM_CATEGORIES[6].name)
                )}
              </div>

              <div className="bg-white border-t-2 border-b-2 border-slate-900 text-slate-900 py-0.5 text-center">
                <span className="text-[9px] font-black tracking-widest uppercase">
                  Virología / Otros
                </span>
              </div>
              <div className="p-2 flex flex-col gap-0.5 flex-1">
                {EXAM_CATEGORIES[7].exams.map(exam =>
                  renderExamItem(exam, EXAM_CATEGORIES[7].name)
                )}
                <div className="h-px bg-slate-200 my-1"></div>
                {EXAM_CATEGORIES[9].exams.map(exam =>
                  renderExamItem(exam, EXAM_CATEGORIES[9].name)
                )}
              </div>
            </div>
          </div>

          {/* Footer Section */}
          <div className="grid grid-cols-12 border-2 border-slate-900 rounded-lg mt-0.5 overflow-hidden">
            <div className="col-span-4 border-r-2 border-slate-900 flex flex-col">
              <div className="bg-white border-b-2 border-slate-900 text-slate-900 py-0.5 text-center flex flex-col items-center">
                <span className="text-[9px] font-black tracking-widest uppercase">
                  {EXAM_CATEGORIES[8].name}
                </span>
                <span className="text-[6px] text-slate-500 font-bold">
                  ({EXAM_CATEGORIES[8].tube})
                </span>
              </div>
              <div className="p-1 flex flex-col gap-0.5">
                {EXAM_CATEGORIES[8].exams.map(exam =>
                  renderExamItem(exam, EXAM_CATEGORIES[8].name)
                )}
              </div>
            </div>

            <div className="col-span-8 p-2 flex flex-col gap-4 justify-center">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-900 uppercase whitespace-nowrap">
                  OTROS:
                </span>
                <div className="flex-1 flex flex-col gap-3">
                  <div className="border-b border-slate-900 h-0.5 w-full"></div>
                  <div className="border-b border-slate-900 h-0.5 w-full"></div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-900 uppercase whitespace-nowrap">
                  MEDICO TRATANTE:
                </span>
                <div className="border-b border-slate-900 flex-1 h-0.5 mt-1"></div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-900 uppercase whitespace-nowrap">
                  FIRMA:
                </span>
                <div className="border-b border-slate-900 flex-1 h-0.5 mt-1"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium footer with actions */}
      <div className="mt-5 flex items-center justify-between print:hidden">
        <p className="text-[11px] text-slate-300">
          {selectedExams.size > 0 &&
            `${selectedExams.size} examen${selectedExams.size === 1 ? '' : 'es'} seleccionado${selectedExams.size === 1 ? '' : 's'}`}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:text-slate-700 active:scale-[0.98]"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-5 py-2 text-[13px] font-semibold text-white shadow-md shadow-emerald-600/25 transition-all hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg hover:shadow-emerald-600/30 active:scale-[0.98]"
          >
            <Printer size={14} />
            Imprimir Solicitud
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />
    </BaseModal>
  );
};
