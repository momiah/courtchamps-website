import React from "react";
import styled from "styled-components";
import { transformDate } from "courtchamps-shared/helpers";

import { PlayerListItem } from "../../services/players";

interface ProfileAboutProps {
  profile: PlayerListItem;
}

export default function ProfileAbout({ profile }: ProfileAboutProps) {
  const detail = profile.profileDetail;

  const name = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();

  const locationText = [profile.location?.city, profile.location?.country]
    .filter(Boolean)
    .join(", ");

  const lastActive =
    typeof detail?.lastActive === "string"
      ? transformDate(detail.lastActive)
      : "";

  const emailValue = profile.showEmail
    ? profile.email || "Email not provided"
    : "Email is private";

  const fields: { label: string; value: React.ReactNode }[] = [
    { label: "Name", value: name || "Not provided" },
    { label: "Location", value: locationText || "Location not provided" },
    {
      label: "Hand Preference",
      value: profile.handPreference || "Not provided",
    },
    { label: "Member Since", value: detail?.memberSince || "Date not available" },
    { label: "Last Active", value: lastActive || "Date not available" },
    {
      label: "Contact",
      value:
        profile.showEmail && profile.email ? (
          <EmailLink href={`mailto:${profile.email}`}>
            {profile.email}
          </EmailLink>
        ) : (
          emailValue
        ),
    },
  ];

  return (
    <Card>
      <CardTitle>About</CardTitle>
      <FieldGrid>
        {fields.map((field) => (
          <Field key={field.label}>
            <FieldLabel>{field.label}</FieldLabel>
            <FieldValue>{field.value}</FieldValue>
          </Field>
        ))}
        <BioField>
          <FieldLabel>Bio</FieldLabel>
          <FieldValue>{profile.bio || "Bio not provided"}</FieldValue>
        </BioField>
      </FieldGrid>
    </Card>
  );
}

// ─── Theme ───
const PANEL = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";
const MUTED = "#8fa3b8";
const BLUE = "#00A2FF";

// ─── Styled ───
const Card = styled.div({
  padding: "24px",
  borderRadius: "16px",
  background: PANEL,
  border: `1px solid ${BORDER}`,
  marginBottom: "40px",
});

const CardTitle = styled.h3({
  fontSize: "0.78rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "1.2px",
  color: MUTED,
  margin: "0 0 20px",
});

const FieldGrid = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "22px 32px",
  "@media (max-width: 560px)": { gridTemplateColumns: "1fr" },
});

const Field = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  minWidth: 0,
});

const BioField = styled(Field)({
  gridColumn: "1 / -1",
});

const FieldLabel = styled.span({
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  color: MUTED,
});

const FieldValue = styled.span({
  fontSize: "1rem",
  color: "#FFFFFF",
  lineHeight: 1.5,
  wordBreak: "break-word",
});

const EmailLink = styled.a({
  color: BLUE,
  textDecoration: "none",
  ":hover": { textDecoration: "underline" },
});
