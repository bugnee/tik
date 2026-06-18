"use client";



import {

  createContext,

  useContext,

  useMemo,

  useState,

  type ReactNode,

} from "react";

import { useAuth } from "@/context/AuthContext";

import { useData } from "@/context/DataContext";

import { resolveAuthenticatedUser, buildUserFromAccountProfile } from "@/lib/auth-utils";
import { resolveDemoRoleUser } from "@/lib/seed-data";
import {
  canSubmitWorkEvaluation,
  canViewWorkEvaluations as roleCanViewWorkEvaluations,
} from "@/lib/work-evaluation-utils";
import type { User, UserRole } from "@/lib/types";



interface RoleContextValue {

  activeRole: UserRole;

  setActiveRole: (role: UserRole) => void;

  currentUser: User;

  isAuthenticated: boolean;

  canApproveAccounts: boolean;

  canViewFinancials: boolean;

  canManageContractTerms: boolean;

  canManageFinanceOps: boolean;

  canManagePartners: boolean;

  canEvaluateWork: boolean;

  canViewWorkEvaluations: boolean;

}



const RoleContext = createContext<RoleContextValue | null>(null);



export function RoleProvider({ children }: { children: ReactNode }) {

  const { users } = useData();

  const { status, accountProfile } = useAuth();

  const [demoRole, setDemoRole] = useState<UserRole>("staff");



  const isAuthenticated = status === "approved";



  const currentUser = useMemo(() => {
    if (isAuthenticated && accountProfile) {
      const resolved = resolveAuthenticatedUser(accountProfile, users);
      if (resolved) return resolved;

      const fromProfile = buildUserFromAccountProfile(accountProfile);
      if (fromProfile) return fromProfile;

      return resolveDemoRoleUser(accountProfile.role ?? "staff", users);
    }

    return resolveDemoRoleUser(demoRole, users);
  }, [isAuthenticated, accountProfile, users, demoRole]);

  const activeRole: UserRole = isAuthenticated
    ? (accountProfile?.role ?? currentUser.role)
    : demoRole;



  const canApproveAccounts =

    isAuthenticated &&

    (activeRole === "ceo" || activeRole === "executive");



  const canViewFinancials =

    activeRole === "ceo" || currentUser.isFinancialViewer;



  const canManageContractTerms =

    activeRole === "executive" || activeRole === "ceo";



  const canManageFinanceOps =

    activeRole === "finance_manager" || activeRole === "ceo";



  const canManagePartners =

    activeRole === "executive" ||

    activeRole === "ceo" ||

    activeRole === "finance_manager";

  const canEvaluateWork = canSubmitWorkEvaluation(activeRole);

  const canViewWorkEvaluations = roleCanViewWorkEvaluations(activeRole);



  return (

    <RoleContext.Provider

      value={{

        activeRole,

        setActiveRole: isAuthenticated ? () => {} : setDemoRole,

        currentUser,

        isAuthenticated,

        canApproveAccounts,

        canViewFinancials,

        canManageContractTerms,

        canManageFinanceOps,

        canManagePartners,

        canEvaluateWork,

        canViewWorkEvaluations,

      }}

    >

      {children}

    </RoleContext.Provider>

  );

}



export function useRole() {

  const ctx = useContext(RoleContext);

  if (!ctx) throw new Error("useRole must be used within RoleProvider");

  return ctx;

}

