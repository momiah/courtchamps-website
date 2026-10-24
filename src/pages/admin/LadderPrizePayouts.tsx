import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";

import AdminLayout from "../../components/admin/AdminLayout";
import AdminTable, { AdminTableColumn } from "../../components/admin/AdminTable";
import StatusPill, { StatusTone } from "../../components/admin/StatusPill";
import { useAuth } from "../../context/AuthContext";
import { fetchLadder } from "../../services/ladders";
import {
  EnrichedPrizePayout,
  fetchLadderPrizePayouts,
  submitPrizeReview,
  validatePrizeReview,
} from "../../services/prizePayouts";
import {
  LADDER_PRIZE_PAYOUT_STATUS,
  LADDER_PRIZE_POT_NAME,
  LADDER_PRIZE_REVIEW_DECISION,
} from "courtchamps-shared/types";
import type {
  Ladder,
  LadderPrizeAmount,
  LadderPrizePayoutStatus,
  LadderPrizeReviewDecision,
} from "courtchamps-shared/types";
import { formatLadderPrizeWon, ordinalPlace } from "courtchamps-shared/helpers";

type LadderWithPot = Ladder & {
  unclaimedPrizePot?: LadderPrizeAmount;
  retainedPrizeMoney?: LadderPrizeAmount;
};

const STATUS_LABELS: Record<LadderPrizePayoutStatus, { label: string; tone: StatusTone }> = {
  paid: { label: "Paid", tone: "positive" },
  held: { label: "Under review", tone: "warning" },
  partPaid: { label: "Part paid", tone: "info" },
  withheld: { label: "Not paid", tone: "danger" },
  kept: { label: "Retained", tone: "neutral" },
};

const NOTHING: LadderPrizeAmount = { cash: 0, cp: 0 };

const add = (a: LadderPrizeAmount, b: LadderPrizeAmount): LadderPrizeAmount => ({
  cash: a.cash + b.cash,
  cp: a.cp + b.cp,
});

const minus = (a: LadderPrizeAmount, b: LadderPrizeAmount): LadderPrizeAmount => ({
  cash: a.cash - b.cash,
  cp: a.cp - b.cp,
});

const placeOf = (payout: EnrichedPrizePayout): string =>
  `${payout.voided ? "Joint " : ""}${ordinalPlace(payout.place)}`;

function ReviewForm({
  payout,
  currencyType,
  onSubmitted,
}: {
  payout: EnrichedPrizePayout;
  currencyType: string;
  onSubmitted: () => void;
}) {
  const { currentUser } = useAuth();
  const [decision, setDecision] = useState<LadderPrizeReviewDecision>(
    LADDER_PRIZE_REVIEW_DECISION.PAY,
  );
  const [cash, setCash] = useState("");
  const [cp, setCp] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const hasCash = payout.prize.cash > 0;

  const submit = async (): Promise<void> => {
    const review = {
      decision,
      amount: { cash: Number(cash || 0), cp: Number(cp || 0) },
      reason,
    };
    const invalid = validatePrizeReview(payout, review);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await submitPrizeReview({
        ladderId: payout.ladderId,
        payoutId: payout.payoutId,
        review,
        adminUserId: currentUser?.uid ?? "admin",
      });
      onSubmitted();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save the decision.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ReviewCard data-testid={`prize-review-${payout.payoutId}`}>
      <ReviewHeader>
        <strong>
          {payout.username} · {placeOf(payout)} place
        </strong>
        <StatusPill tone="warning">Under review</StatusPill>
      </ReviewHeader>
      <Meta>
        Prize: {formatLadderPrizeWon(payout.prize, currencyType) ?? "—"}
        {payout.sidePlayerIds.length > 1 ? " (this player's half of the team prize)" : ""}
      </Meta>
      <Meta>Why it's held: {payout.reason ?? "Disqualified from the ladder"}</Meta>

      <Choices>
        {[
          { value: LADDER_PRIZE_REVIEW_DECISION.PAY, label: "Pay in full" },
          { value: LADDER_PRIZE_REVIEW_DECISION.PAY_PART, label: "Pay part" },
          { value: LADDER_PRIZE_REVIEW_DECISION.WITHHOLD, label: "Don't pay" },
        ].map((choice) => (
          <Choice key={choice.value}>
            <input
              type="radio"
              name={`decision-${payout.payoutId}`}
              checked={decision === choice.value}
              onChange={() => setDecision(choice.value)}
            />
            {choice.label}
          </Choice>
        ))}
      </Choices>

      {decision === LADDER_PRIZE_REVIEW_DECISION.PAY_PART ? (
        <Amounts>
          {hasCash ? (
            <label>
              Cash ({currencyType})
              <Input
                type="number"
                min={0}
                step="0.01"
                value={cash}
                onChange={(event) => setCash(event.target.value)}
              />
            </label>
          ) : null}
          <label>
            CP
            <Input
              type="number"
              min={0}
              step="1"
              value={cp}
              onChange={(event) => setCp(event.target.value)}
            />
          </label>
        </Amounts>
      ) : null}

      <label>
        Reason (the player sees this)
        <TextArea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} />
      </label>
      <Note>Anything not paid is retained by Court Champs.</Note>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <SubmitButton type="button" onClick={() => void submit()} disabled={saving}>
        {saving ? "Saving…" : "Save decision"}
      </SubmitButton>
    </ReviewCard>
  );
}

function LadderPrizePayouts() {
  const { ladderId } = useParams<{ ladderId: string }>();
  const navigate = useNavigate();
  const [ladder, setLadder] = useState<LadderWithPot | null>(null);
  const [payouts, setPayouts] = useState<EnrichedPrizePayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!ladderId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [loadedLadder, loadedPayouts] = await Promise.all([
        fetchLadder({ ladderId }),
        fetchLadderPrizePayouts(ladderId),
      ]);
      setLadder(loadedLadder as LadderWithPot | null);
      setPayouts(loadedPayouts);
    } catch (error) {
      console.error("Failed to load prize payouts", error);
      setLoadError("Could not load prize payouts. Please refresh to try again.");
    } finally {
      setLoading(false);
    }
  }, [ladderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const currencyType = ladder?.currencyType ?? "GBP";
  const money = useCallback(
    (amount: LadderPrizeAmount) => formatLadderPrizeWon(amount, currencyType) ?? "—",
    [currencyType],
  );

  const totals = useMemo(() => {
    const paid = payouts.reduce((sum, payout) => add(sum, payout.paid ?? NOTHING), NOTHING);
    const retainedFromPlayers = payouts
      .filter((payout) => payout.status !== LADDER_PRIZE_PAYOUT_STATUS.HELD)
      .reduce((sum, payout) => add(sum, minus(payout.prize, payout.paid ?? NOTHING)), NOTHING);
    return {
      paid,
      held: payouts.filter((payout) => payout.status === LADDER_PRIZE_PAYOUT_STATUS.HELD).length,
      retained: add(retainedFromPlayers, ladder?.retainedPrizeMoney ?? NOTHING),
    };
  }, [payouts, ladder]);

  const columns = useMemo<AdminTableColumn<EnrichedPrizePayout>[]>(
    () => [
      { key: "place", header: "Place", render: (payout) => placeOf(payout) },
      {
        key: "player",
        header: "Player",
        render: (payout) => (
          <Cell>
            <strong>{payout.username}</strong>
            {payout.sidePlayerIds.length > 1 ? <Meta>Doubles · half of the team prize</Meta> : null}
          </Cell>
        ),
      },
      { key: "placePrize", header: "Place prize", render: (payout) => money(payout.placePrize) },
      {
        key: "pot",
        header: LADDER_PRIZE_POT_NAME,
        render: (payout) => money(payout.potShare),
      },
      { key: "paid", header: "Paid", render: (payout) => money(payout.paid ?? NOTHING) },
      {
        key: "status",
        header: "Status",
        render: (payout) => (
          <Cell>
            <StatusPill tone={STATUS_LABELS[payout.status].tone}>
              {STATUS_LABELS[payout.status].label}
            </StatusPill>
            {payout.review?.reason ? <Meta>{payout.review.reason}</Meta> : payout.reason ? <Meta>{payout.reason}</Meta> : null}
          </Cell>
        ),
      },
    ],
    [money],
  );

  const held = payouts.filter((payout) => payout.status === LADDER_PRIZE_PAYOUT_STATUS.HELD);

  return (
    <AdminLayout title={`Prize payouts${ladder ? ` · ${ladder.name}` : ""}`}>
      <BackButton type="button" onClick={() => navigate(`/admin/ladders/${ladderId}`)}>
        ← Back to ladder
      </BackButton>
      <Intro>
        Every player's prize from the playoffs. A disqualified player's prize is held until you
        decide to pay it in full, pay part of it, or not pay it. The player is told your decision
        and reason. Prizes of deleted accounts, and anything you don't pay, are retained by Court
        Champs.
      </Intro>

      {loading ? (
        <StateCard>Loading prize payouts…</StateCard>
      ) : loadError ? (
        <StateCard>{loadError}</StateCard>
      ) : !ladder?.prizesDistributed ? (
        <StateCard>Prizes are paid when the playoffs finish. Nothing has been paid yet.</StateCard>
      ) : (
        <>
          <Summary>
            <SummaryCard>
              <Label>Paid out</Label>
              <Value>{money(totals.paid)}</Value>
            </SummaryCard>
            <SummaryCard>
              <Label>{LADDER_PRIZE_POT_NAME}</Label>
              <Value>{money(ladder.unclaimedPrizePot ?? NOTHING)}</Value>
              <Meta>Shared equally between everyone in the money who played</Meta>
            </SummaryCard>
            <SummaryCard>
              <Label>Retained by Court Champs</Label>
              <Value>{money(totals.retained)}</Value>
            </SummaryCard>
            <SummaryCard warning={totals.held > 0}>
              <Label>Under review</Label>
              <Value>{totals.held}</Value>
            </SummaryCard>
          </Summary>

          {held.length ? (
            <Section>
              <SectionTitle>Needs your decision</SectionTitle>
              {held.map((payout) => (
                <ReviewForm
                  key={payout.payoutId}
                  payout={payout}
                  currencyType={currencyType}
                  onSubmitted={() => void load()}
                />
              ))}
            </Section>
          ) : null}

          <Section>
            <SectionTitle>All payouts</SectionTitle>
            <AdminTable<EnrichedPrizePayout>
              columns={columns}
              rows={payouts}
              rowKey={(payout) => payout.payoutId}
              emptyState={<span>No player finished in the money.</span>}
            />
          </Section>
        </>
      )}
    </AdminLayout>
  );
}

export default LadderPrizePayouts;

const Intro = styled.p({ color: "#8fa3b8", fontSize: "0.9rem", lineHeight: 1.5, margin: "12px 0 20px", maxWidth: "760px" });
const BackButton = styled.button({ background: "none", border: "none", color: "#00A2FF", cursor: "pointer", padding: 0, fontSize: "0.85rem" });
const StateCard = styled.div({ padding: "20px", borderRadius: "12px", backgroundColor: "#0a1929", border: "1px solid rgba(255, 255, 255, 0.08)", color: "#8fa3b8", fontSize: "0.9rem" });
const Summary = styled.div({ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" });
const SummaryCard = styled.div<{ warning?: boolean }>(({ warning }) => ({ padding: "16px", borderRadius: "12px", backgroundColor: "#0a1929", border: `1px solid ${warning ? "rgba(245, 196, 81, 0.45)" : "rgba(255, 255, 255, 0.08)"}`, display: "flex", flexDirection: "column", gap: "4px" }));
const Label = styled.span({ color: "#8fa3b8", fontSize: "0.8rem" });
const Value = styled.span({ color: "#fff", fontSize: "1.2rem", fontWeight: 700 });
const Meta = styled.span({ color: "#8fa3b8", fontSize: "0.8rem" });
const Cell = styled.div({ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" });
const Section = styled.section({ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" });
const SectionTitle = styled.h3({ color: "#fff", fontSize: "1rem", margin: 0 });
const ReviewCard = styled.div({ display: "flex", flexDirection: "column", gap: "10px", padding: "16px", borderRadius: "12px", backgroundColor: "#0a1929", border: "1px solid rgba(245, 196, 81, 0.45)", color: "#c7d6e5", fontSize: "0.88rem", maxWidth: "640px" });
const ReviewHeader = styled.div({ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", color: "#fff" });
const Choices = styled.div({ display: "flex", gap: "16px", flexWrap: "wrap" });
const Choice = styled.label({ display: "flex", gap: "6px", alignItems: "center", cursor: "pointer" });
const Amounts = styled.div({ display: "flex", gap: "12px", flexWrap: "wrap" });
const Input = styled.input({ display: "block", marginTop: "4px", padding: "8px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.15)", backgroundColor: "#061423", color: "#fff", width: "140px" });
const TextArea = styled.textarea({ display: "block", marginTop: "4px", padding: "8px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.15)", backgroundColor: "#061423", color: "#fff", width: "100%", boxSizing: "border-box" });
const Note = styled.span({ color: "#8fa3b8", fontSize: "0.8rem" });
const ErrorText = styled.span({ color: "#ff7a7a", fontSize: "0.85rem" });
const SubmitButton = styled.button({ alignSelf: "flex-start", padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(0, 162, 255, 0.4)", backgroundColor: "rgba(0, 162, 255, 0.12)", color: "#00A2FF", fontWeight: 700, cursor: "pointer" });
