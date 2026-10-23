"use client";

import * as React from "react";
import { useClerk, CreateOrganization } from "@clerk/nextjs";
import { Button, Dialog, DialogContent, IconButton, Box } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";

export function CreateOrganizationTrigger() {
  const clerk = useClerk();
  const [open, setOpen] = React.useState(false);

  const handleClick = () => {
    if (typeof clerk.openCreateOrganization === "function") {
      clerk.openCreateOrganization({
        afterCreateOrganizationUrl: "/dashboard/organizations",
      });
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <Button
        onClick={handleClick}
        size="small"
        startIcon={<AddIcon sx={{ fontSize: "14px !important" }} />}
        sx={{
          textTransform: "none",
          fontSize: "12px",
          height: "24px",
          px: 1,
          py: 0,
          fontWeight: 500,
          color: "var(--fg)",
          bgcolor: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "4px",
          "&:hover": {
            bgcolor: "var(--raised)",
            borderColor: "var(--line)",
          },
        }}
      >
        Create organization
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: "var(--surface)",
              border: "1px solid var(--line)",
              backgroundImage: "none",
              p: 1,
            },
          },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: "var(--fg-muted)" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 2, display: "flex", justifyContent: "center" }}>
          <CreateOrganization
            afterCreateOrganizationUrl="/dashboard/organizations"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
