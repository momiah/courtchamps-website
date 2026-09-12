import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  FacebookAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../firebase/config";
import { UserRole } from "../types/roles";

interface EmailCredentials {
  email: string;
  password: string;
}

interface PasswordResetRequest {
  email: string;
}

interface AuthContextValue {
  currentUser: User | null;
  role: UserRole | null;
  loading: boolean;
  accessDenied: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: ({ email, password }: EmailCredentials) => Promise<void>;
  signUpWithEmail: ({ email, password }: EmailCredentials) => Promise<void>;
  sendPasswordReset: ({ email }: PasswordResetRequest) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Only these email addresses are allowed to hold a signed-in session on the
// website. This is a client-side gate: it does not replace the Firestore
// security rules (which remain the source of truth for data access), it simply
// keeps anyone who is not on the allowlist from being signed in here.
//
// Configure via the REACT_APP_OWNER_EMAILS env var (comma-separated). When it
// is empty the gate fails closed — nobody can stay signed in.
const ALLOWED_EMAILS: readonly string[] = (
  process.env.REACT_APP_OWNER_EMAILS ?? ""
)
  .split(",")
  .map((entry) => entry.trim().toLowerCase())
  .filter((entry) => entry.length > 0);

if (ALLOWED_EMAILS.length === 0) {
  console.warn(
    "REACT_APP_OWNER_EMAILS is not set — website sign-in is locked for everyone.",
  );
}

const isEmailAllowed = (email: string | null | undefined): boolean =>
  typeof email === "string" && ALLOWED_EMAILS.includes(email.toLowerCase());

interface UserRoleDocument {
  role: UserRole;
  email: string;
}

const readRoleForUser = async (signedInUser: User): Promise<UserRole | null> => {
  const roleDocumentReference = doc(db, "userRoles", signedInUser.uid);
  const roleSnapshot = await getDoc(roleDocumentReference);

  if (!roleSnapshot.exists()) {
    return null;
  }

  const roleData = roleSnapshot.data() as UserRoleDocument;
  return roleData.role;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [accessDenied, setAccessDenied] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (signedInUser) => {
      setLoading(true);

      if (!signedInUser) {
        // No user (including the null event fired by the forced sign-out
        // below). Leave accessDenied untouched so the "access restricted"
        // message survives the sign-out.
        setCurrentUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      if (!isEmailAllowed(signedInUser.email)) {
        // Authenticated, but not on the allowlist: reject the session and sign
        // straight back out without ever exposing them as the current user.
        setAccessDenied(true);
        setCurrentUser(null);
        setRole(null);
        await signOut(auth);
        setLoading(false);
        return;
      }

      setAccessDenied(false);
      setCurrentUser(signedInUser);

      try {
        const resolvedRole = await readRoleForUser(signedInUser);
        setRole(resolvedRole);
      } catch (roleReadError) {
        setRole(null);
        console.error("Failed to read user role", roleReadError);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const contextValue = useMemo<AuthContextValue>(() => {
    const signInWithGoogle = async (): Promise<void> => {
      await signInWithPopup(auth, new GoogleAuthProvider());
    };

    const signInWithFacebook = async (): Promise<void> => {
      await signInWithPopup(auth, new FacebookAuthProvider());
    };

    const signInWithApple = async (): Promise<void> => {
      const appleProvider = new OAuthProvider("apple.com");
      appleProvider.addScope("email");
      appleProvider.addScope("name");
      await signInWithPopup(auth, appleProvider);
    };

    const signInWithEmail = async ({
      email,
      password,
    }: EmailCredentials): Promise<void> => {
      await signInWithEmailAndPassword(auth, email, password);
    };

    const signUpWithEmail = async ({
      email,
      password,
    }: EmailCredentials): Promise<void> => {
      await createUserWithEmailAndPassword(auth, email, password);
    };

    const sendPasswordReset = async ({
      email,
    }: PasswordResetRequest): Promise<void> => {
      await sendPasswordResetEmail(auth, email);
    };

    const signOutUser = async (): Promise<void> => {
      await signOut(auth);
    };

    return {
      currentUser,
      role,
      loading,
      accessDenied,
      signInWithGoogle,
      signInWithFacebook,
      signInWithApple,
      signInWithEmail,
      signUpWithEmail,
      sendPasswordReset,
      signOutUser,
    };
  }, [currentUser, role, loading, accessDenied]);

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return authContext;
}
