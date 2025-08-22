import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import {styled} from "@mui/material/styles";

interface EditModeToggleProps {
  isInEditMode: boolean;
  setIsInEditMode: (edit: boolean) => void;
}

const MaskBox = styled(Box)(() => ({
  borderRadius: 20,
  position: "relative",
  background: "#e5cfff",
  boxShadow: "1px 1px 2px rgb(165, 165, 165) inset",
  display: "flex",
  alignItems: "center",
  overflow: "hidden",
}));

const Mask = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isInEditMode",
})<{ isInEditMode: boolean }>(({isInEditMode}) => ({
  width: 100,
  height: 40,
  borderRadius: 20,
  background: "#8400ed",
  position: "absolute",
  left: 0,
  top: 0,
  boxShadow: "1px 0 2px #b473ff",
  transition: "all 0.5s ease",
  transform: `translateX(${isInEditMode ? "100px" : 0})`,
  zIndex: 1,
}));

const StyledButton = styled(Button)({
  borderRadius: 20,
  width: 100,
  height: 40,
  fontWeight: "bold",
  transition: "all 0.2s 0.1s ease",
  zIndex: 2,
  "&:hover": {
    opacity: 0.8,
  },
});

export default function EditModeToggle({isInEditMode, setIsInEditMode}: EditModeToggleProps) {
  return (
    <Box sx={{display: "flex"}}>
      <MaskBox>
        <Mask isInEditMode={isInEditMode}/>
        <StyledButton
          disableRipple
          variant="text"
          sx={{color: !isInEditMode ? "#ffffff" : "#5316AE"}}
          onClick={() => setIsInEditMode(false)}
        >
          View
        </StyledButton>
        <StyledButton
          disableRipple
          variant="text"
          sx={{color: isInEditMode ? "#ffffff" : "#5316AE"}}
          onClick={() => setIsInEditMode(true)}
        >
          Edit
        </StyledButton>
      </MaskBox>
    </Box>
  );
}
