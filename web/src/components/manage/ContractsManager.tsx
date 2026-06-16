"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, ExternalLink, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  DataTable,
  EmptyState,
  PageHeader,
  SearchBar,
  Td,
  Th,
  Tr,
} from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";
import { Checkbox, Input, Select } from "@/components/ui/FormFields";
import { Modal } from "@/components/ui/Modal";
import {
  countPipeline,
  getContractStatusDisplay,
  getPipelineCategory,
} from "@/lib/contract-lifecycle";
import { formatKRW } from "@/lib/finance";
import { filterPartnersByCategory, getPartnerName } from "@/lib/partner-utils";
import {
  formatContractTargetSummary,
  getContractTargetChannels,
  getContractTargetCount,
  setContractTargetCount,
} from "@/lib/task-channel-utils";
import { isLeaderManagedContract } from "@/lib/contract-access-utils";
import {
  contractAssigneeUsers,
  filterContractsByRole,
  getTeamName,
  getUserName,
} from "@/lib/selectors";
import type { Contract, ContractInput } from "@/lib/types";
import {
  CONTRACT_STATUS_LABELS,
  PIPELINE_CATEGORY_LABELS,
} from "@/lib/types";

const emptyForm = (): ContractInput => ({
  clientName: "",
  monthlyFee: 0,
  targetOptimized: 8,
  targetInfluencer: 4,
  targetExperience: 0,
  targetInstaCard: 0,
  hasPlaceSetting: false,
  isExtension: false,
  hasReferralPromo: false,
  assignedStaffId: "",
  teamId: "",
  optimizedDone: 0,
  influencerDone: 0,
  contractStartDate: new Date().toISOString().slice(0, 10),
  contractEndDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
    .toISOString()
    .slice(0, 10),
  status: "active",
  renewalMonthCount: 1,
});

export function ContractsManager() {
  const data = useData();
  const { canManageContractTerms, currentUser, activeRole } = useRole();
  const { contracts, teams, partners, taskChannels, addContract, updateContract, deleteContract } = data;
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [form, setForm] = useState<ContractInput>(emptyForm());

  const roleContracts = useMemo(
    () => filterContractsByRole(data, activeRole, currentUser.id),
    [data, activeRole, currentUser.id],
  );

  const assignees = useMemo(
    () => contractAssigneeUsers(data, form.teamId || undefined),
    [data, form.teamId],
  );

  const referralPartners = useMemo(
    () => filterPartnersByCategory(partners, "referral"),
    [partners],
  );

  const targetChannels = useMemo(
    () => getContractTargetChannels(taskChannels),
    [taskChannels],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return roleContracts.filter(
      (c) =>
        c.clientName.toLowerCase().includes(q) ||
        getUserName(data, c.assignedStaffId).toLowerCase().includes(q),
    );
  }, [roleContracts, search, data]);

  const summary = useMemo(() => {
    const active = filtered.filter((c) => c.status === "active");
    const pipeline = countPipeline(filtered);
    const totalMonthlyFee = active.reduce((sum, c) => sum + c.monthlyFee, 0);
    return {
      totalCount: roleContracts.length,
      filteredCount: filtered.length,
      activeCount: active.length,
      terminatedCount: filtered.filter((c) => c.status === "terminated").length,
      pipeline,
      totalMonthlyFee,
    };
  }, [filtered, roleContracts.length]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm(),
      assignedStaffId: assignees[0]?.id ?? "",
      teamId: teams[0]?.id ?? "",
    });
    setModalOpen(true);
  }

  function openEdit(c: Contract) {
    setEditing(c);
    setForm({ ...c });
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName || !form.assignedStaffId || !form.teamId) return;

    const payload: ContractInput = { ...form };
    if (!canManageContractTerms) {
      payload.isExtension = editing?.isExtension ?? false;
      payload.hasReferralPromo = editing?.hasReferralPromo ?? false;
    }

    if (editing) {
      updateContract(editing.id, payload);
    } else {
      addContract(payload);
    }
    setModalOpen(false);
  }

  function handleDelete(id: string) {
    if (confirm("이 계약을 삭제하시겠습니까? 연결된 실행·원가도 함께 삭제됩니다.")) {
      deleteContract(id);
    }
  }

  const dataCtx = data;

  return (
    <>
      <PageHeader
        title="계약 관리"
        description={
          search
            ? `검색 ${summary.filteredCount}건 / 전체 ${summary.totalCount}개 업체`
            : `전체 ${summary.totalCount}개 업체 · 월 광고비 합계 ${formatKRW(summary.totalMonthlyFee)}`
        }
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            계약 추가
          </Button>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="계약 업체"
          value={`${summary.filteredCount}개`}
          subValue={
            search
              ? `전체 ${summary.totalCount}개 중 검색 결과`
              : `활성 ${summary.activeCount} · 해지 ${summary.terminatedCount}`
          }
          icon={Building2}
          accent="cyan"
        />
        <StatCard
          label="진행"
          value={`${summary.pipeline.in_progress}개`}
          subValue={PIPELINE_CATEGORY_LABELS.in_progress}
          icon={Building2}
          accent="emerald"
        />
        <StatCard
          label="연장임박"
          value={`${summary.pipeline.extension_imminent}개`}
          subValue={PIPELINE_CATEGORY_LABELS.extension_imminent}
          icon={Building2}
          accent="amber"
        />
        <StatCard
          label="월 광고비 합계"
          value={formatKRW(summary.totalMonthlyFee)}
          subValue={`종료·해지 ${summary.pipeline.contract_ending}개 · 활성 업체 기준`}
          icon={Wallet}
          accent="emerald"
        />
      </div>

      <Card className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="업체명 · 담당자 검색"
        />
      </Card>

      <DataTable>
        <thead>
          <tr>
            <Th>업체명</Th>
            <Th>팀</Th>
            <Th>담당</Th>
            <Th>계약현황</Th>
            <Th>월 광고비</Th>
            {targetChannels.map((channel) => (
              <Th key={channel.id}>{channel.label}</Th>
            ))}
            <Th>플레이스</Th>
            <Th>조건</Th>
            <Th className="w-24">관리</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c) => (
            <Tr key={c.id}>
              <Td className="font-medium text-zinc-100">
                <Link
                  href={`/contracts/${c.id}`}
                  className="inline-flex items-center gap-1 hover:text-emerald-400"
                >
                  {c.clientName}
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </Link>
                {isLeaderManagedContract(dataCtx, c) && (
                  <Badge variant="info" className="ml-2">
                    팀장 담당
                  </Badge>
                )}
              </Td>
              <Td>{getTeamName(dataCtx, c.teamId)}</Td>
              <Td>
                {getUserName(dataCtx, c.assignedStaffId)}
                {isLeaderManagedContract(dataCtx, c) && (
                  <span className="ml-1 text-xs text-cyan-500/80">(팀장)</span>
                )}
              </Td>
              <Td>
                <ContractStatusCell contract={c} />
              </Td>
              <Td className="font-mono">{formatKRW(c.monthlyFee)}</Td>
              {targetChannels.map((channel) => (
                <Td key={channel.id}>
                  {formatContractTargetSummary(c, channel)}
                </Td>
              ))}
              <Td>
                {c.hasPlaceSetting ? (
                  <Badge variant="success">Y</Badge>
                ) : (
                  <span className="text-zinc-600">-</span>
                )}
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {c.isExtension && <Badge variant="success">연장</Badge>}
                  {c.hasReferralPromo && <Badge variant="info">소개10%</Badge>}
                </div>
              </Td>
              <Td>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
        {filtered.length > 0 && (
          <tfoot>
            <tr className="border-t border-zinc-700 bg-zinc-900/80">
              <td
                colSpan={4}
                className="border-b border-zinc-800/50 px-2 py-3 text-sm font-medium text-zinc-200 sm:px-4"
              >
                합계 · {summary.activeCount}개 활성 업체
                <span className="ml-2 text-xs font-normal text-zinc-500">
                  진행 {summary.pipeline.in_progress} · 연장임박{" "}
                  {summary.pipeline.extension_imminent} · 종료{" "}
                  {summary.pipeline.contract_ending}
                </span>
              </td>
              <td className="border-b border-zinc-800/50 px-2 py-3 font-mono text-base font-semibold text-emerald-400 sm:px-4">
                {formatKRW(summary.totalMonthlyFee)}
              </td>
              <td
                colSpan={targetChannels.length + 3}
                className="border-b border-zinc-800/50"
              />
            </tr>
          </tfoot>
        )}
      </DataTable>

      {filtered.length === 0 && <EmptyState message="검색 결과가 없습니다" />}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "계약 수정" : "계약 추가"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="업체명 *"
            value={form.clientName}
            onChange={(e) => setForm({ ...form, clientName: e.target.value })}
            required
          />
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
              required
            />
            <Select
              label="담당 팀 *"
              value={form.teamId}
              onChange={(e) => setForm({ ...form, teamId: e.target.value })}
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <Select
            label="담당 실무 *"
            value={form.assignedStaffId}
            onChange={(e) =>
              setForm({ ...form, assignedStaffId: e.target.value })
            }
          >
            {assignees.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.role === "team_leader" ? " (팀장)" : ""}
              </option>
            ))}
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="계약 시작일"
              type="date"
              value={form.contractStartDate}
              onChange={(e) =>
                setForm({ ...form, contractStartDate: e.target.value })
              }
            />
            <Input
              label="계약 종료일"
              type="date"
              value={form.contractEndDate}
              onChange={(e) =>
                setForm({ ...form, contractEndDate: e.target.value })
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {targetChannels.map((channel) => (
              <Input
                key={channel.id}
                label={`${channel.label} (건)`}
                type="number"
                min={0}
                value={getContractTargetCount(form as Contract, channel)}
                onChange={(e) =>
                  setForm(
                    setContractTargetCount(
                      form as Contract,
                      channel,
                      Number(e.target.value),
                    ),
                  )
                }
              />
            ))}
          </div>
          <Checkbox
            label="플레이스세팅 포함"
            checked={form.hasPlaceSetting}
            onChange={(v) => setForm({ ...form, hasPlaceSetting: v })}
          />
          {canManageContractTerms ? (
            <div className="flex flex-wrap gap-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="w-full text-xs text-amber-400/80">
                임원 · 대표 전용 설정
              </p>
              <Checkbox
                label="연장 계약 (재계약 · 성과급 정책 적용)"
                checked={form.isExtension}
                onChange={(v) => setForm({ ...form, isExtension: v })}
              />
              <Checkbox
                label="소개 프로모션 (10%)"
                checked={form.hasReferralPromo}
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
                  label="리셀러 *"
                  value={form.referrerPartnerId ?? referralPartners[0]?.id ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, referrerPartnerId: e.target.value })
                  }
                >
                  {referralPartners.length === 0 ? (
                    <option value="">리셀러 없음 (파트너 메뉴에서 등록)</option>
                  ) : (
                    referralPartners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.companyName}
                      </option>
                    ))
                  )}
                </Select>
              )}
            </div>
          ) : (
            (form.isExtension || form.hasReferralPromo) && (
              <div className="flex flex-wrap gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <span className="w-full text-xs text-zinc-500">
                  연장/소개 조건 (임원 · 대표만 수정 가능)
                </span>
                {form.isExtension && <Badge variant="success">연장</Badge>}
                {form.hasReferralPromo && (
                  <Badge variant="info">소개 10%</Badge>
                )}
              </div>
            )
          )}
          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              취소
            </Button>
            <Button type="submit">{editing ? "저장" : "추가"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function ContractStatusCell({ contract }: { contract: Contract }) {
  const status = getContractStatusDisplay(contract);
  const pipeline = getPipelineCategory(contract);

  if (contract.status === "terminated") {
    return (
      <div className="space-y-1">
        <Badge variant="default">{CONTRACT_STATUS_LABELS.terminated}</Badge>
        <p className="text-[10px] text-zinc-600">{status.label}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {status.isInProgress ? (
        <Badge variant="success">{status.label}</Badge>
      ) : (
        <Badge variant="default">{status.label}</Badge>
      )}
      {pipeline !== "in_progress" && (
        <Badge
          variant={
            pipeline === "extension_imminent" ? "warning" : "danger"
          }
        >
          {PIPELINE_CATEGORY_LABELS[pipeline]}
        </Badge>
      )}
    </div>
  );
}
