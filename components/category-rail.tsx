import { Box, Typography, ButtonBase } from "@mui/material";
import { railCategories, railLabel, type ModelRole, type RailKey } from "@/lib/roles";
import type { ParsedFile } from "@/lib/parser/types";

// The categories are the roles the repository's frameworks define, in the
// taxonomy's fixed order, with every one of them listed even at zero so each
// sits in the same place every time. Clicking one dims what isn't in it on the
// map rather than hiding it, so the shape of the whole repository stays on
// screen. Clicking it again, or another one, moves on.
export function CategoryRail({
  files,
  modelRoles,
  frameworks,
  active,
  onToggle,
}: {
  files: ParsedFile[];
  /** Roles the model gave files convention left unclassified; they count in their role's row. */
  modelRoles: ReadonlyMap<string, ModelRole>;
  /** The adapter of every project in the repository. */
  frameworks: string[];
  active: string | null;
  onToggle: (category: RailKey) => void;
}) {
  const categories = railCategories(
    frameworks,
    files.map((f) => f.role ?? modelRoles.get(f.path) ?? null),
  );

  return (
    <Box sx={{ py: 1 }}>
      <Typography
        component="h2"
        sx={{
          px: 1.5,
          pb: 0.5,
          fontSize: "11px",
          color: "var(--fg-muted)",
        }}
      >
        Categories{" "}
        <Typography component="span" sx={{ fontVariantNumeric: "tabular-nums", fontSize: "inherit", color: "inherit" }}>
          · {files.length} files
        </Typography>
      </Typography>

      <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0 }}>
        {categories.map(({ key, count }) => {
          const on = active === key;
          return (
            <Box component="li" key={key}>
              <ButtonBase
                aria-pressed={on}
                disabled={count === 0}
                onClick={() => onToggle(key)}
                sx={{
                  display: "flex",
                  height: 24,
                  width: "100%",
                  alignItems: "center",
                  gap: 1,
                  px: 1.5,
                  textAlign: "left",
                  fontSize: "12px",
                  justifyContent: "space-between",
                  bgcolor: on ? "rgba(59, 130, 246, 0.15)" : "transparent",
                  boxShadow: on ? "inset 2px 0 0 var(--accent)" : "none",
                  color: on ? "var(--fg)" : active ? "var(--fg-muted)" : "var(--fg)",
                  "&:hover:not(.Mui-disabled)": {
                    bgcolor: "var(--raised)",
                  },
                  "&.Mui-disabled": {
                    color: "var(--fg-muted)",
                    opacity: 0.6,
                  },
                }}
              >
                <Typography component="span" sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "12px", textAlign: "left" }}>
                  {railLabel(key)}
                </Typography>
                <Typography component="span" sx={{ fontSize: "12px", color: "var(--fg-muted)", fontVariantNumeric: "tabular-nums" }}>
                  {count}
                </Typography>
              </ButtonBase>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
