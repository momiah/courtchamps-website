import React from "react";
import styled from "styled-components";

import { useAuth } from "../../context/AuthContext";
import RoleBadge from "../../components/auth/RoleBadge";

// Placeholder admin landing page. Reached only through RequireRole, so by the
// time it renders there is a signed-in user carrying a role.
export default function AdminDashboard() {
  const { currentUser, role } = useAuth();

  return (
    <PageContainer>
      <Card>
        <Heading>Admin Dashboard</Heading>
        <DetailRow>
          <DetailLabel>Signed in as</DetailLabel>
          <DetailValue>{currentUser?.email ?? "—"}</DetailValue>
        </DetailRow>
        <DetailRow>
          <DetailLabel>Role</DetailLabel>
          {role !== null ? <RoleBadge role={role} /> : <DetailValue>—</DetailValue>}
        </DetailRow>
        <PlaceholderText>
          Admin tools will live here. This is placeholder content.
        </PlaceholderText>
      </Card>
    </PageContainer>
  );
}

const PageContainer = styled.div({
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  minHeight: "100vh",
  width: "100%",
  boxSizing: "border-box",
  padding: "48px 24px",
  backgroundColor: "#07111f",
});

const Card = styled.div({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  maxWidth: "640px",
  padding: "32px",
  boxSizing: "border-box",
  borderRadius: "16px",
  backgroundColor: "#0a1929",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45)",
});

const Heading = styled.h1({
  color: "#FFFFFF",
  fontSize: "1.75rem",
  fontWeight: 700,
  margin: "0 0 24px",
});

const DetailRow = styled.div({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  padding: "14px 0",
  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
});

const DetailLabel = styled.span({
  color: "#8fa3b8",
  fontSize: "0.9rem",
});

const DetailValue = styled.span({
  color: "#FFFFFF",
  fontSize: "0.95rem",
  fontWeight: 600,
  textTransform: "capitalize",
});

const PlaceholderText = styled.p({
  color: "#c7d4e1",
  fontSize: "0.95rem",
  marginTop: "24px",
  marginBottom: 0,
});
