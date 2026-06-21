"use client";

import { useEffect, useMemo, useState } from "react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SaveButton } from "@/components/ui/SaveButton";
import { useFormDirty } from "@/hooks/useFormDirty";
import { useSaveMeta } from "@/hooks/useSaveMeta";
import { Checkbox, Input, Select } from "@/components/ui/FormFields";
import { Modal } from "@/components/ui/Modal";
import { LeaderManagedContractNotice } from "@/components/contracts/LeaderManagedContractNotice";
import { ExtensionContractCheckboxField } from "@/components/contracts/ExtensionContractCheckboxField";
import type { ContractTermsChangeMode, ContractTermsFormValues } from "@/lib/contract-terms-utils";
import {
  canEnableExtensionContractCheckbox,
  contractToTermsForm,
} from "@/lib/contract-terms-utils";
import {
  formatChangedFieldsSummary,
  getChangedFieldHighlightClass,
  getChangedFieldWrapperClass,
  getTermsFormChangedFields,
  requiresTermsApproval,
  TERMS_MODE_LABELS,
} from "@/lib/contract-terms-approval-utils";
import { addDays } from "@/lib/bonus-utils";
import { isLeaderManagedAssignee } from "@/lib/contract-access-utils";
import { filterPartnersByCategory, getPartnerName } from "@/lib/partner-utils";
import {
  getContractTargetChannels,
  getContractTargetCount,
  setContractTargetCount,
} from "@/lib/task-channel-utils";
import { contractAssigneeUsers } from "@/lib/selectors";
import type { Contract, ContractTermsApproval, UserRole } from "@/lib/types";

type ContractTermsEditModalProps = {
  contract: Contract;
  open: boolean;
  onClose: () => void;
  mode: ContractTermsChangeMode;
  activeRole: UserRole;
  pendingApproval?: ContractTermsApproval;
  onSave: (values: ContractTermsFormValues, mode: ContractTermsChangeMode) => void;
  onRequestApproval?: (
    values: ContractTermsFormValues,
    mode: ContractTermsChangeMode,
  ) => void;
};

function buildInitialForm(
  contract: Contract,
  mode: ContractTermsChangeMode,
): ContractTermsFormValues {
  const base = contractToTermsForm(contract);
  if (mode === "recontract") {
    const start = new Date().toISOString().slice(0, 10);
    return {
      ...base,
      contractStartDate: start,
      contractEndDate: addDays(start, 365),
      isExtension: false,
    };
  }
  return base;
}

export function ContractTermsEditModal({
  contract,
  open,
  onClose,
  mode,
  activeRole,
  pendingApproval,
  onSave,
  onRequestApproval,
}: ContractTermsEditModalProps) {
  const data = useData();
  const { canManageContractTerms } = useRole();
  const { teams, partners, taskChannels } = data;
  const [baselineForm, setBaselineForm] = useState<ContractTermsFormValues>(() =>
    buildInitialForm(contract, mode),
  );
  const [form, setForm] = useState<ContractTermsFormValues>(() =>
    buildInitialForm(contract, mode),
  );
  const formDirty = useFormDirty(
    open,
    `${contract.id}-${mode}`,
    form,
  );
  const saveMeta = useSaveMeta();

  const assignees = useMemo(
    () => contractAssigneeUsers(data, form.teamId || undefined),
    [data, form.teamId],
  );
  const leaderManagedAssignee = isLeaderManagedAssignee(
    data,
    form.assignedStaffId,
  );
  const targetChannels = useMemo(
    () => getContractTargetChannels(taskChannels),
    [taskChannels],
  );
  const referralPartners = useMemo(
    () => filterPartnersByCategory(partners, "referral"),
    [partners],
  );

  const changedFields = useMemo(
    () => getTermsFormChangedFields(baselineForm, form, taskChannels),
    [baselineForm, form, taskChannels],
  );
  const changedFieldSet = useMemo(
    () => new Set(changedFields),
    [changedFields],
  );

  const needsApproval = useMemo(
    () =>
      requiresTermsApproval(
        activeRole,
        mode,
        contract,
        baselineForm,
        form,
        taskChannels,
      ),
    [activeRole, mode, contract, baselineForm, form, taskChannels],
  );

  const isPending = pendingApproval?.status === "pending";

  useEffect(() => {
    if (open) {
      const initial = buildInitialForm(contract, mode);
      setBaselineForm(initial);
      setForm(initial);
    }
  }, [open, contract, mode]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return;

    if (needsApproval && onRequestApproval) {
      onRequestApproval(form, mode);
    } else {
      onSave(form, mode);
    }
    saveMeta.recordSave();
    onClose();
  }

  const title =
    mode === "recontract"
      ? "해지 후 재계약"
      : mode === "renewal"
        ? "재계약 · 조건 설정"
        : "계약 조건 변경";
  const subtitle =
    mode === "recontract"
      ? "성과급 회차 1월차부터 재산정 · 새 시작일 기준 3개월 후 연장 적용 · 4월차부터 지급 대상"
      : mode === "renewal"
        ? "새 회차 조건 적용 · 재계약 월차 +1 · 입금 확인 초기화"
        : "진행 중 계약의 월 광고비 · 집행 목표 · 기간 등 수정";

  const submitLabel = isPending
    ? "승인 대기 중"
    : needsApproval
      ? "결재 상신"
      : mode === "recontract"
        ? "재계약 적용"
        : mode === "renewal"
          ? "재계약 조건 적용"
          : "조건 저장";

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-500">
          {subtitle}
        </p>

        {isPending && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            <Badge variant="warning" className="mr-2">
              승인 대기
            </Badge>
            {TERMS_MODE_LABELS[pendingApproval.mode]} 결재가 진행 중입니다. (
            {pendingApproval.createdAt} 상신)
          </div>
        )}

        {changedFields.length > 0 && !isPending && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
            <span className="font-medium text-amber-300">변경된 항목: </span>
            {formatChangedFieldsSummary(changedFields, taskChannels)}
            {needsApproval && (
              <span className="mt-1 block text-amber-400/80">
                팀장 결재 후 반영됩니다.
              </span>
            )}
          </div>
        )}

        <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-300">
          {contract.clientName}
          {mode === "renewal" && (
            <Badge variant="success" className="ml-2">
              {contract.renewalMonthCount + 1}월차 예정
            </Badge>
          )}
          {mode === "recontract" && (
            <Badge variant="info" className="ml-2">
              성과급 1월차부터
            </Badge>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="월 광고비 (원) *"
            type="number"
            min={0}
            step={10000}
            value={form.monthlyFee || ""}
            onChange={(e) =>
              setForm({ ...form, monthlyFee: Number(e.target.value) })
            }
            className={getChangedFieldHighlightClass(
              changedFieldSet.has("monthlyFee"),
            )}
            required
          />
          <Select
            label="담당 팀"
            value={form.teamId}
            onChange={(e) => {
              const teamId = e.target.value;
              const nextAssignees = contractAssigneeUsers(data, teamId);
              setForm((prev) => ({
                ...prev,
                teamId,
                assignedStaffId: nextAssignees.some(
                  (u) => u.id === prev.assignedStaffId,
                )
                  ? prev.assignedStaffId
                  : (nextAssignees[0]?.id ?? prev.assignedStaffId),
              }));
            }}
            className={getChangedFieldHighlightClass(
              changedFieldSet.has("teamId"),
            )}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>

        <Select
          label="담당 (실무·팀장)"
          value={form.assignedStaffId}
          onChange={(e) =>
            setForm({ ...form, assignedStaffId: e.target.value })
          }
          className={getChangedFieldHighlightClass(
            changedFieldSet.has("assignedStaffId"),
          )}
        >
          {assignees.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
              {u.role === "team_leader" ? " (팀장 · 직접 담당)" : ""}
            </option>
          ))}
        </Select>
        {leaderManagedAssignee && <LeaderManagedContractNotice />}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={
              mode === "recontract"
                ? "재계약 시작일"
                : mode === "renewal"
                  ? "재계약 시작일"
                  : "계약 시작일"
            }
            type="date"
            value={form.contractStartDate}
            onChange={(e) => {
              const contractStartDate = e.target.value;
              setForm((prev) => ({
                ...prev,
                contractStartDate,
                isExtension:
                  canEnableExtensionContractCheckbox(contractStartDate) &&
                  (prev.isExtension ?? false),
              }));
            }}
            className={getChangedFieldHighlightClass(
              changedFieldSet.has("contractStartDate"),
            )}
          />
          <Input
            label={mode === "renewal" ? "재계약 종료일" : "계약 종료일"}
            type="date"
            value={form.contractEndDate}
            onChange={(e) =>
              setForm({ ...form, contractEndDate: e.target.value })
            }
            className={getChangedFieldHighlightClass(
              changedFieldSet.has("contractEndDate"),
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {targetChannels.map((channel) => (
            <Input
              key={channel.id}
              label={`${channel.label} (건)`}
              type="number"
              min={0}
              value={getContractTargetCount({ ...contract, ...form }, channel)}
              onChange={(e) =>
                setForm(
                  setContractTargetCount(
                    { ...contract, ...form },
                    channel,
                    Number(e.target.value),
                  ),
                )
              }
              className={getChangedFieldHighlightClass(
                changedFieldSet.has(`channel:${channel.id}`),
              )}
            />
          ))}
        </div>

        <div
          className={getChangedFieldWrapperClass(
            changedFieldSet.has("hasPlaceSetting"),
          )}
        >
          <Checkbox
            label="플레이스세팅 포함"
            checked={form.hasPlaceSetting}
            onChange={(v) => setForm({ ...form, hasPlaceSetting: v })}
          />
        </div>

        {canManageContractTerms && (
          <div className="flex flex-wrap gap-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="w-full text-xs text-amber-400/80">
              임원 · 대표 전용 설정
            </p>
            <div
              className={getChangedFieldWrapperClass(
                changedFieldSet.has("isExtension"),
              )}
            >
              <ExtensionContractCheckboxField
                contractStartDate={form.contractStartDate}
                checked={form.isExtension ?? false}
                onChange={(isExtension) => setForm({ ...form, isExtension })}
              />
            </div>
            <div
              className={getChangedFieldWrapperClass(
                changedFieldSet.has("hasReferralPromo") ||
                  changedFieldSet.has("referrerPartnerId"),
              )}
            >
              <Checkbox
                label="리셀러 프로모션 (10%)"
                checked={form.hasReferralPromo ?? false}
                onChange={(v) =>
                  setForm({
                    ...form,
                    hasReferralPromo: v,
                    referrerPartnerId: v
                      ? form.referrerPartnerId ?? referralPartners[0]?.id
                      : undefined,
                  })
                }
              />
              {form.hasReferralPromo && (
                <Select
                  label="리셀러"
                  value={form.referrerPartnerId ?? referralPartners[0]?.id ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, referrerPartnerId: e.target.value })
                  }
                  className={getChangedFieldHighlightClass(
                    changedFieldSet.has("referrerPartnerId"),
                  )}
                >
                  {referralPartners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.companyName}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          </div>
        )}

        {!canManageContractTerms &&
          (form.isExtension || form.hasReferralPromo) && (
            <div className="flex flex-wrap gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-xs text-zinc-500">
              연장/리셀러:{" "}
              {form.isExtension && <Badge variant="success">연장</Badge>}
              {form.hasReferralPromo && (
                <Badge variant="info">
                  리셀러 ·{" "}
                  {getPartnerName(partners, form.referrerPartnerId)}
                </Badge>
              )}
            </div>
          )}

        <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <SaveButton
            type="submit"
            dirty={formDirty}
            savedAt={saveMeta.savedAt}
            savedBy={saveMeta.savedBy}
            disabled={isPending}
          >
            {submitLabel}
          </SaveButton>
        </div>
      </form>
    </Modal>
  );
}
