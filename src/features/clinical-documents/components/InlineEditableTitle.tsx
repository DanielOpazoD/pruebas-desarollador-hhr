import React, { useEffect, useState } from 'react';
import clsx from 'clsx';

interface InlineEditableTitleProps {
  value: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export const InlineEditableTitle: React.FC<InlineEditableTitleProps> = ({
  value,
  className,
  inputClassName,
  disabled = false,
  onChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(value);
    }
  }, [isEditing, value]);

  const commit = () => {
    const normalized = draftValue.trim();
    onChange(normalized.length > 0 ? normalized : value);
    setIsEditing(false);
  };

  if (disabled) {
    return <span className={className}>{value}</span>;
  }

  if (isEditing) {
    return (
      <input
        value={draftValue}
        onChange={event => setDraftValue(event.target.value)}
        onBlur={commit}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setDraftValue(value);
            setIsEditing(false);
          }
        }}
        className={clsx('clinical-document-inline-title-input', inputClassName, className)}
        autoFocus
      />
    );
  }

  return (
    <button
      type="button"
      className={clsx('clinical-document-inline-title', className)}
      onClick={() => setIsEditing(true)}
      title="Haz clic para editar"
    >
      {value}
    </button>
  );
};
