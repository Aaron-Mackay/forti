import {Divider, Paper, styled} from "@mui/material";
import {dateAndWeek, withOpacity} from "@/app/user/[userId]/calendar/utils";
import React from "react";
import {EventPrisma} from "@/types/dataTypes";

export function EventListItem(props: { onClick: () => void, event: EventPrisma, bgColor?: string }) {
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
        {props.event.endDate && dateAndWeek(props.event.endDate)}
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