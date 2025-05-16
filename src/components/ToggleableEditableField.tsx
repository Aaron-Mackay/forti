import React from "react";

interface ToggleableEditableFieldProps {
  value: string | number;
  isInEditMode: boolean;
  onChange: (value: string) => void;
  type?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

export const ToggleableEditableField: React.FC<ToggleableEditableFieldProps> = ({
                                                                                  value,
                                                                                  isInEditMode,
                                                                                  onChange,
                                                                                  type = "text",
                                                                                  inputProps
                                                                                }) => {
  return isInEditMode ? (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...inputProps}
    />
  ) : (
    <span>{value}</span>
  );
};
