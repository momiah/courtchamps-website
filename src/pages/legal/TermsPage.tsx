import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import {
  COURT_CHAMPS_CONTACT_EMAIL,
  LADDER_TERMS,
  LADDER_TERMS_INTRO,
  PRIVACY_POLICY_URL,
  TERMS_OF_USE,
  TERMS_OF_USE_INTRO,
  TERMS_VERSION_LINE,
  getLadderRules,
} from "courtchamps-shared";

import LegalSections from "../../components/legal/LegalSections";
import { FooterText, PageContainer } from "../join/joinParts";

export const TERMS_ANCHORS = {
  termsOfUse: "terms-of-use",
  ladderTerms: "ladder-terms",
  ladderRules: "ladder-rules",
} as const;

const TermsPage: React.FC = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <PageContainer>
      <Content>
        <PageTitle>Terms &amp; Conditions</PageTitle>
        <Version data-testid="terms-version">{TERMS_VERSION_LINE}</Version>
        <Contents>
          <a href={`#${TERMS_ANCHORS.termsOfUse}`}>Terms of Use</a>
          <a href={`#${TERMS_ANCHORS.ladderTerms}`}>Ladder Terms</a>
          <a href={`#${TERMS_ANCHORS.ladderRules}`}>Ladder Rules</a>
          <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
        </Contents>

        <DocumentTitle id={TERMS_ANCHORS.termsOfUse}>Terms of Use</DocumentTitle>
        <Intro>{TERMS_OF_USE_INTRO}</Intro>
        <LegalSections sections={TERMS_OF_USE} idPrefix={TERMS_ANCHORS.termsOfUse} />
        <Intro>
          Read how we use your personal data in our{" "}
          <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
          .
        </Intro>

        <DocumentTitle id={TERMS_ANCHORS.ladderTerms}>Ladder Terms</DocumentTitle>
        <Intro>{LADDER_TERMS_INTRO}</Intro>
        <LegalSections sections={LADDER_TERMS} idPrefix={TERMS_ANCHORS.ladderTerms} />

        <DocumentTitle id={TERMS_ANCHORS.ladderRules}>Ladder Rules</DocumentTitle>
        <Intro>
          The Rules form part of the Ladder Terms. On a doubles ladder, every
          rule for a player applies to your team.
        </Intro>
        <LegalSections
          sections={getLadderRules("player")}
          idPrefix={TERMS_ANCHORS.ladderRules}
        />

        <Intro>
          Questions about these terms? Email{" "}
          <a href={`mailto:${COURT_CHAMPS_CONTACT_EMAIL}`}>
            {COURT_CHAMPS_CONTACT_EMAIL}
          </a>
          .
        </Intro>
      </Content>
      <FooterText>© {new Date().getFullYear()} Court Champs</FooterText>
    </PageContainer>
  );
};

export default TermsPage;

const Content = styled.div({
  width: "100%",
  maxWidth: 760,
  paddingTop: 16,
  "a": { color: "#00A2FF" },
});

const PageTitle = styled.h1({
  fontSize: 30,
  margin: "0 0 6px",
});

const Version = styled.div({
  fontSize: 13,
  color: "#93a7bd",
  marginBottom: 16,
});

const Contents = styled.nav({
  display: "flex",
  flexWrap: "wrap",
  gap: 16,
  marginBottom: 24,
  fontSize: 14,
  "a": { textDecoration: "none" },
});

const DocumentTitle = styled.h2({
  fontSize: 22,
  margin: "32px 0 8px",
  scrollMarginTop: 80,
});

const Intro = styled.p({
  fontSize: 14,
  color: "#9fb8c8",
  lineHeight: 1.6,
  margin: "0 0 14px",
});
