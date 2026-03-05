import React, { useEffect, useState } from 'react';
import { FilePlus2, FileText, Plus, Save, Trash2 } from 'lucide-react';

import type {
  ClinicalDocumentPatientFieldTemplate,
  ClinicalDocumentSectionTemplate,
  ClinicalDocumentTemplate,
} from '@/features/clinical-documents';
import {
  createTemplatePatientField,
  createTemplateSection,
  normalizeTemplateForSave,
} from '@/features/clinical-documents/controllers/clinicalDocumentTemplateEditorController';
import { ClinicalDocumentTemplateRepository } from '@/services/repositories';

const patchTemplateItem = <T extends { id: string }>(
  items: T[],
  itemId: string,
  patch: Partial<T>
): T[] => items.map(item => (item.id === itemId ? { ...item, ...patch } : item));

const removeTemplateItem = <T extends { id: string }>(items: T[], itemId: string): T[] =>
  items.filter(item => item.id !== itemId);

export const ClinicalDocumentTemplatesManager: React.FC = () => {
  const [templates, setTemplates] = useState<ClinicalDocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const data = await ClinicalDocumentTemplateRepository.listAll();
      if (mounted) {
        setTemplates(data);
        setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const patchTemplate = (templateId: string, patch: Partial<ClinicalDocumentTemplate>) => {
    setTemplates(prev =>
      prev.map(template => (template.id === templateId ? { ...template, ...patch } : template))
    );
  };

  const patchTemplateField = (
    templateId: string,
    fieldId: string,
    patch: Partial<ClinicalDocumentPatientFieldTemplate>
  ) => {
    setTemplates(prev =>
      prev.map(template =>
        template.id === templateId
          ? {
              ...template,
              patientFields: patchTemplateItem(template.patientFields, fieldId, patch),
            }
          : template
      )
    );
  };

  const patchTemplateSection = (
    templateId: string,
    sectionId: string,
    patch: Partial<ClinicalDocumentSectionTemplate>
  ) => {
    setTemplates(prev =>
      prev.map(template =>
        template.id === templateId
          ? {
              ...template,
              sections: patchTemplateItem(template.sections, sectionId, patch),
            }
          : template
      )
    );
  };

  const addTemplateField = (templateId: string) => {
    setTemplates(prev =>
      prev.map(template =>
        template.id === templateId
          ? {
              ...template,
              patientFields: [...template.patientFields, createTemplatePatientField()],
            }
          : template
      )
    );
  };

  const removeTemplateField = (templateId: string, fieldId: string) => {
    setTemplates(prev =>
      prev.map(template =>
        template.id === templateId
          ? {
              ...template,
              patientFields: removeTemplateItem(template.patientFields, fieldId),
            }
          : template
      )
    );
  };

  const addTemplateSection = (templateId: string) => {
    setTemplates(prev =>
      prev.map(template =>
        template.id === templateId
          ? {
              ...template,
              sections: [...template.sections, createTemplateSection(template.sections.length)],
            }
          : template
      )
    );
  };

  const removeTemplateSection = (templateId: string, sectionId: string) => {
    setTemplates(prev =>
      prev.map(template =>
        template.id === templateId
          ? {
              ...template,
              sections: removeTemplateItem(template.sections, sectionId).map((section, index) => ({
                ...section,
                order: index,
              })),
            }
          : template
      )
    );
  };

  const saveTemplate = async (template: ClinicalDocumentTemplate) => {
    const normalized = normalizeTemplateForSave(template);
    setSavingId(template.id);
    try {
      await ClinicalDocumentTemplateRepository.save(normalized);
      setTemplates(prev =>
        prev.map(current => (current.id === normalized.id ? normalized : current))
      );
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Cargando plantillas clínicas...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-medical-50 text-medical-600">
            <FileText size={18} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">Plantillas Clínicas</h3>
            <p className="text-xs text-slate-500">
              Administra metadatos, campos de cabecera y secciones clínicas en Firestore.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {templates.map(template => (
          <div
            key={template.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Nombre
                    </span>
                    <input
                      type="text"
                      value={template.name}
                      onChange={event => patchTemplate(template.id, { name: event.target.value })}
                      className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Título
                    </span>
                    <input
                      type="text"
                      value={template.title}
                      onChange={event => patchTemplate(template.id, { title: event.target.value })}
                      className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                    />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Estado
                    </span>
                    <select
                      value={template.status}
                      onChange={event =>
                        patchTemplate(template.id, {
                          status: event.target.value as ClinicalDocumentTemplate['status'],
                        })
                      }
                      className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                    >
                      <option value="active">Activa</option>
                      <option value="archived">Archivada</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={template.allowCustomTitle}
                      onChange={event =>
                        patchTemplate(template.id, { allowCustomTitle: event.target.checked })
                      }
                    />
                    Título editable
                  </label>

                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={template.allowAddSection}
                      onChange={event =>
                        patchTemplate(template.id, { allowAddSection: event.target.checked })
                      }
                    />
                    Permitir secciones extra
                  </label>

                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={template.allowClinicalUpdateSections}
                      onChange={event =>
                        patchTemplate(template.id, {
                          allowClinicalUpdateSections: event.target.checked,
                        })
                      }
                    />
                    Sección actualización
                  </label>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                      Campos de cabecera ({template.patientFields.length})
                    </p>
                    <button
                      type="button"
                      onClick={() => addTemplateField(template.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100"
                    >
                      <Plus size={12} />
                      Campo
                    </button>
                  </div>
                  <div className="space-y-2">
                    {template.patientFields.map(field => (
                      <div
                        key={field.id}
                        className="grid items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 md:grid-cols-[1fr_140px_140px_70px_auto]"
                      >
                        <input
                          type="text"
                          value={field.label}
                          onChange={event =>
                            patchTemplateField(template.id, field.id, { label: event.target.value })
                          }
                          className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-800"
                        />
                        <input
                          type="text"
                          value={field.id}
                          onChange={event =>
                            patchTemplateField(template.id, field.id, { id: event.target.value })
                          }
                          className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-700"
                        />
                        <select
                          value={field.type}
                          onChange={event =>
                            patchTemplateField(template.id, field.id, {
                              type: event.target
                                .value as ClinicalDocumentPatientFieldTemplate['type'],
                            })
                          }
                          className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-700"
                        >
                          <option value="text">Texto</option>
                          <option value="date">Fecha</option>
                          <option value="time">Hora</option>
                          <option value="number">Número</option>
                        </select>
                        <label className="flex items-center gap-1 text-[11px] text-slate-600">
                          <input
                            type="checkbox"
                            checked={Boolean(field.readonly)}
                            onChange={event =>
                              patchTemplateField(template.id, field.id, {
                                readonly: event.target.checked,
                              })
                            }
                          />
                          RO
                        </label>
                        <button
                          type="button"
                          onClick={() => removeTemplateField(template.id, field.id)}
                          className="inline-flex items-center justify-center rounded-md border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100"
                          title="Eliminar campo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                      Secciones ({template.sections.length})
                    </p>
                    <button
                      type="button"
                      onClick={() => addTemplateSection(template.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100"
                    >
                      <FilePlus2 size={12} />
                      Sección
                    </button>
                  </div>
                  <div className="space-y-2">
                    {template.sections
                      .slice()
                      .sort((left, right) => left.order - right.order)
                      .map((section, index) => (
                        <div
                          key={section.id}
                          className="grid items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 md:grid-cols-[28px_1fr_140px_80px_80px_auto]"
                        >
                          <span className="text-center text-[11px] font-black text-slate-400">
                            {index + 1}
                          </span>
                          <input
                            type="text"
                            value={section.title}
                            onChange={event =>
                              patchTemplateSection(template.id, section.id, {
                                title: event.target.value,
                              })
                            }
                            className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-800"
                          />
                          <input
                            type="text"
                            value={section.id}
                            onChange={event =>
                              patchTemplateSection(template.id, section.id, {
                                id: event.target.value,
                              })
                            }
                            className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-700"
                          />
                          <label className="flex items-center gap-1 text-[11px] text-slate-600">
                            <input
                              type="checkbox"
                              checked={section.visible !== false}
                              onChange={event =>
                                patchTemplateSection(template.id, section.id, {
                                  visible: event.target.checked,
                                })
                              }
                            />
                            Visible
                          </label>
                          <label className="flex items-center gap-1 text-[11px] text-slate-600">
                            <input
                              type="checkbox"
                              checked={Boolean(section.required)}
                              onChange={event =>
                                patchTemplateSection(template.id, section.id, {
                                  required: event.target.checked,
                                })
                              }
                            />
                            Oblig.
                          </label>
                          <button
                            type="button"
                            onClick={() => removeTemplateSection(template.id, section.id)}
                            className="inline-flex items-center justify-center rounded-md border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100"
                            title="Eliminar sección"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <div className="flex items-start justify-end">
                <button
                  type="button"
                  onClick={() => void saveTemplate(template)}
                  disabled={savingId === template.id}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <Save size={14} />
                  {savingId === template.id ? 'Guardando' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
