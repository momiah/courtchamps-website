import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import { FaApple, FaFacebookF } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

import { CourtChampLogo } from "../assets";
import { auth } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

type AuthMode = "signIn" | "signUp";

interface LoginRouterState {
  from?: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  "google.com": "Google",
  "facebook.com": "Facebook",
  "apple.com": "Apple",
  password: "email and password",
  emailLink: "an email sign-in link",
};

const hasErrorCode = (
  candidateError: unknown,
): candidateError is { code: string; customData?: { email?: string } } =>
  typeof candidateError === "object" &&
  candidateError !== null &&
  "code" in candidateError &&
  typeof (candidateError as { code: unknown }).code === "string";

export default function Login() {
  const {
    currentUser,
    loading,
    signInWithGoogle,
    signInWithFacebook,
    signInWithApple,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<AuthMode>("signIn");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const destination = (location.state as LoginRouterState | null)?.from ?? "/";

  useEffect(() => {
    if (!loading && currentUser) {
      navigate(destination, { replace: true });
    }
  }, [loading, currentUser, destination, navigate]);

  const describeError = async (caughtError: unknown): Promise<string | null> => {
    if (!hasErrorCode(caughtError)) {
      return "Something went wrong. Please try again.";
    }

    switch (caughtError.code) {
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request":
        return null;
      case "auth/account-exists-with-different-credential": {
        const conflictingEmail = caughtError.customData?.email;
        if (conflictingEmail) {
          const existingMethods = await fetchSignInMethodsForEmail(
            auth,
            conflictingEmail,
          );
          const existingProvider = existingMethods
            .map((method) => PROVIDER_LABELS[method] ?? method)
            .join(" or ");
          if (existingProvider) {
            return `${conflictingEmail} is already registered using ${existingProvider}. Sign in with that method instead.`;
          }
        }
        return "This email is already registered with a different sign-in method.";
      }
      case "auth/invalid-credential":
        return "Incorrect email or password.";
      case "auth/email-already-in-use":
        return "An account already exists for this email. Try signing in instead.";
      case "auth/weak-password":
        return "Please choose a stronger password (at least 6 characters).";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a moment and try again.";
      default:
        return "Something went wrong. Please try again.";
    }
  };

  const runAuthAction = async (action: () => Promise<void>): Promise<void> => {
    setErrorMessage(null);
    setInfoMessage(null);
    setIsSubmitting(true);
    try {
      await action();
    } catch (caughtError) {
      setErrorMessage(await describeError(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = (submitEvent: React.FormEvent): void => {
    submitEvent.preventDefault();
    const submitHandler =
      mode === "signIn" ? signInWithEmail : signUpWithEmail;
    void runAuthAction(() => submitHandler({ email, password }));
  };

  const handleForgotPassword = (): void => {
    if (!email) {
      setInfoMessage(null);
      setErrorMessage("Enter your email above, then tap “Forgot password?”.");
      return;
    }
    void runAuthAction(async () => {
      await sendPasswordReset({ email });
      setInfoMessage(`Password reset email sent to ${email}.`);
    });
  };

  const toggleMode = (): void => {
    setErrorMessage(null);
    setInfoMessage(null);
    setMode((previousMode) =>
      previousMode === "signIn" ? "signUp" : "signIn",
    );
  };

  const submitLabel = mode === "signIn" ? "Sign In" : "Create Account";

  return (
    <PageContainer>
      <Card>
        <Logo src={CourtChampLogo} alt="Court Champs" />

        <SocialButton
          type="button"
          variant="google"
          disabled={isSubmitting}
          onClick={() => void runAuthAction(signInWithGoogle)}
        >
          <IconSlot>
            <FcGoogle size={20} />
          </IconSlot>
          Continue with Google
        </SocialButton>

        <SocialButton
          type="button"
          variant="facebook"
          disabled={isSubmitting}
          onClick={() => void runAuthAction(signInWithFacebook)}
        >
          <IconSlot>
            <FaFacebookF size={18} color="#FFFFFF" />
          </IconSlot>
          Continue with Facebook
        </SocialButton>

        <SocialButton
          type="button"
          variant="apple"
          disabled={isSubmitting}
          onClick={() => void runAuthAction(signInWithApple)}
        >
          <IconSlot>
            <FaApple size={20} color="#FFFFFF" />
          </IconSlot>
          Continue with Apple
        </SocialButton>

        <DividerRow>
          <DividerLine />
          <DividerText>or</DividerText>
          <DividerLine />
        </DividerRow>

        <Form onSubmit={handleEmailSubmit}>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <TextInput
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            required
            disabled={isSubmitting}
            onChange={(changeEvent) => setEmail(changeEvent.target.value)}
          />

          <FieldLabel htmlFor="login-password">Password</FieldLabel>
          <TextInput
            id="login-password"
            type="password"
            autoComplete={
              mode === "signIn" ? "current-password" : "new-password"
            }
            value={password}
            required
            disabled={isSubmitting}
            onChange={(changeEvent) => setPassword(changeEvent.target.value)}
          />

          <SubmitButton type="submit" disabled={isSubmitting}>
            {submitLabel}
          </SubmitButton>
        </Form>

        {mode === "signIn" && (
          <ForgotPasswordButton
            type="button"
            disabled={isSubmitting}
            onClick={handleForgotPassword}
          >
            Forgot password?
          </ForgotPasswordButton>
        )}

        {errorMessage && <ErrorText>{errorMessage}</ErrorText>}
        {infoMessage && <InfoText>{infoMessage}</InfoText>}

        <ToggleRow>
          {mode === "signIn"
            ? "New to Court Champs?"
            : "Already have an account?"}
          <ToggleButton type="button" disabled={isSubmitting} onClick={toggleMode}>
            {mode === "signIn" ? "Create an account" : "Sign in"}
          </ToggleButton>
        </ToggleRow>
      </Card>
    </PageContainer>
  );
}

const PageContainer = styled.div({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  width: "100%",
  padding: "40px 24px",
  boxSizing: "border-box",
  backgroundColor: "#07111f",
});

const Card = styled.div({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  maxWidth: "400px",
  padding: "32px",
  boxSizing: "border-box",
  borderRadius: "16px",
  backgroundColor: "#0a1929",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45)",
});

const Logo = styled.img({
  width: "220px",
  maxWidth: "70%",
  height: "auto",
  alignSelf: "center",
  marginBottom: "28px",
});

const socialVariantStyles: Record<
  "google" | "facebook" | "apple",
  { backgroundColor: string; color: string; border: string }
> = {
  google: {
    backgroundColor: "#FFFFFF",
    color: "#1f1f1f",
    border: "1px solid #dddddd",
  },
  facebook: {
    backgroundColor: "#1877F2",
    color: "#FFFFFF",
    border: "1px solid #1877F2",
  },
  apple: {
    backgroundColor: "#000000",
    color: "#FFFFFF",
    border: "1px solid #000000",
  },
};

const SocialButton = styled.button<{
  variant: "google" | "facebook" | "apple";
}>(({ variant }) => ({
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  padding: "12px 16px",
  marginBottom: "12px",
  borderRadius: "10px",
  fontSize: "0.95rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "opacity 0.2s",
  ...socialVariantStyles[variant],
  ":disabled": {
    opacity: 0.6,
    cursor: "not-allowed",
  },
}));

const IconSlot = styled.span({
  position: "absolute",
  left: "16px",
  display: "flex",
  alignItems: "center",
});

const DividerRow = styled.div({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  margin: "12px 0 20px",
});

const DividerLine = styled.div({
  flex: 1,
  height: "1px",
  backgroundColor: "rgba(255, 255, 255, 0.15)",
});

const DividerText = styled.span({
  color: "#8fa3b8",
  fontSize: "0.85rem",
});

const Form = styled.form({
  display: "flex",
  flexDirection: "column",
});

const FieldLabel = styled.label({
  color: "#c7d4e1",
  fontSize: "0.85rem",
  marginBottom: "6px",
});

const TextInput = styled.input({
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  marginBottom: "16px",
  borderRadius: "10px",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  backgroundColor: "#07111f",
  color: "#FFFFFF",
  fontSize: "0.95rem",
  outline: "none",
  ":focus": {
    borderColor: "#0099f0",
  },
  ":disabled": {
    opacity: 0.6,
  },
});

const SubmitButton = styled.button({
  width: "100%",
  padding: "12px 16px",
  marginTop: "4px",
  borderRadius: "10px",
  border: "none",
  backgroundColor: "#0099f0",
  color: "#FFFFFF",
  fontSize: "0.95rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "opacity 0.2s",
  ":disabled": {
    opacity: 0.6,
    cursor: "not-allowed",
  },
});

const ForgotPasswordButton = styled.button({
  alignSelf: "flex-end",
  marginTop: "12px",
  padding: 0,
  border: "none",
  background: "none",
  color: "#0099f0",
  fontSize: "0.85rem",
  cursor: "pointer",
  ":disabled": {
    opacity: 0.6,
    cursor: "not-allowed",
  },
});

const ErrorText = styled.p({
  color: "#ff6b6b",
  fontSize: "0.85rem",
  marginTop: "16px",
  marginBottom: 0,
  textAlign: "center",
});

const InfoText = styled.p({
  color: "#4cd47a",
  fontSize: "0.85rem",
  marginTop: "16px",
  marginBottom: 0,
  textAlign: "center",
});

const ToggleRow = styled.div({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "6px",
  marginTop: "24px",
  color: "#8fa3b8",
  fontSize: "0.85rem",
});

const ToggleButton = styled.button({
  padding: 0,
  border: "none",
  background: "none",
  color: "#0099f0",
  fontSize: "0.85rem",
  fontWeight: 600,
  cursor: "pointer",
  ":disabled": {
    opacity: 0.6,
    cursor: "not-allowed",
  },
});
