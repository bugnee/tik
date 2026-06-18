"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, ExternalLink, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useContracts } from "@/features/contracts/useContracts";
import { useRole } from "@/context/RoleContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SaveButton } from "@/components/ui/SaveButton";
import { Card } from "@/components/ui/Card";
import {
  DataTable,
  EmptyState,
  PageHeader,
  SearchBar,
  SortableTh,
  Td,
  Th,
  Tr,
} from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";
import { Checkbox, Input, Select } from "@/components/ui/FormFields";
import { GlossaryHint } from "@/components/ui/GlossaryHint";
import { Modal } from "@/components/ui/Modal";
import { LeaderManagedContractNotice } from "@/components/contracts/LeaderManagedContractNotice";
import { ExtensionContractCheckboxField } from "@/components/contracts/ExtensionContractCheckboxField";
import { ClientLinksFields } from "@/components/contracts/ClientLinksPanel";
import { ClientBusinessInfoFields } from "@/components/contracts/ClientBusinessInfoFields";
import { RegionSelect } from "@/components/location/RegionSelect";
import {
  locationMatchesSearch,
  LOCATION_FIELD_HINT,
} from "@/lib/location-profile-utils";
import { cn } from "@/lib/cn";
import {
  countPipeline,
  getContractStatusDisplay,
  getPipelineCategory,
} from "@/lib/contract-lifecycle";
import { canEnableExtensionContractCheckbox } from "@/lib/contract-terms-utils";
import { formatKRW } from "@/lib/finance";
import { filterPartnersByCategory, getPartnerName } from "@/lib/partner-utils";
import {
  formatContractTargetSummary,
  getContractTargetChannels,
  getContractTargetCount,
  setContractTargetCount,
} from "@/lib/task-channel-utils";
import type { TaskChannelDefinition } from "@/lib/types";
import { getGlossaryForTaskChannel } from "@/lib/marketing-glossary";
import {
  isLeaderManagedAssignee,
  isLeaderManagedContract,
} from "@/lib/contract-access-utils";
import {
  contractAssigneeUsers,
  filterContractsByRole,
  getTeamName,
  getUserName,
} from "@/lib/selectors";
import type { AppData, Contract, ContractInput } from "@/lib/types";
import {
  CONTRACT_STATUS_LABELS,
  PIPELINE_CATEGORY_LABELS,
} from "@/lib/types";
import { useFormDirty } from "@/hooks/useFormDirty";

type ContractSortKey =
  | "clientName"
  | "team"
  | "assignee"
  | "status"
  | "monthlyFee"
  | "place"
  | "conditions"
  | `channel:${string}`;
type SortDirection = "asc" | "desc";

const PIPELINE_SORT_ORDER = {
  in_progress: 0,
  extension_imminent: 1,
  contract_ending: 2,
} as const;

function compareContracts(
  a: Contract,
  b: Contract,
  sortKey: ContractSortKey,
  data: AppData,
  targetChannels: TaskChannelDefinition[],
): number {
  switch (sortKey) {
    case "clientName":
      return a.clientName.localeCompare(b.clientName, "ko");
    case "team":
      return getTeamName(data, a.teamId).localeCompare(
        getTeamName(data, b.teamId),
        "ko",
      );
    case "assignee":
      return getUserName(data, a.assignedStaffId).localeCompare(
        getUserName(data, b.assignedStaffId),
        "ko",
      );
    case "status": {
      const aPipeline = PIPELINE_SORT_ORDER[getPipelineCategory(a)];
      const bPipeline = PIPELINE_SORT_ORDER[getPipelineCategory(b)];
      if (aPipeline !== bPipeline) return aPipeline - bPipeline;
      return getContractStatusDisplay(a).sortKey.localeCompare(
        getContractStatusDisplay(b).sortKey,
      );
    }
    case "monthlyFee":
      return a.monthlyFee - b.monthlyFee;
    case "place":
      return Number(a.hasPlaceSetting) - Number(b.hasPlaceSetting);
    case "conditions":
      return (
        Number(a.isExtension) - Number(b.isExtension) ||
        Number(a.hasReferralPromo) - Number(b.hasReferralPromo)
      );
    default: {
      if (!sortKey.startsWith("channel:")) return 0;
      const channelId = sortKey.slice("channel:".length);
      const channel = targetChannels.find((item) => item.id === channelId);
      if (!channel) return 0;
      return (
        getContractTargetCount(a, channel) - getContractTargetCount(b, channel)
      );
    }
  }
}

const emptyForm = (): ContractInput => ({
  clientName: "",
  monthlyFee: 0,
  targetOptimized: 8,
  targetInfluencer: 4,
  targetExperience: 0,
  targetInstaCard: 0,
  targetYoutube: 0,
  targetInstagram: 0,
  targetClip: 0,
  targetTiktok: 0,
  hasPlaceSetting: false,
  isExtension: false,
  hasReferralPromo: false,
  assignedStaffId: "",
  teamId: "",
  optimizedDone: 0,
  influencerDone: 0,
  youtubeDone: 0,
  instagramDone: 0,
  clipDone: 0,
  tiktokDone: 0,
  contractStartDate: new Date().toISOString().slice(0, 10),
  contractEndDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
    .toISOString()
    .slice(0, 10),
  status: "active",
  renewalMonthCount: 1,
});

export function ContractsManager() {
  const data = useData();
  const { addContract, updateContract, deleteContract } = useContracts();
  const { canManageContractTerms, currentUser, activeRole } = useRole();
  const { contracts, teams, partners, taskChannels } = data;
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<ContractSortKey | null>("monthlyFee");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
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
  const formDirty = useFormDirty(
    modalOpen,
    editing?.id ?? "create",
    form,
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return roleContracts.filter(
      (c) =>
        c.clientName.toLowerCase().includes(q) ||
        (c.companyName?.toLowerCase().includes(q) ?? false) ||
        getUserName(data, c.assignedStaffId).toLowerCase().includes(q) ||
        locationMatchesSearch(c, q),
    );
  }, [roleContracts, search, data]);

  function toggleSort(key: ContractSortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;

    return [...filtered].sort((a, b) => {
      const cmp = compareContracts(a, b, sortKey, data, targetChannels);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, data, targetChannels]);

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
          placeholder="상호명 · 회사명 · 담당자 · 지역 검색"
        />
      </Card>

      <DataTable>
        <thead>
          <tr>
            <SortableTh
              active={sortKey === "clientName"}
              direction={sortDir}
              onClick={() => toggleSort("clientName")}
            >
              상호명
            </SortableTh>
            <SortableTh
              active={sortKey === "team"}
              direction={sortDir}
              onClick={() => toggleSort("team")}
            >
              팀
            </SortableTh>
            <SortableTh
              active={sortKey === "assignee"}
              direction={sortDir}
              onClick={() => toggleSort("assignee")}
            >
              담당
            </SortableTh>
            <SortableTh
              active={sortKey === "status"}
              direction={sortDir}
              onClick={() => toggleSort("status")}
            >
              계약현황
            </SortableTh>
            <SortableTh
              active={sortKey === "monthlyFee"}
              direction={sortDir}
              onClick={() => toggleSort("monthlyFee")}
            >
              월 광고비
            </SortableTh>
            {targetChannels.map((channel) => (
              <SortableTh
                key={channel.id}
                active={sortKey === `channel:${channel.id}`}
                direction={sortDir}
                onClick={() => toggleSort(`channel:${channel.id}`)}
              >
                <GlossaryHint entry={getGlossaryForTaskChannel(channel)}>
                  {channel.label}
                </GlossaryHint>
              </SortableTh>
            ))}
            <SortableTh
              active={sortKey === "place"}
              direction={sortDir}
              onClick={() => toggleSort("place")}
            >
              <GlossaryHint text="플레이스">플레이스</GlossaryHint>
            </SortableTh>
            <SortableTh
              active={sortKey === "conditions"}
              direction={sortDir}
              onClick={() => toggleSort("conditions")}
            >
              조건
            </SortableTh>
            <Th className="w-24">관리</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <Tr key={c.id}>
              <Td className="font-medium text-zinc-100">
                <span className="inline-flex flex-wrap items-center gap-1">
                  <Link
                    href={`/contracts/${c.id}`}
                    className={cn(
                      "text-left transition-colors hover:text-emerald-400 hover:underline",
                      sortKey === "clientName" && "text-emerald-300",
                    )}
                  >
                    {c.clientName}
                  </Link>
                  <Link
                    href={`/contracts/${c.id}`}
                    className="inline-flex rounded p-0.5 text-zinc-500 hover:text-emerald-400"
                    aria-label={`${c.clientName} 계약 상세`}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </span>
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
                  {c.hasReferralPromo && <Badge variant="info">리셀러10%</Badge>}
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
            label="상호명 *"
            value={form.clientName}
            onChange={(e) => setForm({ ...form, clientName: e.target.value })}
            placeholder="매장·브랜드 표기명"
            required
          />
          <Input
            label="회사명"
            value={form.companyName ?? ""}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            placeholder="법인·사업자 등록상 회사명"
          />
          <ClientBusinessInfoFields
            value={{
              businessRegistrationNumber: form.businessRegistrationNumber,
              clientPhone: form.clientPhone,
              representativeName: form.representativeName,
              clientEmail: form.clientEmail,
              clientContactName: form.clientContactName,
              clientContactPhone: form.clientContactPhone,
            }}
            onChange={(info) => setForm({ ...form, ...info })}
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
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <Select
            label="담당 (실무·팀장) *"
            value={form.assignedStaffId}
            onChange={(e) =>
              setForm({ ...form, assignedStaffId: e.target.value })
            }
          >
            {assignees.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.role === "team_leader" ? " (팀장 · 직접 담당)" : ""}
              </option>
            ))}
          </Select>
          {isLeaderManagedAssignee(data, form.assignedStaffId) && (
            <LeaderManagedContractNotice />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="계약 시작일"
              type="date"
              value={form.contractStartDate}
              onChange={(e) => {
                const contractStartDate = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  contractStartDate,
                  isExtension:
                    canEnableExtensionContractCheckbox(contractStartDate) &&
                    prev.isExtension,
                }));
              }}
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
                labelGlossary
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
            labelGlossary="플레이스"
            checked={form.hasPlaceSetting}
            onChange={(v) => setForm({ ...form, hasPlaceSetting: v })}
          />
          <div className="space-y-3 rounded-xl border border-violet-500/15 bg-violet-500/5 p-4">
            <p className="text-xs font-medium text-violet-300/90">
              고객사 위치 · 체험단 일정 지역
            </p>
            <p className="text-xs text-zinc-500">{LOCATION_FIELD_HINT}</p>
            <RegionSelect
              province={form.regionProvince ?? ""}
              city={form.regionCity ?? ""}
              onProvinceChange={(regionProvince) =>
                setForm((prev) => ({ ...prev, regionProvince, regionCity: "" }))
              }
              onCityChange={(regionCity) =>
                setForm((prev) => ({ ...prev, regionCity }))
              }
            />
            <Input
              label="상세 주소"
              value={form.address ?? ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="도로명 · 건물명"
            />
          </div>
          <ClientLinksFields
            value={{
              placeLink: form.placeLink,
              instagramLink: form.instagramLink,
              youtubeLink: form.youtubeLink,
              otherLink: form.otherLink,
            }}
            onChange={(links) => setForm({ ...form, ...links })}
          />
          {canManageContractTerms ? (
            <div className="flex flex-wrap gap-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="w-full text-xs text-amber-400/80">
                임원 · 대표 전용 설정
              </p>
              <ExtensionContractCheckboxField
                contractStartDate={form.contractStartDate}
                label="연장 계약 (재계약 · 성과급 정책 적용)"
                checked={form.isExtension}
                onChange={(isExtension) => setForm({ ...form, isExtension })}
              />
              <Checkbox
                label="리셀러 프로모션 (10%)"
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
                  연장/리셀러 프로모션 조건 (임원 · 대표만 수정 가능)
                </span>
                {form.isExtension && <Badge variant="success">연장</Badge>}
                {form.hasReferralPromo && (
                  <Badge variant="info">리셀러 10%</Badge>
                )}
              </div>
            )
          )}
          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              취소
            </Button>
            <SaveButton type="submit" dirty={formDirty}>
              {editing ? "저장" : "추가"}
            </SaveButton>
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
