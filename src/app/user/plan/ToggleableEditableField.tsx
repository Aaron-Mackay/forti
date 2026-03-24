import React from "react";

interface ToggleableEditableFieldProps {
  value: string | number;
  isInEditMode: boolean;
  onChange: (value: string) => void;
  type?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  disabled?: boolean;
  disabledTitle?: string;
}

export const ToggleableEditableField: React.FC<ToggleableEditableFieldProps> = ({
                                                                                  value,
                                                                                  isInEditMode,
                                                                                  onChange,
                                                                                  type = "text",
                                                                                  inputProps,
                                                                                  disabled,
                                                                                  disabledTitle,
                                                                                }) => {
  return isInEditMode ? (
    <input
      type={type}
      value={value.toString()}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      title={disabled ? disabledTitle : undefined}
      {...inputProps}
    />
  ) : (
    <span>{value}</span>
  );
};
