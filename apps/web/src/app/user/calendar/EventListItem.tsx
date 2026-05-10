import {Divider, Paper, styled, Typography, Box} from "@mui/material";
import {dateAndWeek, toInclusiveEndDate, withOpacity} from "@/app/user/calendar/utils";
import React from "react";
import {EventPrisma} from "@/types/dataTypes";
import {signalTokens} from '@lib/signal/tokens';

export function EventListItem(props: { onClick: () => void, event: EventPrisma, bgColor?: string, signalEnabled?: boolean }) {
  if (props.signalEnabled) {
    return (
      <Box
        component="button"
        type="button"
        onClick={props.onClick}
        sx={{
          width: '100%',
          textAlign: 'left',
          border: `1px solid ${signalTokens.surface.planning.border}`,
          borderRadius: signalTokens.radii.card,
          background: signalTokens.surface.planning.surface,
          color: signalTokens.surface.planning.ink,
          px: 1.5,
          py: 1.25,
          cursor: 'pointer',
        }}
      >
        <Typography
          sx={{
            fontFamily: signalTokens.fontVar.cond,
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1.1,
            mb: 0.75,
          }}
        >
          {props.event.name}
        </Typography>
        <Typography variant="body2" sx={{ color: signalTokens.surface.planning.inkMid }}>
          {props.event.startDate && dateAndWeek(props.event.startDate)}
        </Typography>
        <Divider sx={{ my: 1 }} />
        <Typography variant="body2" sx={{ color: signalTokens.surface.planning.inkMid }}>
          {props.event.endDate && dateAndWeek(toInclusiveEndDate(props.event.endDate))}
        </Typography>
      </Box>
    );
  }

  return (<Item
    onClick={props.onClick}
    sx={{
      ...(props.bgColor && {backgroundColor: withOpacity(props.bgColor, 0.2)}),
    }}
  >
    <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%"}}>
      <span style={{fontSize: "1.5em", padding: "1rem"}}>
        {props.event.name}
      </span>
      <span style={{textAlign: "center"}}>
                  {props.event.startDate && dateAndWeek(props.event.startDate)}
        <br/><Divider sx={{my: 1}}/>
        {props.event.endDate && dateAndWeek(toInclusiveEndDate(props.event.endDate))}
      </span>
    </div>
  </Item>);
}

const Item = styled(Paper)(({theme}) => ({
  backgroundColor: "rgba(200,238,255,0.1)",
  borderRadius: "1em",
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  color: (theme.vars ?? theme).palette.text.secondary,
  ...theme.applyStyles('dark', {
    backgroundColor: '#1A2027',
  }),
}));
