import type { ReactNode } from "react";
import { Box } from "@mui/material";

// The one layout every analysis renders into. Column positions and widths are
// fixed here and nowhere else: later phases fill the columns, they don't move
// them. The detail pane is a real column, not an overlay, so opening it never
// covers the map.
export function Shell({ rail, map, detail }: { rail?: ReactNode; map?: ReactNode; detail?: ReactNode }) {
  return (
    <Box
      sx={{
        display: "grid",
        minHeight: 0,
        flex: 1,
        gridTemplateColumns: "11rem minmax(0, 1fr) 20rem",
      }}
    >
      <Box
        component="nav"
        aria-label="Categories"
        sx={{
          minHeight: 0,
          overflowY: "auto",
          borderRight: "1px solid var(--line)",
          bgcolor: "var(--surface)",
        }}
      >
        {rail}
      </Box>
      <Box
        component="section"
        aria-label="Map"
        sx={{
          position: "relative",
          minHeight: 0,
          minWidth: 0,
          bgcolor: "var(--canvas)",
        }}
      >
        {map}
      </Box>
      <Box
        component="aside"
        aria-label="Details"
        sx={{
          minHeight: 0,
          overflowY: "auto",
          borderLeft: "1px solid var(--line)",
          bgcolor: "var(--surface)",
        }}
      >
        {detail}
      </Box>
    </Box>
  );
}
