import React, { useEffect, useState } from 'react';
import { FilePlus, User } from 'lucide-react';
import { TransferRequest, TransferFormData } from '@/types/transfers';
import {
  DESTINATION_HOSPITALS,
  MEDICAL_SPECIALTIES,
  TRANSFER_BED_REQUIREMENTS,
  type DestinationHospitalOption,
} from '@/constants/transferConstants';
import { PatientSelector } from './PatientSelector';
import { BaseModal, ModalSection } from '@/components/shared/BaseModal';
import { defaultBrowserWindowRuntime } from '@/shared/runtime/browserWindowRuntime';
import { getDestinationHospitalCatalog } from '@/features/transfers/services/destinationHospitalCatalogService';

interface Patient {
  id: string;
  name: string;
  bedId: string;
  diagnosis: string;
}

interface TransferFormModalProps {
  transfer: TransferRequest | null;
  patients: Patient[];
  onClose: () => void;
  onSave: (data: TransferFormData) => Promise<void>;
}

export const TransferFormModal: React.FC<TransferFormModalProps> = ({
  transfer,
  patients,
  onClose,
  onSave,
}) => {
  const isEditing = transfer !== null;

  // Form state
  const [selectedPatientId, setSelectedPatientId] = useState(transfer?.bedId || '');
  const [destinationHospital, setDestinationHospital] = useState('');
  const [destinationHospitalOther, setDestinationHospitalOther] = useState('');
  const [destinationHospitals, setDestinationHospitals] = useState<DestinationHospitalOption[]>([
    ...DESTINATION_HOSPITALS,
  ]);
  const [requiredSpecialty, setRequiredSpecialty] = useState(transfer?.requiredSpecialty || '');
  const [requiredSpecialtyOther, setRequiredSpecialtyOther] = useState('');
  const [requiredBedType, setRequiredBedType] = useState('');
  const [requiredBedTypeOther, setRequiredBedTypeOther] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    void getDestinationHospitalCatalog()
      .then(catalog => {
        if (mounted) {
          setDestinationHospitals(catalog);
        }
      })
      .catch(error => {
        console.warn('[TransferFormModal] Failed to load destination hospitals catalog:', error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!transfer) {
      return;
    }

    const destinationExists = destinationHospitals.some(
      hospital => hospital.name === transfer.destinationHospital
    );
    setDestinationHospital(destinationExists ? transfer.destinationHospital : 'Otro');
    setDestinationHospitalOther(destinationExists ? '' : transfer.destinationHospital);

    const currentBedType = transfer.requiredBedType || '';
    const bedTypeExists = TRANSFER_BED_REQUIREMENTS.includes(
      currentBedType as (typeof TRANSFER_BED_REQUIREMENTS)[number]
    );
    setRequiredBedType(bedTypeExists ? currentBedType : currentBedType ? 'Otra' : '');
    setRequiredBedTypeOther(bedTypeExists ? '' : currentBedType);
    const currentSpecialty = transfer.requiredSpecialty || '';
    const specialtyExists = MEDICAL_SPECIALTIES.includes(
      currentSpecialty as (typeof MEDICAL_SPECIALTIES)[number]
    );
    setRequiredSpecialty(specialtyExists ? currentSpecialty : currentSpecialty ? 'Otra' : '');
    setRequiredSpecialtyOther(specialtyExists ? '' : currentSpecialty);
  }, [destinationHospitals, transfer]);

  // Find selected patient
  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const destinationHospitalValue =
      destinationHospital === 'Otro' ? destinationHospitalOther.trim() : destinationHospital;
    const requiredSpecialtyValue =
      requiredSpecialty === 'Otra' ? requiredSpecialtyOther.trim() : requiredSpecialty;
    const requiredBedTypeValue =
      requiredBedType === 'Otra' ? requiredBedTypeOther.trim() : requiredBedType;

    if (!selectedPatientId || !destinationHospitalValue) {
      defaultBrowserWindowRuntime.alert('Por favor complete todos los campos requeridos');
      return;
    }
    if (destinationHospital === 'Otro' && !destinationHospitalOther.trim()) {
      defaultBrowserWindowRuntime.alert('Debe detallar el hospital destino');
      return;
    }
    if (requiredSpecialty === 'Otra' && !requiredSpecialtyOther.trim()) {
      defaultBrowserWindowRuntime.alert('Debe detallar la especialidad requerida');
      return;
    }
    if (requiredBedType === 'Otra' && !requiredBedTypeOther.trim()) {
      defaultBrowserWindowRuntime.alert('Debe detallar el tipo de cama requerida');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        patientId: selectedPatientId,
        bedId: selectedPatientId,
        destinationHospital: destinationHospitalValue,
        transferReason: 'Derivación a especialidad',
        requiredSpecialty: requiredSpecialtyValue || undefined,
        requiredBedType: requiredBedTypeValue || undefined,
        requestingDoctor: '',
        observations: '',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title={isEditing ? 'Editar Traslado' : 'Nueva Solicitud de Traslado'}
      icon={<FilePlus size={18} />}
      size="md"
      variant="white"
      headerIconColor="text-indigo-600"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Section */}
        <ModalSection title="Información del Paciente" icon={<User size={16} />} variant="info">
          {!isEditing ? (
            <div className="space-y-3">
              <PatientSelector
                patients={patients}
                selectedPatientId={selectedPatientId}
                onChange={setSelectedPatientId}
                disabled={isSaving}
              />
              {selectedPatient && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl animate-fade-in">
                  <p className="text-[11px] font-black text-blue-700 uppercase tracking-widest leading-none mb-1">
                    Paciente Seleccionado
                  </p>
                  <p className="text-sm font-bold text-slate-800">{selectedPatient.name}</p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Cama {selectedPatient.bedId.replace('BED_', '')} • {selectedPatient.diagnosis}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">
                Paciente Hospitalizado
              </p>
              <p className="text-sm font-bold text-slate-800">{transfer.patientSnapshot.name}</p>
              <p className="text-[10px] text-slate-500 font-medium">
                {transfer.patientSnapshot.rut} • Cama {transfer.bedId.replace('BED_', '')}
              </p>
            </div>
          )}
        </ModalSection>

        {/* Destination Section */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Hospital Destino *
            </label>
            <select
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer font-medium"
              value={destinationHospital}
              onChange={e => setDestinationHospital(e.target.value)}
              disabled={isSaving}
              required
            >
              <option value="">Seleccionar hospital...</option>
              {destinationHospitals.map(h => (
                <option key={h.id} value={h.name}>
                  {h.name}
                </option>
              ))}
            </select>
            {destinationHospital === 'Otro' && (
              <input
                className="mt-2 w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
                value={destinationHospitalOther}
                onChange={e => setDestinationHospitalOther(e.target.value)}
                placeholder="Detallar hospital de destino"
                disabled={isSaving}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Especialidad Requerida
            </label>
            <select
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer font-medium"
              value={requiredSpecialty}
              onChange={e => setRequiredSpecialty(e.target.value)}
              disabled={isSaving}
            >
              <option value="">Seleccionar especialidad</option>
              {MEDICAL_SPECIALTIES.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {requiredSpecialty === 'Otra' && (
              <input
                className="mt-2 w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
                value={requiredSpecialtyOther}
                onChange={e => setRequiredSpecialtyOther(e.target.value)}
                placeholder="Detallar especialidad"
                disabled={isSaving}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Cama Requerida
            </label>
            <select
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer font-medium"
              value={requiredBedType}
              onChange={e => setRequiredBedType(e.target.value)}
              disabled={isSaving}
            >
              <option value="">-</option>
              {TRANSFER_BED_REQUIREMENTS.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {requiredBedType === 'Otra' && (
              <input
                className="mt-2 w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
                value={requiredBedTypeOther}
                onChange={e => setRequiredBedTypeOther(e.target.value)}
                placeholder="Detallar cama requerida"
                disabled={isSaving}
              />
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-widest transition-all"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-8 py-2.5 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
            disabled={
              isSaving ||
              (!isEditing && !selectedPatientId) ||
              !destinationHospital ||
              (destinationHospital === 'Otro' && !destinationHospitalOther.trim()) ||
              (requiredSpecialty === 'Otra' && !requiredSpecialtyOther.trim()) ||
              (requiredBedType === 'Otra' && !requiredBedTypeOther.trim())
            }
          >
            {isSaving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Solicitud'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};
