import styled from "styled-components";

const baseControlStyles = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid rgba(255, 255, 255, 0.14)",
  backgroundColor: "#07111f",
  color: "#FFFFFF",
  fontSize: "0.9rem",
  outline: "none",
  transition: "border-color 0.2s",
  ":focus": {
    borderColor: "#0099f0",
  },
  ":disabled": {
    opacity: 0.5,
    cursor: "not-allowed",
  },
};

export const TextInput = styled.input(baseControlStyles);

export const TextArea = styled.textarea({
  ...baseControlStyles,
  minHeight: "96px",
  resize: "vertical",
  fontFamily: "inherit",
});

export const SelectInput = styled.select({
  ...baseControlStyles,
  cursor: "pointer",
});

export const PrimaryButton = styled.button({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "10px 18px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#0099f0",
  color: "#FFFFFF",
  fontSize: "0.9rem",
  fontWeight: 700,
  cursor: "pointer",
  transition: "opacity 0.2s",
  ":hover": {
    opacity: 0.9,
  },
  ":disabled": {
    opacity: 0.45,
    cursor: "not-allowed",
  },
});

export const SecondaryButton = styled.button({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "10px 18px",
  borderRadius: "8px",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  background: "none",
  color: "#FFFFFF",
  fontSize: "0.9rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background-color 0.2s",
  ":hover": {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  ":disabled": {
    opacity: 0.45,
    cursor: "not-allowed",
  },
});
