"use client";

import { useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  ButtonBase,
} from "@mui/material";
import type { Selection } from "@/lib/graph/highlight";
import type { Coverage, Route } from "@/lib/parser/types";

// Every route the adapters recovered, one row per method and pattern. Clicking
// a row selects the file that declares it, so the pane shows that file while
// the table stays open. Nothing here is inferred: what the adapters couldn't
// read exactly is listed underneath with the reason, not guessed into a row.
export function RouteTable({
  routes,
  coverage,
  selection,
  hover,
  onReveal,
  onHover,
}: {
  routes: Route[];
  coverage: Coverage["routes"];
  selection: Selection;
  hover: Selection;
  onReveal: (path: string) => void;
  onHover: (hover: Selection) => void;
}) {
  const [omittedOpen, setOmittedOpen] = useState(false);
  const selectedFile = selection?.kind === "file" ? selection.path : null;
  const hoveredFile = hover?.kind === "file" ? hover.path : null;

  return (
    <Box sx={{ position: "absolute", inset: 0, overflowY: "auto", bgcolor: "var(--surface)", fontSize: "11px" }}>
      <Typography sx={{ borderBottom: "1px solid var(--line)", px: 1.5, py: 0.75, fontSize: "11px", color: "var(--fg-muted)" }}>
        Listed only where the method and the full path are both written in the code.
      </Typography>

      {coverage.withheld.map((w) => (
        <Box key={w.project} sx={{ borderBottom: "1px solid var(--line)", px: 1.5, py: 0.75, fontSize: "11px" }}>
          <Typography component="span" sx={{ fontSize: "11px", color: "var(--fg)" }}>
            No routes listed{w.project === "." ? "" : <> in <Box component="span" sx={{ fontFamily: "var(--font-geist-mono), monospace" }}>{w.project}/</Box></>}:
          </Typography>{" "}
          <Typography component="span" sx={{ fontSize: "11px", color: "var(--fg-muted)" }}>
            {w.reason}.
          </Typography>
        </Box>
      ))}

      {routes.length === 0 ? (
        <Typography sx={{ px: 1.5, py: 1, fontSize: "11px", color: "var(--fg-muted)" }}>No routes.</Typography>
      ) : (
        <Table size="small" sx={{ width: "100%", borderCollapse: "collapse" }}>
          <TableHead sx={{ position: "sticky", top: 0, bgcolor: "var(--surface)", zIndex: 1 }}>
            <TableRow sx={{ height: 22, borderBottom: "1px solid var(--line)", textAlign: "left" }}>
              <TableCell sx={{ width: 64, px: 1.5, py: 0.25, fontSize: "10px", fontWeight: 400, color: "var(--fg-muted)", borderColor: "var(--line)" }}>
                Method
              </TableCell>
              <TableCell sx={{ px: 1.5, py: 0.25, fontSize: "10px", fontWeight: 400, color: "var(--fg-muted)", borderColor: "var(--line)" }}>
                Pattern
              </TableCell>
              <TableCell sx={{ px: 1.5, py: 0.25, fontSize: "10px", fontWeight: 400, color: "var(--fg-muted)", borderColor: "var(--line)" }}>
                Declared in
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {routes.map((r) => {
              const selected = r.file === selectedFile;
              const hovered = r.file === hoveredFile;
              return (
                <TableRow
                  key={`${r.method} ${r.pattern} ${r.file}`}
                  onClick={() => onReveal(r.file)}
                  onMouseEnter={() => onHover({ kind: "file", path: r.file })}
                  onMouseLeave={() => onHover(null)}
                  sx={{
                    height: 22,
                    cursor: "pointer",
                    fontFamily: "var(--font-geist-mono), monospace",
                    bgcolor: selected
                      ? "rgba(59, 130, 246, 0.15)"
                      : hovered
                      ? "var(--raised)"
                      : "transparent",
                    boxShadow: selected ? "inset 2px 0 0 var(--accent)" : "none",
                    "&:hover": {
                      bgcolor: "var(--raised)",
                    },
                  }}
                >
                  <TableCell sx={{ px: 1.5, py: 0.25, fontSize: "11px", fontFamily: "inherit", borderColor: "transparent", color: "var(--fg)" }}>
                    {r.method}
                  </TableCell>
                  <TableCell sx={{ px: 1.5, py: 0.25, fontSize: "11px", fontFamily: "inherit", borderColor: "transparent", wordBreak: "break-all", color: "var(--fg)" }}>
                    {r.pattern}
                  </TableCell>
                  <TableCell
                    title={r.file}
                    sx={{ px: 1.5, py: 0.25, fontSize: "11px", fontFamily: "inherit", borderColor: "transparent", color: "var(--fg-muted)" }}
                  >
                    {r.file}:{r.line}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {coverage.omitted.length > 0 && (
        <Box component="section" sx={{ borderTop: "1px solid var(--line)" }}>
          <ButtonBase
            aria-expanded={omittedOpen}
            onClick={() => setOmittedOpen(!omittedOpen)}
            sx={{
              display: "flex",
              width: "100%",
              alignItems: "baseline",
              gap: 0.75,
              px: 1.5,
              py: 0.75,
              textAlign: "left",
              fontSize: "11px",
              "&:hover": { bgcolor: "var(--raised)" },
            }}
          >
            <Typography component="span" sx={{ width: 8, fontSize: "11px", color: "var(--fg-muted)" }}>
              {omittedOpen ? "▾" : "▸"}
            </Typography>
            <Typography component="span" sx={{ fontSize: "11px", color: "var(--fg)" }}>
              Not listed
            </Typography>
            <Typography component="span" sx={{ fontSize: "11px", color: "var(--fg-muted)" }}>
              declared, but the method or full path isn&apos;t written out
            </Typography>
            <Typography component="span" sx={{ ml: "auto", fontSize: "11px", color: "var(--fg-muted)", fontVariantNumeric: "tabular-nums" }}>
              {coverage.omitted.length}
            </Typography>
          </ButtonBase>

          {omittedOpen && (
            <Box component="ul" sx={{ pb: 1, listStyle: "none", p: 0, m: 0 }}>
              {coverage.omitted.map((o) => (
                <Box component="li" key={`${o.file}:${o.line}:${o.reason}`}>
                  <ButtonBase
                    onClick={() => onReveal(o.file)}
                    onMouseEnter={() => onHover({ kind: "file", path: o.file })}
                    onMouseLeave={() => onHover(null)}
                    sx={{
                      display: "flex",
                      width: "100%",
                      gap: 1.5,
                      px: 1.5,
                      py: 0.25,
                      textAlign: "left",
                      fontSize: "11px",
                      "&:hover": { bgcolor: "var(--raised)" },
                    }}
                  >
                    <Typography component="span" sx={{ flexShrink: 0, fontFamily: "var(--font-geist-mono), monospace", fontSize: "11px", color: "var(--fg-muted)" }}>
                      {o.file}:{o.line}
                    </Typography>
                    <Typography component="span" sx={{ fontSize: "11px", color: "var(--fg-muted)" }}>
                      {o.reason}
                    </Typography>
                  </ButtonBase>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
