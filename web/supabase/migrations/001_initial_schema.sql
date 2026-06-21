-- tripitkorea ERP · Supabase 초기 스키마
-- RLS: 역할별 데이터 접근 제어

CREATE TYPE user_role AS ENUM ('staff', 'team_leader', 'executive', 'ceo');
CREATE TYPE execution_type AS ENUM ('optimized', 'influencer', 'experience', 'press');
CREATE TYPE execution_status AS ENUM ('pending', 'in_progress', 'completed', 'delayed');
CREATE TYPE expense_category AS ENUM ('press', 'experience', 'influencer', 'other');
CREATE TYPE payout_status AS ENUM ('unpaid', 'pending_transfer', 'paid');

-- users (auth.users와 연동)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  is_financial_viewer BOOLEAN NOT NULL DEFAULT FALSE,
  team_id UUID,
  manager_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  leader_id UUID REFERENCES public.users(id),
  executive_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users
  ADD CONSTRAINT users_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);

-- contracts (43개 업체)
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  monthly_fee NUMERIC(12, 0) NOT NULL DEFAULT 0,
  target_optimized INT NOT NULL DEFAULT 0,
  target_influencer INT NOT NULL DEFAULT 0,
  target_experience INT NOT NULL DEFAULT 0,
  target_insta_card INT NOT NULL DEFAULT 0,
  has_place_setting BOOLEAN NOT NULL DEFAULT FALSE,
  is_extension BOOLEAN NOT NULL DEFAULT FALSE,
  has_referral_promo BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_staff_id UUID REFERENCES public.users(id),
  team_id UUID REFERENCES public.teams(id),
  contract_start DATE,
  contract_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- executions
CREATE TABLE public.executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  type execution_type NOT NULL,
  status execution_status NOT NULL DEFAULT 'pending',
  completed_count INT NOT NULL DEFAULT 0,
  target_count INT NOT NULL DEFAULT 0,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id),
  category expense_category NOT NULL,
  description TEXT,
  amount NUMERIC(12, 0) NOT NULL,
  bank_account TEXT NOT NULL,
  account_holder TEXT,
  payout_status payout_status NOT NULL DEFAULT 'unpaid',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 연장 승인 (팀장)
CREATE TABLE public.extension_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES public.users(id),
  approved_by UUID REFERENCES public.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contracts_assigned_staff ON public.contracts(assigned_staff_id);
CREATE INDEX idx_contracts_team ON public.contracts(team_id);
CREATE INDEX idx_executions_contract ON public.executions(contract_id);
CREATE INDEX idx_expenses_payout ON public.expenses(payout_status);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_team ON public.users(team_id);

-- ========== RLS ==========
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_approvals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.can_view_financials()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND (role = 'ceo' OR is_financial_viewer = TRUE)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- users policies
CREATE POLICY users_select ON public.users FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR current_user_role() IN ('team_leader', 'executive', 'ceo')
  );

-- contracts policies
CREATE POLICY contracts_staff ON public.contracts FOR SELECT TO authenticated
  USING (
    current_user_role() = 'ceo'
    OR (current_user_role() = 'staff' AND assigned_staff_id = auth.uid())
    OR (current_user_role() = 'team_leader' AND team_id IN (
      SELECT team_id FROM public.users WHERE id = auth.uid()
    ))
    OR (current_user_role() = 'executive' AND team_id IN (
      SELECT id FROM public.teams WHERE executive_id = auth.uid()
    ))
  );

-- expenses: 재무 권한자만 전체 조회
CREATE POLICY expenses_financial ON public.expenses FOR SELECT TO authenticated
  USING (can_view_financials());

CREATE POLICY expenses_financial_write ON public.expenses FOR ALL TO authenticated
  USING (can_view_financials())
  WITH CHECK (can_view_financials());
