// File: components/calendar/DayMetricButton.tsx
import React from "react";
import { Button } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";

const DayMetricButton = ({
                           icon,
                           value,
                           onClick,
                         }: {
  icon: React.ReactNode;
  value: boolean | string | number | null | undefined;
  onClick?: () => void;
}) => (
  <Button
    onClick={onClick}
    variant="outlined"
    sx={{ borderRadius: 999, minWidth: "4rem", px: 1, py: 0 }}
  >
    {icon}
    {value || <AddRoundedIcon />}
  </Button>
);

export default DayMetricButton;
