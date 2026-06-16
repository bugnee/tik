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

import { DEMO_USER_BY_ROLE } from "@/lib/seed-data";

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

}



const RoleContext = createContext<RoleContextValue | null>(null);



export function RoleProvider({ children }: { children: ReactNode }) {

  const { users } = useData();

  const { status, accountProfile } = useAuth();

  const [demoRole, setDemoRole] = useState<UserRole>("staff");



  const isAuthenticated = status === "approved";



  const currentUser = useMemo(() => {

    if (isAuthenticated && accountProfile?.linkedUserId) {

      const linked = users.find((u) => u.id === accountProfile.linkedUserId);

      if (linked) return linked;

    }



    const demoId = DEMO_USER_BY_ROLE[demoRole];

    const matched = users.find((u) => u.id === demoId);

    if (matched) return matched;

    return users.find((u) => u.role === demoRole) ?? users[0];

  }, [isAuthenticated, accountProfile?.linkedUserId, users, demoRole]);



  const activeRole = isAuthenticated ? currentUser.role : demoRole;



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

