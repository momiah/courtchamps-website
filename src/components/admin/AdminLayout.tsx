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
      <TopHeader>
        <HeaderBrand to="/">
          <BrandLogo src={CourtChampLogoIcon} alt="Court Champs" />
        </HeaderBrand>
        <HeaderRight>
          <HeaderTitle>{title}</HeaderTitle>
          <HamburgerButton
            type="button"
            aria-label="Open menu"
            onClick={openDrawer}
          >
            <FaBars />
          </HamburgerButton>
        </HeaderRight>
      </TopHeader>

      <BodyRow>
        <Sidebar open={isDrawerOpen}>
          <SidebarInner>
            <SidebarTop>
              <SidebarHeading>Admin</SidebarHeading>
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
          </SidebarInner>
        </Sidebar>

        {isDrawerOpen ? <DrawerBackdrop onClick={closeDrawer} /> : null}

        <ContentColumn>
          <MainContent>
            <PageTitle>{title}</PageTitle>
            {children}
          </MainContent>
        </ContentColumn>
      </BodyRow>
    </LayoutRoot>
  );
}

export default memo(AdminLayout);

const SIDEBAR_WIDTH = 240;
const HEADER_HEIGHT = 71;
const MOBILE_BREAKPOINT = "@media (max-width: 900px)";

const LayoutRoot = styled.div({
  minHeight: "100vh",
  backgroundColor: "#07111f",
});

const TopHeader = styled.header({
  position: "sticky",
  top: 0,
  zIndex: 120,
  display: "flex",
  alignItems: "center",
  height: `${HEADER_HEIGHT}px`,
  boxSizing: "border-box",
  backgroundColor: "#0a1929",
  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
});

const HeaderBrand = styled(NavLink)({
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
  width: `${SIDEBAR_WIDTH}px`,
  height: "100%",
  padding: "0 16px",
  boxSizing: "border-box",
  textDecoration: "none",
  borderRight: "1px solid rgba(255, 255, 255, 0.08)",
  [MOBILE_BREAKPOINT]: {
    width: "auto",
    borderRight: "none",
  },
});

const BrandLogo = styled.img({
  height: "42px",
  width: "auto",
});

const HeaderRight = styled.div({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flex: 1,
  padding: "0 40px",
  "@media (max-width: 600px)": {
    padding: "0 20px",
  },
});

const HeaderTitle = styled.span({
  color: "#FFFFFF",
  fontSize: "1.1rem",
  fontWeight: 700,
  [MOBILE_BREAKPOINT]: {
    display: "none",
  },
});

const HamburgerButton = styled.button({
  display: "none",
  border: "none",
  background: "none",
  color: "#FFFFFF",
  fontSize: "1.3rem",
  cursor: "pointer",
  padding: "4px",
  [MOBILE_BREAKPOINT]: {
    display: "inline-flex",
    marginLeft: "auto",
  },
});

const BodyRow = styled.div({
  display: "flex",
  alignItems: "stretch",
  minHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
});

const Sidebar = styled.aside<{ open: boolean }>(({ open }) => ({
  width: `${SIDEBAR_WIDTH}px`,
  flexShrink: 0,
  backgroundColor: "#0a1929",
  borderRight: "1px solid rgba(255, 255, 255, 0.08)",
  [MOBILE_BREAKPOINT]: {
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 200,
    height: "100vh",
    transform: open ? "translateX(0)" : "translateX(-100%)",
    transition: "transform 0.25s ease",
    boxShadow: open ? "8px 0 32px rgba(0, 0, 0, 0.5)" : "none",
  },
}));

const SidebarInner = styled.div({
  position: "sticky",
  top: `${HEADER_HEIGHT}px`,
  height: `calc(100vh - ${HEADER_HEIGHT}px)`,
  display: "flex",
  flexDirection: "column",
  boxSizing: "border-box",
  padding: "20px 16px",
  [MOBILE_BREAKPOINT]: {
    position: "static",
    height: "100vh",
  },
});

const SidebarTop = styled.div({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "16px",
});

const SidebarHeading = styled.span({
  color: "#8fa3b8",
  fontSize: "0.72rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
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
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
});

const MainContent = styled.main({
  flex: 1,
  boxSizing: "border-box",
  width: "100%",
  padding: "32px 40px 48px",
  "@media (max-width: 600px)": {
    padding: "24px 20px 40px",
  },
});

const PageTitle = styled.h1({
  color: "#FFFFFF",
  fontSize: "1.35rem",
  fontWeight: 700,
  margin: "0 0 24px",
  "@media (min-width: 901px)": {
    display: "none",
  },
});
