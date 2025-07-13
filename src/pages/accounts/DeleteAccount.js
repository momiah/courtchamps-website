import React, { useState } from "react";
import styled from "styled-components";
import CourtChampsLogo from "../../assets/court-champ-logo.png";
import { LoadingOutlined, CheckCircleOutlined } from "@ant-design/icons";

export default function DeleteAccount() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Mock function to simulate account deletion request
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setSuccess(true);
    } catch (err) {
      console.error("Mock error:", err);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Uncomment and implement the actual deletion request when ready
  //   const handleSubmit = async (e) => {
  //     e.preventDefault();
  //     setLoading(true);
  //     setSuccess(false);

  //     try {
  //       const response = await fetch(
  //         "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/requestAccountDeletion",
  //         {
  //           method: "POST",
  //           headers: { "Content-Type": "application/json" },
  //           body: JSON.stringify({ email }),
  //         }
  //       );

  //       if (response.ok) {
  //         setSuccess(true);
  //       } else {
  //         alert("Failed to send deletion email. Please try again.");
  //       }
  //     } catch (err) {
  //       console.error("Deletion request error:", err);
  //       alert("An error occurred. Please try again.");
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  return (
    <PageContainer>
      <a href="/">
        <Logo src={CourtChampsLogo} alt="CourtChamps Logo" />
      </a>

      <ContentBox>
        <Title>Request Account Deletion</Title>
        <Description>
          Enter the email associated with your CourtChamps account to request
          deletion. We will process your request within 7 days.
        </Description>

        <Form onSubmit={handleSubmit}>
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading || success}
          />

          <SubmitButton
            type="submit"
            disabled={loading || success}
            success={success}
          >
            {loading ? (
              <LoadingOutlined style={{ fontSize: 18 }} />
            ) : success ? (
              <>
                <CheckCircleOutlined style={{ fontSize: 18, marginRight: 8 }} />{" "}
                Email Sent
              </>
            ) : (
              "Request Deletion"
            )}
          </SubmitButton>
        </Form>

        {success && (
          <Note>
            A confirmation link has been sent to your email. Please check your
            inbox.
          </Note>
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
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  transition: "background-color 0.2s",
  ":hover": {
    backgroundColor: success ? "#45A049" : "#e04343",
  },
}));

const Note = styled.p({
  marginTop: 24,
  fontSize: "0.9rem",
  color: "#AAAAAA",
});

const EmailLink = styled.a({
  color: "#FFFFFF",
  textDecoration: "underline",
});
