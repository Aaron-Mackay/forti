import {Autocomplete, AutocompleteProps, PaperProps, Table, TableProps} from '@mui/material';
import React from 'react';

const COMPACT_FONT_SIZE = '0.9rem';
const COMPACT_LABEL_SIZE = '0.75rem';

export const CompactAutocomplete = <T, Multiple extends boolean | undefined = false, DisableClearable extends boolean | undefined = false, FreeSolo extends boolean | undefined = false>(
  props: AutocompleteProps<T, Multiple, DisableClearable, FreeSolo>
) => {
  return (
    <Autocomplete
      {...props}
      sx={{
        fontSize: COMPACT_FONT_SIZE,
        '& .MuiInputBase-root': {
          fontSize: COMPACT_FONT_SIZE,
        },
        '& .MuiInputBase-input': {
          fontSize: COMPACT_FONT_SIZE,
        },
        '& .MuiInputLabel-root': {
          fontSize: COMPACT_LABEL_SIZE,
        },
        '& .MuiAutocomplete-endAdornment': {
          fontSize: COMPACT_FONT_SIZE,
        },
        ...(props.sx || {}),
      }}
      slotProps={{
        ...props.slotProps,
        paper: {
          ...(props.slotProps?.paper),
          sx: {
            fontSize: COMPACT_FONT_SIZE,
            // @ts-ignore
            ...(props.slotProps?.paper?.sx as object),
          },
        },
      }}
    />
  );
};


export const CompactTable: React.FC<TableProps> = ({children, sx, ...rest}) => (
  <Table
    sx={{
      tableLayout: 'fixed',
      fontSize: COMPACT_FONT_SIZE,
      '& .MuiTableCell-root': {
        padding: '4px 6px',
        fontSize: 'inherit',
        overflow: 'hidden',
      },
      '& input, & .MuiAutocomplete-root': {
        width: '100%',          // fill the cell width
        boxSizing: 'border-box', // include padding/border in width
        fontSize: COMPACT_FONT_SIZE,
      },
      '& input': {
        fontSize: COMPACT_FONT_SIZE,
      },
      '& .MuiInputBase-input': {
        fontSize: COMPACT_FONT_SIZE,
      },
      '& .MuiInputLabel-root': {
        fontSize: COMPACT_LABEL_SIZE,
      },
      '& .MuiAutocomplete-endAdornment': {
        fontSize: COMPACT_FONT_SIZE,
      },
      ...sx,
    }}
    {...rest}
  >
    {children}
  </Table>
);