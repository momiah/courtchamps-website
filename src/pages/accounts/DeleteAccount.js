import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import CourtChampsLogo from "../../assets/court-champ-logo.png";
import { LoadingOutlined, CheckCircleOutlined } from "@ant-design/icons";

export default function DeleteAccount() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("form"); // form, sent, confirming, deleted, error
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get("email");
    const secureToken = params.get("securetoken");

    if (emailParam && secureToken) {
      setStatus("confirming");
      const confirmDeletion = async () => {
        try {
          const response = await fetch(
            "https://us-central1-scoreboard-app-29148.cloudfunctions.net/confirmAccountDeletion",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: emailParam.toLowerCase(), secureToken }),
            }
          );

          const data = await response.json();
          if (!response.ok ) {
            throw new Error(data.message || `Failed to delete account: ${response.status}`);
          }

          setStatus("deleted");
        } catch (err) {
          console.error("Confirm deletion error:", err);
          setError(err.message || "An error occurred while deleting your account.");
          setStatus("error");
        }
      };

      confirmDeletion();
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch(
        "https://us-central1-scoreboard-app-29148.cloudfunctions.net/requestAccountDeletion",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.toLowerCase() }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        if (data.message && (data.message.includes("user-not-found") || data.message.includes("No account"))) {
          throw new Error("No account found with this email");
        }
        if (data.message && data.message.includes("invalid-email")) {
          throw new Error("Invalid email format");
        }
        throw new Error(data.message || `Failed to fetch: ${response.status}`);
      }

      setSuccess(true);
      setStatus("sent");
    } catch (err) {
      console.error("Deletion request error:", err);
      if (err.message.includes("user-not-found") || err.message.includes("No account")) {
        setError("No account found with this email.");
      } else if (err.message.includes("invalid-email")) {
        setError("Invalid email format.");
      } else if (err.message.includes("Failed to fetch")) {
        setError("Network error: Unable to connect to server. Please check your internet connection.");
      } else {
        setError(`An error occurred: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <a href="/">
        <Logo src={CourtChampsLogo} alt="CourtChamps Logo" />
      </a>

      <ContentBox>
        <Title>
          {status === "deleted" || status === "confirming" ? "Confirm Account Deletion" : "Request Account Deletion"}
        </Title>
        <Description>
          {status === "form"
            ? "Enter the email associated with your CourtChamps account to request deletion."
            : status === "sent"
            ? "A verification email has been sent. Please check your inbox and click the link to confirm deletion."
            : status === "confirming"
            ? "Processing your account deletion..."
            : status === "deleted"
            ? "Your account has been deleted successfully."
            : "An error occurred during deletion."}
        </Description>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {status === "form" && (
          <Form onSubmit={handleSubmit}>
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || status === "sent"}
            />
            <SubmitButton type="submit" disabled={loading || status === "sent"} success={success}>
              {loading ? (
                <LoadingOutlined style={{ fontSize: 18 }} />
              ) : success ? (
                <>
                  <CheckCircleOutlined style={{ fontSize: 18, marginRight: 8 }} />
                  Email Sent
                </>
              ) : (
                "Request Deletion"
              )}
            </SubmitButton>
          </Form>
        )}
        {(status === "sent" || status === "deleted") && (
          <SuccessMessage>
            <CheckCircleOutlined style={{ fontSize: 18, marginRight: 8 }} />
            {status === "sent" ? "Verification Email Sent" : "Account Deleted Successfully"}
          </SuccessMessage>
        )}
        {status === "confirming" && (
          <ConfirmingMessage>
            <LoadingOutlined style={{ fontSize: 18, marginRight: 8 }} />
            Processing...
          </ConfirmingMessage>
        )}

        <Note>
          If you have any questions, contact us at:{" "}
          <EmailLink href="mailto:info@courtchamps.com">
            info@courtchamps.com
          </EmailLink>
        </Note>
      </ContentBox>
    </PageContainer>
  );
}

// Styled components
const PageContainer = styled.div({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  backgroundColor: "rgb(3, 16, 31)",
  color: "#FFFFFF",
  padding: 24,
});

const Logo = styled.img({
  width: "200px",
  height: "auto",
  marginBottom: 24,
});

const ContentBox = styled.div({
  backgroundColor: "rgba(255, 255, 255, 0.05)",
  borderRadius: 12,
  padding: 32,
  maxWidth: 500,
  width: "100%",
  textAlign: "center",
  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
});

const Title = styled.h1({
  fontSize: "2rem",
  marginBottom: 16,
});

const Description = styled.p({
  fontSize: "1.125rem",
  marginBottom: 24,
  color: "#CCCCCC",
});

const Form = styled.form({
  display: "flex",
  flexDirection: "column",
  gap: 16,
});

const Input = styled.input({
  padding: "12px",
  fontSize: "1rem",
  borderRadius: 6,
  border: "1px solid #555",
  backgroundColor: "#0f1f33",
  color: "#fff",
});

const SubmitButton = styled.button(({ success }) => ({
  padding: "12px",
  fontSize: "1rem",
  backgroundColor: success ? "#4CAF50" : "#FF4C4C",
  border: "none",
  borderRadius: 6,
  color: "#fff",
  cursor: success ? "default" : "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  transition: "background-color 0.2s",
  ":hover": {
    backgroundColor: success ? "#4CAF50" : "#e04343",
  },
}));

const ErrorMessage = styled.p({
  color: "#FF4C4C",
  fontSize: "0.9rem",
  marginBottom: 16,
});

const SuccessMessage = styled.p({
  color: "#4CAF50",
  fontSize: "1rem",
  marginBottom: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const ConfirmingMessage = styled.p({
  color: "#FFFFFF",
  fontSize: "1rem",
  marginBottom: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const Note = styled.p({
  marginTop: 24,
  fontSize: "0.9rem",
  color: "#AAAAAA",
});

const EmailLink = styled.a({
  color: "#FFFFFF",
  textDecoration: "underline",
});
