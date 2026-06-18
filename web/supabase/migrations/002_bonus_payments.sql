-- 성과급(세전) · 매월 15일 마감 · 25일 급여 합산 지급

CREATE TYPE bonus_payment_stage AS ENUM (
  'pending_staff',
  'pending_team_leader',
  'pending_executive',
  'pending_ceo',
  'ceo_confirmed',
  'paid',
  'rejected'
);

CREATE TABLE public.bonus_policy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executive_max_percent JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_leader_max_percent JSONB NOT NULL DEFAULT '{}'::jsonb,
  staff_percent JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.bonus_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  staff_id UUID NOT NULL REFERENCES public.users(id),
  staff_bonus_amount NUMERIC(12, 0) NOT NULL DEFAULT 0,
  team_leader_bonus_amount NUMERIC(12, 0) NOT NULL DEFAULT 0,
  executive_bonus_amount NUMERIC(12, 0) NOT NULL DEFAULT 0,
  staff_percent_applied NUMERIC(5, 2) NOT NULL DEFAULT 0,
  team_leader_percent_applied NUMERIC(5, 2) NOT NULL DEFAULT 0,
  executive_percent_applied NUMERIC(5, 2) NOT NULL DEFAULT 0,
  renewal_month_at_request INT NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 0) NOT NULL DEFAULT 0,
  client_deposit_date DATE NOT NULL,
  closing_deadline DATE NOT NULL,
  scheduled_pay_date DATE NOT NULL,
  stage bonus_payment_stage NOT NULL DEFAULT 'pending_team_leader',
  requested_by UUID REFERENCES public.users(id),
  requested_at DATE,
  team_leader_approved_by UUID REFERENCES public.users(id),
  team_leader_approved_at DATE,
  executive_approved_by UUID REFERENCES public.users(id),
  executive_approved_at DATE,
  ceo_approved_by UUID REFERENCES public.users(id),
  ceo_approved_at DATE,
  paid_by UUID REFERENCES public.users(id),
  paid_at DATE,
  rejected_by UUID REFERENCES public.users(id),
  rejected_at DATE,
  created_at DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bonus_payments_closing_day CHECK (
    EXTRACT(DAY FROM closing_deadline) = 15
  ),
  CONSTRAINT bonus_payments_salary_pay_day CHECK (
    EXTRACT(DAY FROM scheduled_pay_date) = 25
  )
);

COMMENT ON TABLE public.bonus_payments IS
  '성과급(세전) 지급 — 매월 15일 마감·확정, 25일 급여 합산 지급';

COMMENT ON COLUMN public.bonus_payments.closing_deadline IS
  '정산 마감일 (매월 15일)';

COMMENT ON COLUMN public.bonus_payments.scheduled_pay_date IS
  '급여 합산 지급 예정일 (매월 25일)';

CREATE INDEX bonus_payments_contract_id_idx ON public.bonus_payments(contract_id);
CREATE INDEX bonus_payments_stage_idx ON public.bonus_payments(stage);
CREATE INDEX bonus_payments_period_idx ON public.bonus_payments(period);
CREATE INDEX bonus_payments_scheduled_pay_date_idx ON public.bonus_payments(scheduled_pay_date);

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS renewal_month_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_client_deposit_date DATE,
  ADD COLUMN IF NOT EXISTS client_deposit_status TEXT;

COMMENT ON COLUMN public.contracts.last_client_deposit_date IS
  '업체 광고비 입금일 — 익월 정산 주기 기준';
