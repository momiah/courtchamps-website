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

export const TextInput = styled.input({
  ...baseControlStyles,
  "&[type=date]": {
    cursor: "pointer",
  },
  "&::-webkit-calendar-picker-indicator": {
    filter: "invert(0.85)",
    cursor: "pointer",
    opacity: 0.85,
  },
});

export const TextArea = styled.textarea({
  ...baseControlStyles,
  minHeight: "96px",
  resize: "vertical",
  fontFamily: "inherit",
});

export const SelectInput = styled.select({
  ...baseControlStyles,
  cursor: "pointer",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  paddingRight: "38px",
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='16'%20height='16'%20viewBox='0%200%2024%2024'%20fill='none'%20stroke='%238fa3b8'%20stroke-width='2'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Cpolyline%20points='6%209%2012%2015%2018%209'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  backgroundSize: "16px",
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
  transition: "opacity 0.2s, background-color 0.2s",
  "&:hover:not(:disabled)": {
    opacity: 0.9,
  },
  ":disabled": {
    backgroundColor: "#1b2b3b",
    color: "#5f7183",
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
  "&:hover:not(:disabled)": {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  ":disabled": {
    borderColor: "rgba(255, 255, 255, 0.08)",
    color: "#5f7183",
    cursor: "not-allowed",
  },
});
