import React from "react";
import { Link, NavLink as RouterNavLink } from "react-router-dom";
import styled from "styled-components";

import { CourtChampLogoIcon } from "../assets";
import { useAuth } from "../context/AuthContext";
import RoleBadge from "./auth/RoleBadge";

export default function Header() {
  const { currentUser, role, loading, signOutUser } = useAuth();

  const displayIdentity = currentUser?.displayName ?? currentUser?.email ?? "";

  return (
    <HeaderBar>
      <BrandLink to="/">
        <BrandLogo src={CourtChampLogoIcon} alt="Court Champs" />
      </BrandLink>

      <PrimaryNav>
        <PrimaryLink to="/" end>
          Home
        </PrimaryLink>
        <PrimaryLink to="/players">Players</PrimaryLink>
      </PrimaryNav>

      <NavGroup>
        {loading ? null : currentUser ? (
          <>
            {role !== null && <NavLink to="/admin">Admin Panel</NavLink>}
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
  height: "42px",
  width: "auto",
});

const PrimaryNav = styled.nav({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginRight: "auto",
  marginLeft: "24px",
  "@media (max-width: 560px)": { marginLeft: "12px", gap: "4px" },
});

const PrimaryLink = styled(RouterNavLink)({
  padding: "8px 14px",
  borderRadius: "8px",
  color: "#c7d4e1",
  fontSize: "0.9rem",
  fontWeight: 600,
  textDecoration: "none",
  transition: "color 0.2s, background-color 0.2s",
  ":hover": { color: "#FFFFFF", backgroundColor: "rgba(255,255,255,0.06)" },
  "&.active": { color: "#FFFFFF", backgroundColor: "rgba(0,162,255,0.15)" },
  "@media (max-width: 560px)": { padding: "8px 10px" },
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
