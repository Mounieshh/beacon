import Link from "next/link";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from "@mui/material";
import { loadOrganizations } from "@/lib/dashboard/data";
import { CreateOrganizationTrigger } from "@/components/create-organization-modal";

export default async function OrganizationsPage() {
  const orgs = await loadOrganizations();

  return (
    <Box sx={{ display: "flex", height: "100%", flexDirection: "column" }}>
      {/* Top Header Row matching /runs */}
      <Box
        sx={{
          display: "flex",
          height: 36,
          flexShrink: 0,
          alignItems: "center",
          gap: 2,
          borderBottom: "1px solid var(--line)",
          px: 1.5,
        }}
      >
        <Typography
          component="h1"
          sx={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--fg)",
            lineHeight: 1,
          }}
        >
          Organizations
        </Typography>

        <Typography
          component="span"
          sx={{
            fontSize: "12px",
            color: "var(--fg-muted)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {orgs.length === 1 ? "1 organization" : `${orgs.length} organizations`}
        </Typography>

        {/* Create organization button at the top right of the main text row */}
        <Box sx={{ ml: "auto", display: "flex", alignItems: "center" }}>
          <CreateOrganizationTrigger />
        </Box>
      </Box>

      {orgs.length === 0 ? (
        <Box sx={{ px: 1.5, py: 5, fontSize: "12px", color: "var(--fg-muted)" }}>
          <Typography sx={{ fontSize: "12px", color: "var(--fg)" }}>No organizations found.</Typography>
          <Typography sx={{ fontSize: "12px", color: "var(--fg-muted)", mt: 0.5 }}>
            Create an organization using the button above to get started.
          </Typography>
        </Box>
      ) : (
        <TableContainer sx={{ minHeight: 0, flex: 1, overflow: "auto" }}>
          <Table
            size="small"
            sx={{
              width: "100%",
              tableLayout: "fixed",
              borderCollapse: "collapse",
              fontSize: "12px",
            }}
          >
            <colgroup>
              <col />
              <col style={{ width: 110 }} />
              <col style={{ width: 140 }} className="hidden sm:table-column" />
              <col style={{ width: 90 }} />
              <col style={{ width: 130 }} className="hidden sm:table-column" />
            </colgroup>
            <TableBody>
              {orgs.map((org) => {
                const projectsUrl = `/dashboard/organization/${encodeURIComponent(org.slug || org.name)}/projects`;

                return (
                  <TableRow
                    key={org.id}
                    sx={{
                      borderBottom: "1px solid var(--line)",
                      verticalAlign: "middle",
                      transition: "background-color 0.1s",
                      "&:hover": {
                        bgcolor: "var(--raised)",
                      },
                    }}
                  >
                    <TableCell
                      sx={{
                        px: 1.5,
                        py: 1,
                        borderColor: "var(--line)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Link href={projectsUrl} className="block group">
                        <Typography
                          component="span"
                          sx={{
                            fontFamily: "var(--font-geist-mono), monospace",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "var(--fg)",
                            "&:hover": { textDecoration: "underline" },
                          }}
                        >
                          {org.name}
                        </Typography>
                        <Typography
                          component="span"
                          sx={{
                            ml: 1,
                            fontFamily: "var(--font-geist-mono), monospace",
                            fontSize: "12px",
                            color: "var(--fg-muted)",
                          }}
                        >
                          @{org.slug}
                        </Typography>
                      </Link>
                    </TableCell>

                    <TableCell
                      sx={{
                        px: 1.5,
                        py: 1,
                        fontSize: "12px",
                        color: "var(--fg-muted)",
                        borderColor: "var(--line)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {org.role}
                    </TableCell>

                    <TableCell
                      className="hidden sm:table-cell"
                      sx={{
                        px: 1.5,
                        py: 1,
                        fontFamily: "var(--font-geist-mono), monospace",
                        fontSize: "12px",
                        fontVariantNumeric: "tabular-nums",
                        color: "var(--fg-muted)",
                        borderColor: "var(--line)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {org.projectCount} {org.projectCount === 1 ? "project" : "projects"}
                    </TableCell>

                    <TableCell
                      align="right"
                      sx={{
                        px: 1.5,
                        py: 1,
                        fontSize: "12px",
                        fontVariantNumeric: "tabular-nums",
                        color: "var(--fg-muted)",
                        borderColor: "var(--line)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <time dateTime={org.created.iso} title={org.created.iso}>
                        {org.created.ago}
                      </time>
                    </TableCell>

                    <TableCell
                      className="hidden sm:table-cell"
                      align="right"
                      sx={{
                        px: 1.5,
                        py: 1,
                        borderColor: "var(--line)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Link
                        href={projectsUrl}
                        className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-accent hover:bg-surface font-mono whitespace-nowrap"
                      >
                        <span>view runs</span>
                        <span>&rarr;</span>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
