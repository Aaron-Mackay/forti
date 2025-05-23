import React from "react";
import TextField from "@mui/material/TextField";

interface ToggleableEditableFieldProps {
  label: string,
  value: string | number;
  isInEditMode: boolean;
  onChange: (value: string) => void;
  type?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

export const ToggleableEditableField: React.FC<ToggleableEditableFieldProps> = ({
                                                                                  label,
                                                                                  value,
                                                                                  isInEditMode,
                                                                                  onChange,
                                                                                  type = "text",
                                                                                  inputProps
                                                                                }) => {
  return isInEditMode ? (
    <TextField type={type}
               value={value.toString()}
               onChange={(e) => onChange(e.target.value)}
               slotProps={{htmlInput: {...inputProps}}} label={label}/>
  ) : (
    <span>{value}</span>
  );
};
