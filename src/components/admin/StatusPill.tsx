import React, { memo } from "react";
import styled from "styled-components";

export type StatusTone =
  | "neutral"
  | "positive"
  | "warning"
  | "danger"
  | "info";

interface ToneStyle {
  textColor: string;
  backgroundColor: string;
  borderColor: string;
}

const TONE_STYLES: Record<StatusTone, ToneStyle> = {
  neutral: {
    textColor: "#8fb8d6",
    backgroundColor: "rgba(143, 184, 214, 0.14)",
    borderColor: "rgba(143, 184, 214, 0.45)",
  },
  positive: {
    textColor: "#5ce6a1",
    backgroundColor: "rgba(92, 230, 161, 0.14)",
    borderColor: "rgba(92, 230, 161, 0.45)",
  },
  warning: {
    textColor: "#f5c451",
    backgroundColor: "rgba(245, 196, 81, 0.14)",
    borderColor: "rgba(245, 196, 81, 0.45)",
  },
  danger: {
    textColor: "#ff7a7a",
    backgroundColor: "rgba(255, 122, 122, 0.14)",
    borderColor: "rgba(255, 122, 122, 0.45)",
  },
  info: {
    textColor: "#4db8ff",
    backgroundColor: "rgba(0, 153, 240, 0.16)",
    borderColor: "rgba(0, 153, 240, 0.55)",
  },
};

function StatusPill({
  tone,
  children,
}: {
  tone: StatusTone;
  children: React.ReactNode;
}) {
  const toneStyle = TONE_STYLES[tone];

  return (
    <Pill
      textColor={toneStyle.textColor}
      backgroundColor={toneStyle.backgroundColor}
      borderColor={toneStyle.borderColor}
    >
      {children}
    </Pill>
  );
}

export default memo(StatusPill);

const Pill = styled.span<{
  textColor: string;
  backgroundColor: string;
  borderColor: string;
}>(({ textColor, backgroundColor, borderColor }) => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "3px 10px",
  borderRadius: "999px",
  fontSize: "0.7rem",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: textColor,
  backgroundColor,
  border: `1px solid ${borderColor}`,
  whiteSpace: "nowrap",
}));
