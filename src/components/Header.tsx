import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

import { CourtChampLogoIcon } from "../assets";
import { useAuth } from "../context/AuthContext";
import RoleBadge from "./auth/RoleBadge";

export default function Header() {
  const { currentUser, role, loading, signOutUser } = useAuth();

  const displayIdentity =
    currentUser?.displayName ?? currentUser?.email ?? "";

  return (
    <HeaderBar>
      <BrandLink to="/">
        <BrandLogo src={CourtChampLogoIcon} alt="Court Champs" />
        <BrandText>COURT CHAMPS</BrandText>
      </BrandLink>

      <NavGroup>
        {loading ? null : currentUser ? (
          <>
            {role !== null && (
              <NavLink to="/admin">Admin Panel</NavLink>
            )}
            <IdentityText>{displayIdentity}</IdentityText>
            {role !== null && <RoleBadge role={role} />}
            <SignOutButton type="button" onClick={() => void signOutUser()}>
              Sign Out
            </SignOutButton>
          </>
        ) : (
          <NavLink to="/login">Sign In</NavLink>
        )}
      </NavGroup>
    </HeaderBar>
  );
}

const HeaderBar = styled.header({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  boxSizing: "border-box",
  padding: "14px 24px",
  backgroundColor: "#0a1929",
  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
});

const BrandLink = styled(Link)({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  textDecoration: "none",
});

const BrandLogo = styled.img({
  height: "32px",
  width: "auto",
});

const BrandText = styled.span({
  fontFamily: '"Bai Jamjuree", sans-serif',
  color: "#FFFFFF",
  fontWeight: 700,
  fontSize: "1.05rem",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
});

const NavGroup = styled.nav({
  display: "flex",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
});

const NavLink = styled(Link)({
  color: "#0099f0",
  fontSize: "0.9rem",
  fontWeight: 600,
  textDecoration: "none",
  ":hover": {
    textDecoration: "underline",
  },
});

const IdentityText = styled.span({
  color: "#c7d4e1",
  fontSize: "0.9rem",
  maxWidth: "220px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const SignOutButton = styled.button({
  padding: "8px 14px",
  borderRadius: "8px",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  background: "none",
  color: "#FFFFFF",
  fontSize: "0.85rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background-color 0.2s",
  ":hover": {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
});
