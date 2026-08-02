import React, { memo } from "react";
import styled from "styled-components";

export interface FilterTabItem<TabId extends string> {
  id: TabId;
  label: string;
  count?: number;
}

function FilterTabs<TabId extends string>({
  tabs,
  activeTabId,
  onTabChange,
}: {
  tabs: FilterTabItem<TabId>[];
  activeTabId: TabId;
  onTabChange: (tabId: TabId) => void;
}) {
  return (
    <TabRow>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <TabButton
            key={tab.id}
            type="button"
            active={isActive}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <CountBadge active={isActive}>{tab.count}</CountBadge>
            ) : null}
          </TabButton>
        );
      })}
    </TabRow>
  );
}

export default memo(FilterTabs) as typeof FilterTabs;

const TabRow = styled.div({
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
});

const TabButton = styled.button<{ active: boolean }>(({ active }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 14px",
  borderRadius: "999px",
  border: active
    ? "1px solid #0099f0"
    : "1px solid rgba(255, 255, 255, 0.14)",
  backgroundColor: active ? "rgba(0, 153, 240, 0.16)" : "transparent",
  color: active ? "#4db8ff" : "#c7d4e1",
  fontSize: "0.85rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background-color 0.2s, border-color 0.2s, color 0.2s",
  ":hover": {
    borderColor: "#0099f0",
  },
}));

const CountBadge = styled.span<{ active: boolean }>(({ active }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "20px",
  height: "20px",
  padding: "0 6px",
  borderRadius: "999px",
  fontSize: "0.7rem",
  fontWeight: 700,
  color: "#FFFFFF",
  backgroundColor: active ? "#0099f0" : "rgba(255, 255, 255, 0.16)",
}));
