import React from "react";
import styled from "styled-components";

import { USER_ROLES, UserRole } from "../../types/roles";

interface RoleBadgeStyle {
  label: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
}

// A blue-family hierarchy: Owner is the most prominent (solid brand blue),
// Admin is an outlined accent, Moderator is a muted steel-blue. All sit on the
// navy surfaces without clashing with the accent used elsewhere.
const ROLE_BADGE_STYLES: Record<UserRole, RoleBadgeStyle> = {
  [USER_ROLES.OWNER]: {
    label: "Owner",
    textColor: "#e6f4ff",
    backgroundColor: "#0099f0",
    borderColor: "#0099f0",
  },
  [USER_ROLES.ADMIN]: {
    label: "Admin",
    textColor: "#4db8ff",
    backgroundColor: "rgba(0, 153, 240, 0.16)",
    borderColor: "rgba(0, 153, 240, 0.55)",
  },
  [USER_ROLES.MODERATOR]: {
    label: "Moderator",
    textColor: "#8fb8d6",
    backgroundColor: "rgba(143, 184, 214, 0.14)",
    borderColor: "rgba(143, 184, 214, 0.45)",
  },
};

export default function RoleBadge({ role }: { role: UserRole }) {
  const badgeStyle = ROLE_BADGE_STYLES[role];

  return (
    <BadgePill
      textColor={badgeStyle.textColor}
      backgroundColor={badgeStyle.backgroundColor}
      borderColor={badgeStyle.borderColor}
    >
      {badgeStyle.label}
    </BadgePill>
  );
}

const BadgePill = styled.span<{
  textColor: string;
  backgroundColor: string;
  borderColor: string;
}>(({ textColor, backgroundColor, borderColor }) => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "3px 10px",
  borderRadius: "999px",
  fontSize: "0.7rem",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: textColor,
  backgroundColor,
  border: `1px solid ${borderColor}`,
  whiteSpace: "nowrap",
}));
