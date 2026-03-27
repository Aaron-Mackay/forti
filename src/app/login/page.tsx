import {Box, Card, CardContent, CardMedia, Chip, Typography} from "@mui/material";
import Image from "next/image";
import LoginButtons from "./LoginButtons";

const betaPillSx = {
  bgcolor: "rgba(45,127,249,0.15)",
  color: "rgb(45,127,249)",
  fontWeight: 600,
  fontSize: "0.7rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  border: "none",
};

const betaPillDesktopSx = {
  bgcolor: "rgba(255,255,255,0.2)",
  color: "#FFFFFF",
  fontWeight: 700,
  fontSize: "0.75rem",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: "99px",
  px: "12px",
  py: "4px",
  mt: "10px",
  mb: "20px",
  display: "inline-block",
};

export default function LoginPage() {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"},
        minHeight: "100dvh",
      }}
    >
      {/* Left side (Brand / Illustration) */}
      <Box
        sx={{
          display: {xs: "none", md: "flex"},
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "primary.main",
          color: "primary.contrastText",
          p: 6,
        }}
      >
        <Box textAlign="center">
          <Image
            src="/forti-icon.svg"
            alt="Logo"
            width={200}
            height={200}
            style={{margin: "0 auto", filter: "invert(1)"}}
          />
          <Box sx={{display: "flex", justifyContent: "center"}}>
            <Box component="span" sx={betaPillDesktopSx}>Beta</Box>
          </Box>
          <Typography variant="h4" fontWeight={700}>
            Welcome to Forti
          </Typography>
          <Typography variant="body1" mt={2}>
            Your training, organised and tracked with ease.
          </Typography>
        </Box>
      </Box>

      {/* Right side (Login form) */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",

        }}
      >
        <Card elevation={4} sx={{width: "100%", maxWidth: 400, borderRadius: 3, m:1}}>
          <CardMedia
            component={'img'}
            sx={{ height: 250, objectFit: "contain", display: { xs: "flex", md: "none" }}}
            image="/forti-icon.svg"
            title="Logo"
          />
          <CardContent sx={{textAlign: "center"}}>
            <Box sx={{display: {xs: "flex", md: "none"}, justifyContent: "center", mt: -1, mb: 0.5}}>
              <Chip label="Beta" size="small" sx={betaPillSx}/>
            </Box>
            <Typography variant="h2" sx={{display: {xs: "block", md: "none"}}}>Forti</Typography>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Sign in
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Continue with your account
            </Typography>

            {/* Client component with actual buttons */}
            <LoginButtons/>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
