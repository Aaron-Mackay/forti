import {Divider, Paper, styled} from "@mui/material";
import {dateAndWeek, withOpacity} from "@/app/user/[userId]/calendar/utils";
import {sub} from "date-fns";
import React from "react";

export function EventListItem(props: { onClick: () => void, title: string, start: Date, end: Date, bgColor?: string }) {
  return (<Item
    onClick={props.onClick}
    sx={{
      ...(props.bgColor && {backgroundColor: withOpacity(props.bgColor, 0.2)}),
    }}
  >
    <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%"}}>
      <span style={{fontSize: "1.5em", padding: "1rem"}}>
        {props.title}
      </span>
      <span style={{textAlign: "center"}}>
                  {props.start && dateAndWeek(props.start)}
        <br/><Divider sx={{my: 1}}/>
        {props.end && dateAndWeek(sub(props.end, {days: 1}))}
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