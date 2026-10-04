import React, { memo, useEffect, useState } from "react";
import styled from "styled-components";

import { Ladder, LADDER_TYPE } from "courtchamps-shared/types";
import { LADDER_STATUS_LABELS } from "courtchamps-shared/helpers";
import { fetchLadderActivity } from "../../services/ladders";
import { LadderActivity as LadderActivityData } from "../../utils/ladderActivity";

interface ActivityStat {
  label: string;
  value: string;
  hint?: string;
  tone?: "warning" | "danger";
}

const formatMoney = (amount: number, currency: string): string =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    amount,
  );

const buildGroups = (
  ladder: Ladder,
  activity: LadderActivityData,
): { title: string; stats: ActivityStat[] }[] => {
  const entrantLabel =
    ladder.ladderType === LADDER_TYPE.DOUBLES
      ? "Teams entered"
      : "Players entered";
  const { matches } = activity;
  const isPaid = ladder.entryFee > 0;

  const groups: { title: string; stats: ActivityStat[] }[] = [
    {
      title: "Overview",
      stats: [
        { label: "Phase", value: LADDER_STATUS_LABELS[ladder.status] },
        {
          label: entrantLabel,
          value: `${activity.entrants} / ${activity.maxEntrants}`,
        },
        {
          label: "Playoff spots",
          value: String(activity.playoffSpots),
          hint:
            activity.playoffSpots === 0
              ? "Below the minimum for playoffs"
              : undefined,
          tone: activity.playoffSpots === 0 ? "warning" : undefined,
        },
        {
          label: "Days to playoffs",
          value:
            activity.daysToPlayoffs === null
              ? "Started"
              : String(activity.daysToPlayoffs),
        },
      ],
    },
    {
      title: "Matches",
      stats: [
        { label: "Games played", value: String(matches.gamesPlayed) },
        {
          label: "Awaiting approval",
          value: String(matches.gamesAwaitingApproval),
        },
        { label: "Open matches", value: String(matches.open) },
        { label: "In progress", value: String(matches.inProgress) },
        { label: "Completed", value: String(matches.completed) },
        { label: "Walkovers", value: String(matches.walkovers) },
        { label: "Cancelled", value: String(matches.cancelled) },
        { label: "Expired", value: String(matches.expired) },
      ],
    },
    {
      title: "Disputes & reports",
      stats: [
        {
          label: "Open disputes",
          value: String(activity.openDisputes),
          tone: activity.openDisputes > 0 ? "warning" : undefined,
        },
        {
          label: "Resolved disputes",
          value: String(activity.resolvedDisputes),
        },
        {
          label: "Pending reports",
          value: String(activity.pendingReports),
          tone: activity.pendingReports > 0 ? "warning" : undefined,
        },
      ],
    },
  ];

  if (isPaid) {
    groups.push({
      title: "Money",
      stats: [
        {
          label: "Entry fees collected",
          value: formatMoney(activity.entryFeesCollected, ladder.currencyType),
        },
        {
          label: "Platform fees",
          value: formatMoney(activity.platformFees, ladder.currencyType),
        },
        {
          label: "Prize pool",
          value: formatMoney(activity.prizePool, ladder.currencyType),
        },
        {
          label: "Refunds",
          value: "—",
          hint: "Refunds are not recorded yet",
        },
      ],
    });
  }

  return groups;
};

function LadderActivity({ ladder }: { ladder: Ladder }) {
  const [activity, setActivity] = useState<LadderActivityData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setActivity(null);
    setLoadError(null);
    fetchLadderActivity({ ladder })
      .then((loaded) => {
        if (isActive) setActivity(loaded);
      })
      .catch((fetchError) => {
        console.error("Failed to load ladder activity", fetchError);
        if (isActive) setLoadError("Could not load ladder activity.");
      });
    return () => {
      isActive = false;
    };
  }, [ladder]);

  return (
    <Panel data-testid="ladder-activity">
      <PanelTitle>Ladder activity</PanelTitle>
      {loadError ? (
        <ErrorText>{loadError}</ErrorText>
      ) : !activity ? (
        <LoadingText>Loading activity…</LoadingText>
      ) : (
        buildGroups(ladder, activity).map((group) => (
          <Group key={group.title}>
            <GroupTitle>{group.title}</GroupTitle>
            <StatGrid>
              {group.stats.map((stat) => (
                <StatCard key={stat.label} tone={stat.tone}>
                  <StatLabel>{stat.label}</StatLabel>
                  <StatValue>{stat.value}</StatValue>
                  {stat.hint ? <StatHint>{stat.hint}</StatHint> : null}
                </StatCard>
              ))}
            </StatGrid>
          </Group>
        ))
      )}
    </Panel>
  );
}

export default memo(LadderActivity);

const TONE_BORDERS: Record<NonNullable<ActivityStat["tone"]>, string> = {
  warning: "rgba(245, 196, 81, 0.45)",
  danger: "rgba(255, 122, 122, 0.45)",
};

const Panel = styled.section({
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  padding: "24px",
  marginBottom: "24px",
  borderRadius: "16px",
  backgroundColor: "#0a1929",
  border: "1px solid rgba(255, 255, 255, 0.08)",
});

const PanelTitle = styled.h2({
  color: "#FFFFFF",
  fontSize: "1.05rem",
  fontWeight: 700,
  margin: 0,
});

const Group = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: "10px",
});

const GroupTitle = styled.h3({
  color: "#8fa3b8",
  fontSize: "0.8rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  margin: 0,
});

const StatGrid = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
  gap: "12px",
});

const StatCard = styled.div<{ tone?: ActivityStat["tone"] }>(({ tone }) => ({
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  padding: "14px 16px",
  borderRadius: "12px",
  backgroundColor: "rgba(255, 255, 255, 0.03)",
  border: `1px solid ${tone ? TONE_BORDERS[tone] : "rgba(255, 255, 255, 0.08)"}`,
}));

const StatLabel = styled.span({
  color: "#8fa3b8",
  fontSize: "0.78rem",
});

const StatValue = styled.span({
  color: "#FFFFFF",
  fontSize: "1.3rem",
  fontWeight: 700,
});

const StatHint = styled.span({
  color: "#8fa3b8",
  fontSize: "0.72rem",
});

const LoadingText = styled.div({
  color: "#8fa3b8",
  fontSize: "0.9rem",
});

const ErrorText = styled.div({
  color: "#ff9a9a",
  fontSize: "0.85rem",
});
