import React, { memo } from "react";
import styled from "styled-components";

function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <FieldContainer>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {hint ? <FieldHint>{hint}</FieldHint> : null}
      {children}
      {error ? <FieldError>{error}</FieldError> : null}
    </FieldContainer>
  );
}

export default memo(FormField);

const FieldContainer = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  width: "100%",
});

const FieldLabel = styled.label({
  color: "#c7d4e1",
  fontSize: "0.85rem",
  fontWeight: 600,
});

const FieldHint = styled.span({
  color: "#8fa3b8",
  fontSize: "0.75rem",
});

const FieldError = styled.span({
  color: "#ff7a7a",
  fontSize: "0.75rem",
});
