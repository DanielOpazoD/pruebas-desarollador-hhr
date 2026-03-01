import React, { useState, useMemo, useCallback } from 'react';
import { FileDown, ShieldCheck } from 'lucide-react';
import {
  HospitalConfig,
  TransferQuestion,
  QuestionResponse,
  QuestionnaireResponse,
  TransferPatientData,
} from '@/types/transferDocuments';
import { questionGroups } from '@/constants/hospitalConfigs';
import clsx from 'clsx';
import { QuestionInput } from './QuestionInput';
import { BaseModal, ModalSection } from '@/components/shared/BaseModal';

interface TransferQuestionnaireModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospital: HospitalConfig;
  patientData: TransferPatientData;
  initialResponses?: QuestionnaireResponse;
  onComplete: (responses: QuestionnaireResponse) => void;
}

export const TransferQuestionnaireModal: React.FC<TransferQuestionnaireModalProps> = ({
  isOpen,
  onClose,
  hospital,
  patientData,
  initialResponses,
  onComplete,
}) => {
  // Group questions by category (templates)
  const groupedQuestions = useMemo(() => {
    const groups: Record<string, TransferQuestion[]> = {};

    hospital.templates.forEach(t => {
      if (t.enabled) {
        groups[t.id] = [];
      }
    });

    hospital.questions.forEach(q => {
      const group = q.group || 'general';
      if (!groups[group]) groups[group] = [];
      groups[group].push(q);
    });

    return Object.fromEntries(
      Object.entries(groups).filter(([key, qs]) => qs.length > 0 && key !== 'solicitud-ambulancia')
    );
  }, [hospital.questions, hospital.templates]);

  const groupKeys = Object.keys(groupedQuestions);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, QuestionResponse['value']>>(() => {
    const initial: Record<string, QuestionResponse['value']> = {};

    hospital.questions.forEach(q => {
      if (q.defaultValue !== undefined) {
        initial[q.id] = q.defaultValue;
      }
    });

    if (initialResponses?.responses) {
      initialResponses.responses.forEach(r => {
        initial[r.questionId] = r.value;
      });
    }

    return initial;
  });

  const [nurseName, setNurseName] = useState<string>(initialResponses?.completedBy || '');
  const [attendingPhysician, setAttendingPhysician] = useState<string>(
    initialResponses?.attendingPhysician || ''
  );
  const [diagnosis, setDiagnosis] = useState<string>(
    initialResponses?.diagnosis || patientData.diagnosis || ''
  );

  const currentGroup = groupKeys[currentGroupIndex];
  const currentQuestions = groupedQuestions[currentGroup] || [];
  const isIaasGroup = currentGroup === 'formulario-iaas';

  const isQuestionVisible = useCallback(
    (question: TransferQuestion): boolean => {
      if (!question.showIf) return true;
      const dependentValue = responses[question.showIf.questionId];
      return dependentValue === question.showIf.value;
    },
    [responses]
  );

  const visibleQuestions = currentQuestions.filter(isQuestionVisible);

  const handleChange = (questionId: string, value: QuestionResponse['value']) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const handleComplete = () => {
    const responseArray: QuestionResponse[] = Object.entries(responses).map(
      ([questionId, value]) => ({
        questionId,
        value,
      })
    );

    onComplete({
      responses: responseArray,
      completedAt: new Date().toISOString(),
      completedBy: nurseName.trim() || 'Enfermero/a de Turno',
      attendingPhysician: attendingPhysician.trim(),
      diagnosis: diagnosis.trim(),
    });
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div>
          <h2 className="text-base font-bold text-slate-800 leading-tight">
            Configuración de Documentos
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {hospital.name} • {patientData.patientName}
          </p>
        </div>
      }
      icon={<FileDown size={18} />}
      size="3xl"
      variant="white"
      headerIconColor="text-blue-600"
      bodyClassName={clsx(
        isIaasGroup ? 'p-4 space-y-4 max-h-[78vh]' : 'p-6 space-y-6 max-h-[70vh]'
      )}
    >
      <div className={clsx('space-y-6', isIaasGroup && 'space-y-4')}>
        {/* Meta Inputs Section */}
        <div
          className={clsx(
            'grid grid-cols-1 md:grid-cols-3 bg-slate-50 rounded-xl border border-slate-100',
            isIaasGroup ? 'gap-2 p-2.5' : 'gap-3 p-3'
          )}
        >
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
              Enfermero/a Responsable
            </label>
            <input
              type="text"
              value={nurseName}
              onChange={e => setNurseName(e.target.value)}
              placeholder="Nombre completo..."
              className={clsx(
                'w-full rounded-lg border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none',
                isIaasGroup ? 'px-3 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'
              )}
            />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
              Médico Tratante
            </label>
            <input
              type="text"
              value={attendingPhysician}
              onChange={e => setAttendingPhysician(e.target.value)}
              placeholder="Nombre del médico..."
              className={clsx(
                'w-full rounded-lg border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none',
                isIaasGroup ? 'px-3 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'
              )}
            />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
              Diagnóstico Específico
            </label>
            <input
              type="text"
              value={diagnosis}
              onChange={e => setDiagnosis(e.target.value)}
              placeholder="Confirmar diagnóstico..."
              className={clsx(
                'w-full rounded-lg border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none',
                isIaasGroup ? 'px-3 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'
              )}
            />
          </div>
        </div>

        {/* Tabs / Groups */}
        <div
          className={clsx(
            'flex flex-wrap items-center bg-slate-100/50 rounded-xl w-fit',
            isIaasGroup ? 'gap-1 p-0.5' : 'gap-1.5 p-1'
          )}
        >
          {groupKeys.map((group, index) => {
            const info = questionGroups[group as keyof typeof questionGroups] || { label: group };
            const isActive = index === currentGroupIndex;
            return (
              <button
                key={group}
                onClick={() => setCurrentGroupIndex(index)}
                className={clsx(
                  'rounded-lg text-[10px] font-black uppercase tracking-widest transition-all transition-all',
                  isIaasGroup ? 'px-3 py-1' : 'px-4 py-1.5',
                  isActive
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                )}
              >
                {info.label}
              </button>
            );
          })}
        </div>

        {/* Questions for current group */}
        <ModalSection
          title={questionGroups[currentGroup as keyof typeof questionGroups]?.label || currentGroup}
          icon={<ShieldCheck size={16} />}
          variant="info"
          className={clsx(isIaasGroup && 'p-3')}
        >
          <div
            className={clsx(
              'grid grid-cols-1 md:grid-cols-2 py-2',
              isIaasGroup ? 'gap-x-5 gap-y-2 py-1' : 'gap-x-8 gap-y-5'
            )}
          >
            {visibleQuestions.map(question => (
              <div
                key={question.id}
                className={clsx(
                  question.type === 'textarea' || question.type === 'multiselect'
                    ? 'md:col-span-2'
                    : ''
                )}
              >
                <QuestionInput
                  question={question}
                  value={responses[question.id]}
                  onChange={value => handleChange(question.id, value)}
                  density={isIaasGroup ? 'compact' : 'default'}
                />
              </div>
            ))}
          </div>
        </ModalSection>

        {/* Footer buttons */}
        <div
          className={clsx(
            'flex items-center justify-end gap-3 border-t border-slate-50',
            isIaasGroup ? 'pt-2' : 'pt-4'
          )}
        >
          <button
            onClick={onClose}
            className={clsx(
              'text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest transition-colors',
              isIaasGroup ? 'px-4 py-1.5 text-[11px]' : 'px-6 py-2.5'
            )}
          >
            Descartar
          </button>
          <button
            onClick={handleComplete}
            disabled={!nurseName.trim()}
            className={clsx(
              'flex items-center gap-2 rounded-xl font-black uppercase tracking-widest transition-all shadow-lg',
              isIaasGroup ? 'px-5 py-1.5 text-[11px]' : 'px-8 py-2.5 text-xs',
              nurseName.trim()
                ? 'bg-slate-900 text-white hover:bg-black shadow-slate-200'
                : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
            )}
          >
            <FileDown size={18} />
            Confirmar y Generar
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default TransferQuestionnaireModal;
