import React, { memo } from "react";
import styled from "styled-components";

import Modal from "./Modal";

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel} width={420}>
      <Message>{message}</Message>
      {error ? <DialogError>{error}</DialogError> : null}
      <ActionRow>
        <CancelButton type="button" onClick={onCancel} disabled={busy}>
          {cancelLabel ?? "Cancel"}
        </CancelButton>
        <ConfirmButton
          type="button"
          onClick={onConfirm}
          disabled={busy}
          destructive={destructive === true}
        >
          {busy ? "Working…" : confirmLabel ?? "Confirm"}
        </ConfirmButton>
      </ActionRow>
    </Modal>
  );
}

export default memo(ConfirmDialog);

const Message = styled.p({
  color: "#c7d4e1",
  fontSize: "0.95rem",
  lineHeight: 1.5,
  margin: "0 0 24px",
});

const DialogError = styled.p({
  color: "#ff9a9a",
  fontSize: "0.85rem",
  margin: "0 0 16px",
});

const ActionRow = styled.div({
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
});

const CancelButton = styled.button({
  padding: "9px 16px",
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
  ":disabled": {
    opacity: 0.5,
    cursor: "not-allowed",
  },
});

const ConfirmButton = styled.button<{ destructive: boolean }>(
  ({ destructive }) => ({
    padding: "9px 16px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: destructive ? "#e05555" : "#0099f0",
    color: "#FFFFFF",
    fontSize: "0.85rem",
    fontWeight: 700,
    cursor: "pointer",
    transition: "opacity 0.2s",
    ":hover": {
      opacity: 0.9,
    },
    ":disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  }),
);
