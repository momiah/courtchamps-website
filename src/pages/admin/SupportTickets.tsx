import React from "react";
import styled from "styled-components";

import AdminLayout from "../../components/admin/AdminLayout";

function SupportTickets() {
  return (
    <AdminLayout title="Support Tickets">
      <PlaceholderCard>
        <PlaceholderTitle>Coming soon</PlaceholderTitle>
        <PlaceholderText>
          Player support tickets will be managed here.
        </PlaceholderText>
      </PlaceholderCard>
    </AdminLayout>
  );
}

export default SupportTickets;

const PlaceholderCard = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  padding: "48px 32px",
  borderRadius: "16px",
  backgroundColor: "#0a1929",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  textAlign: "center",
});

const PlaceholderTitle = styled.span({
  color: "#FFFFFF",
  fontSize: "1.15rem",
  fontWeight: 700,
});

const PlaceholderText = styled.span({
  color: "#8fa3b8",
  fontSize: "0.9rem",
});
