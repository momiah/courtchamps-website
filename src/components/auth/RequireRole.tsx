import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import styled from "styled-components";

import { useAuth } from "../../context/AuthContext";

// Guards a route so only signed-in users that carry a role may enter.
// While auth/role are still resolving it shows a spinner; a signed-out visitor
// is sent to /login with the attempted path preserved in router state; a
// signed-in visitor without a role is sent back to the marketing home page.
export default function RequireRole({ children }: { children: React.ReactElement }) {
  const { currentUser, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <SpinnerContainer>
        <Spinner />
      </SpinnerContainer>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (role === null) {
    return <Navigate to="/" replace />;
  }

  return children;
}

const SpinnerContainer = styled.div({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  width: "100%",
  backgroundColor: "#07111f",
});

const Spinner = styled.div({
  width: "48px",
  height: "48px",
  border: "4px solid rgba(0, 153, 240, 0.25)",
  borderTop: "4px solid #0099f0",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
  "@keyframes spin": {
    from: { transform: "rotate(0deg)" },
    to: { transform: "rotate(360deg)" },
  },
});
