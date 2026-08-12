import React, { memo, useCallback, useEffect } from "react";
import styled from "styled-components";

function Modal({
  title,
  onClose,
  children,
  width,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  useEffect(() => {
    const handleKeyDown = (keyboardEvent: KeyboardEvent): void => {
      if (keyboardEvent.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  const stopPropagation = useCallback(
    (mouseEvent: React.MouseEvent<HTMLDivElement>) => {
      mouseEvent.stopPropagation();
    },
    [],
  );

  return (
    <Backdrop onClick={handleBackdropClick}>
      <Card onClick={stopPropagation} cardWidth={width ?? 520}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CloseButton type="button" onClick={onClose} aria-label="Close">
            ×
          </CloseButton>
        </CardHeader>
        <CardBody>{children}</CardBody>
      </Card>
    </Backdrop>
  );
}

export default memo(Modal);

const Backdrop = styled.div({
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  padding: "48px 16px",
  backgroundColor: "rgba(3, 10, 20, 0.72)",
  overflowY: "auto",
});

const Card = styled.div<{ cardWidth: number }>(({ cardWidth }) => ({
  width: "100%",
  maxWidth: `${cardWidth}px`,
  backgroundColor: "#0a1929",
  borderRadius: "16px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow: "0 20px 48px rgba(0, 0, 0, 0.55)",
  boxSizing: "border-box",
}));

const CardHeader = styled.div({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "20px 24px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
});

const CardTitle = styled.h2({
  color: "#FFFFFF",
  fontSize: "1.15rem",
  fontWeight: 700,
  margin: 0,
});

const CloseButton = styled.button({
  border: "none",
  background: "none",
  color: "#8fa3b8",
  fontSize: "1.6rem",
  lineHeight: 1,
  cursor: "pointer",
  padding: 0,
  width: "32px",
  height: "32px",
  borderRadius: "8px",
  transition: "background-color 0.2s, color 0.2s",
  ":hover": {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    color: "#FFFFFF",
  },
});

const CardBody = styled.div({
  padding: "24px",
});
