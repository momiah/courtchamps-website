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
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: ({ email, password }: EmailCredentials) => Promise<void>;
  signUpWithEmail: ({ email, password }: EmailCredentials) => Promise<void>;
  sendPasswordReset: ({ email }: PasswordResetRequest) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Shape of a userRoles/{uid} document. A document exists only for privileged
// users — its absence means a normal user with no elevated role.
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (signedInUser) => {
      // Hold `loading` true until both the auth state and the role read have
      // resolved, so route guards never evaluate against a half-loaded state.
      setLoading(true);
      setCurrentUser(signedInUser);

      if (!signedInUser) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const resolvedRole = await readRoleForUser(signedInUser);
        setRole(resolvedRole);
      } catch (roleReadError) {
        // A failed role read must not leave a user silently elevated.
        setRole(null);
        // eslint-disable-next-line no-console
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
      // The website never creates users/{uid} profile documents — the mobile
      // app owns profile creation. This only registers the auth credential.
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
      signInWithGoogle,
      signInWithFacebook,
      signInWithApple,
      signInWithEmail,
      signUpWithEmail,
      sendPasswordReset,
      signOutUser,
    };
  }, [currentUser, role, loading]);

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
