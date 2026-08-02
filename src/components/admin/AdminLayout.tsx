import React, { memo, useCallback, useState } from "react";
import { NavLink } from "react-router-dom";
import styled from "styled-components";
import {
  FaBars,
  FaCommentDots,
  FaFlag,
  FaListOl,
  FaMapMarkerAlt,
  FaTicketAlt,
  FaTimes,
} from "react-icons/fa";
import type { IconType } from "react-icons";

import { CourtChampLogoIcon } from "../../assets";
import { useAuth } from "../../context/AuthContext";
import RoleBadge from "../auth/RoleBadge";

interface AdminNavItem {
  label: string;
  to: string;
  icon: IconType;
}

const NAV_ITEMS: AdminNavItem[] = [
  { label: "Ladders", to: "/admin/ladders", icon: FaListOl },
  { label: "Courts", to: "/admin/courts", icon: FaMapMarkerAlt },
  { label: "Support Tickets", to: "/admin/support", icon: FaTicketAlt },
  { label: "Feedback", to: "/admin/feedback", icon: FaCommentDots },
  { label: "Game Disputes", to: "/admin/disputes", icon: FaFlag },
];

function AdminLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { currentUser, role, signOutUser } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const handleSignOut = useCallback(() => {
    void signOutUser();
  }, [signOutUser]);

  const signedInEmail = currentUser?.email ?? "";

  return (
    <LayoutRoot>
      <Sidebar open={isDrawerOpen}>
        <SidebarTop>
          <BrandRow>
            <BrandLogo src={CourtChampLogoIcon} alt="Court Champs" />
            <BrandText>Admin</BrandText>
          </BrandRow>
          <DrawerCloseButton
            type="button"
            aria-label="Close menu"
            onClick={closeDrawer}
          >
            <FaTimes />
          </DrawerCloseButton>
        </SidebarTop>

        <NavList>
          {NAV_ITEMS.map((navItem) => {
            const NavIcon = navItem.icon;
            return (
              <NavItemLink
                key={navItem.to}
                to={navItem.to}
                onClick={closeDrawer}
              >
                <NavIcon aria-hidden />
                <span>{navItem.label}</span>
              </NavItemLink>
            );
          })}
        </NavList>

        <SidebarFooter>
          <FooterEmail title={signedInEmail}>{signedInEmail}</FooterEmail>
          {role !== null ? <RoleBadge role={role} /> : null}
          <SignOutButton type="button" onClick={handleSignOut}>
            Sign Out
          </SignOutButton>
        </SidebarFooter>
      </Sidebar>

      {isDrawerOpen ? <DrawerBackdrop onClick={closeDrawer} /> : null}

      <ContentColumn>
        <MobileTopBar>
          <HamburgerButton
            type="button"
            aria-label="Open menu"
            onClick={openDrawer}
          >
            <FaBars />
          </HamburgerButton>
          <MobileTitle>{title}</MobileTitle>
        </MobileTopBar>

        <MainContent>
          <PageTitle>{title}</PageTitle>
          {children}
        </MainContent>
      </ContentColumn>
    </LayoutRoot>
  );
}

export default memo(AdminLayout);

const SIDEBAR_WIDTH = 240;
const MOBILE_BREAKPOINT = "@media (max-width: 900px)";

const LayoutRoot = styled.div({
  minHeight: "100vh",
  backgroundColor: "#07111f",
});

const Sidebar = styled.aside<{ open: boolean }>(({ open }) => ({
  position: "fixed",
  top: 0,
  left: 0,
  zIndex: 200,
  display: "flex",
  flexDirection: "column",
  width: `${SIDEBAR_WIDTH}px`,
  height: "100vh",
  boxSizing: "border-box",
  padding: "20px 16px",
  backgroundColor: "#0a1929",
  borderRight: "1px solid rgba(255, 255, 255, 0.08)",
  [MOBILE_BREAKPOINT]: {
    transform: open ? "translateX(0)" : "translateX(-100%)",
    transition: "transform 0.25s ease",
    boxShadow: open ? "8px 0 32px rgba(0, 0, 0, 0.5)" : "none",
  },
}));

const SidebarTop = styled.div({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "28px",
});

const BrandRow = styled.div({
  display: "flex",
  alignItems: "center",
  gap: "10px",
});

const BrandLogo = styled.img({
  height: "36px",
  width: "auto",
});

const BrandText = styled.span({
  color: "#FFFFFF",
  fontSize: "1rem",
  fontWeight: 700,
  letterSpacing: "0.02em",
});

const DrawerCloseButton = styled.button({
  display: "none",
  border: "none",
  background: "none",
  color: "#8fa3b8",
  fontSize: "1.2rem",
  cursor: "pointer",
  padding: "4px",
  [MOBILE_BREAKPOINT]: {
    display: "inline-flex",
  },
});

const NavList = styled.nav({
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  flex: 1,
});

const NavItemLink = styled(NavLink)({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "11px 12px",
  borderRadius: "10px",
  color: "#c7d4e1",
  fontSize: "0.92rem",
  fontWeight: 600,
  textDecoration: "none",
  transition: "background-color 0.15s, color 0.15s",
  ":hover": {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    color: "#FFFFFF",
  },
  "&.active": {
    backgroundColor: "rgba(0, 153, 240, 0.16)",
    color: "#4db8ff",
  },
});

const SidebarFooter = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "10px",
  paddingTop: "16px",
  marginTop: "16px",
  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
});

const FooterEmail = styled.span({
  color: "#c7d4e1",
  fontSize: "0.8rem",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const SignOutButton = styled.button({
  width: "100%",
  padding: "9px 14px",
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

const DrawerBackdrop = styled.div({
  display: "none",
  [MOBILE_BREAKPOINT]: {
    display: "block",
    position: "fixed",
    inset: 0,
    zIndex: 150,
    backgroundColor: "rgba(3, 10, 20, 0.6)",
  },
});

const ContentColumn = styled.div({
  marginLeft: `${SIDEBAR_WIDTH}px`,
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  [MOBILE_BREAKPOINT]: {
    marginLeft: 0,
  },
});

const MobileTopBar = styled.div({
  display: "none",
  [MOBILE_BREAKPOINT]: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "14px 20px",
    backgroundColor: "#0a1929",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
});

const HamburgerButton = styled.button({
  border: "none",
  background: "none",
  color: "#FFFFFF",
  fontSize: "1.3rem",
  cursor: "pointer",
  padding: "4px",
  display: "inline-flex",
});

const MobileTitle = styled.span({
  color: "#FFFFFF",
  fontSize: "1.05rem",
  fontWeight: 700,
});

const MainContent = styled.main({
  flex: 1,
  boxSizing: "border-box",
  padding: "32px 40px",
  maxWidth: "1200px",
  width: "100%",
  "@media (max-width: 600px)": {
    padding: "24px 20px",
  },
});

const PageTitle = styled.h1({
  color: "#FFFFFF",
  fontSize: "1.6rem",
  fontWeight: 700,
  margin: "0 0 24px",
  "@media (max-width: 900px)": {
    display: "none",
  },
});
