"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Send, Trash2 } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useFinance } from "@/features/finance/useFinance";
import { useRole } from "@/context/RoleContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SaveButton } from "@/components/ui/SaveButton";
import { useSaveMeta } from "@/hooks/useSaveMeta";
import { Card } from "@/components/ui/Card";
import {
  DataTable,
  EmptyState,
  PageHeader,
  SortableTh,
  Td,
  Th,
  Tr,
} from "@/components/ui/DataTable";
import { FilterChipGroup } from "@/components/ui/FilterChipGroup";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { useSortedItems, useTableSort } from "@/hooks/useTableSort";
import {
  compareNumbers,
  compareStrings,
  LIST_SEARCH_PLACEHOLDERS,
  matchesListSearch,
  PAYOUT_BADGE_VARIANT,
  PAYOUT_FILTER_TONE,
} from "@/lib/list-ui-consistency";
import { Input, Select } from "@/components/ui/FormFields";
import { Modal } from "@/components/ui/Modal";
import { PeriodFilterBar } from "@/components/ui/PeriodFilterBar";
import { ExpensePayoutApprovalPanel } from "@/components/finance/ExpensePayoutApprovalPanel";
import { DEMO_TODAY } from "@/lib/contract-lifecycle";
import {
  canApproveExpensePayout,
  canUserRequestExpense,
} from "@/lib/expense-payout-utils";
import {
  createDefaultPeriodFilter,
  matchesPeriodDate,
  periodFilterLabel,
} from "@/lib/date-filter-utils";
import { formatKRW } from "@/lib/finance";
import {
  getActiveExpenseCategories,
} from "@/lib/expense-category-utils";
import { enrichExpense } from "@/lib/selectors";
import {
  expenseCategoryToPartnerCategory,
  filterPartnersForExpenseCategory,
  formatPartnerSelectLabel,
} from "@/lib/partner-utils";
import type { Expense, ExpenseCategory, ExpenseInput, PayoutStatus } from "@/lib/types";
import { PAYOUT_LABELS } from "@/lib/types";
import { useFormDirty } from "@/hooks/useFormDirty";
import { cn } from "@/lib/cn";

type ExpenseSortKey =
  | "clientName"
  | "partnerName"
  | "categoryLabel"
  | "paymentDueDate"
  | "amount"
  | "payoutStatus";

const emptyForm = (): ExpenseInput => ({
  contractId: "",
  category: "press",
  description: "",
  amount: 0,
  bankAccount: "",
  accountHolder: "",
  payoutStatus: "unpaid",
  paymentDueDate: DEMO_TODAY,
  partnerId: undefined,
});

function isPaymentOverdue(expense: Expense): boolean {
  if (expense.payoutStatus === "paid") return false;
  return expense.paymentDueDate < DEMO_TODAY;
}

export function ExpensesManager() {
  const data = useData();
  const { activeRole, currentUser } = useRole();
  const {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    requestExpensePayout,
  } = useFinance();
  const { contracts, partners, expenseCategories, partnerFilterDefinitions } =
    data;
  const [search, setSearch] = useState("");
  const [filterPayout, setFilterPayout] = useState<PayoutStatus | "all">("all");
  const { sortKey, sortDir, sortProps } = useTableSort<ExpenseSortKey>(
    "paymentDueDate",
    "desc",
  );
  const [periodFilter, setPeriodFilter] = useState(createDefaultPeriodFilter);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseInput>(emptyForm());
  const formDirty = useFormDirty(
    modalOpen,
    editing?.id ?? "create",
    form,
  );
  const saveMeta = useSaveMeta();

  const enriched = useMemo(
    () => expenses.map((e) => enrichExpense(data, e)),
    [expenses, data],
  );

  const filtered = useMemo(() => {
    return enriched.filter((e) => {
      const matchSearch = matchesListSearch(
        search,
        e.clientName,
        e.description,
        e.accountHolder,
        e.partnerName,
        e.bankAccount,
        e.bankName,
      );
      const matchPayout =
        filterPayout === "all" || e.payoutStatus === filterPayout;
      const matchPeriod = matchesPeriodDate(e.paymentDueDate, periodFilter);
      return matchSearch && matchPayout && matchPeriod;
    });
  }, [enriched, search, filterPayout, periodFilter]);

  const payoutCounts = useMemo(() => {
    const base = enriched.filter((e) =>
      matchesPeriodDate(e.paymentDueDate, periodFilter),
    );
    return (Object.keys(PAYOUT_LABELS) as PayoutStatus[]).reduce(
      (acc, status) => {
        acc[status] = base.filter((e) => e.payoutStatus === status).length;
        return acc;
      },
      {} as Record<PayoutStatus, number>,
    );
  }, [enriched, periodFilter]);

  const sorted = useSortedItems(
    filtered,
    sortKey,
    sortDir,
    (a, b, key) => {
      switch (key) {
        case "clientName":
          return compareStrings(a.clientName, b.clientName);
        case "partnerName":
          return compareStrings(a.partnerName, b.partnerName);
        case "categoryLabel":
          return compareStrings(a.categoryLabel, b.categoryLabel);
        case "paymentDueDate":
          return compareStrings(a.paymentDueDate, b.paymentDueDate);
        case "amount":
          return compareNumbers(a.amount, b.amount);
        case "payoutStatus":
          return compareStrings(a.payoutStatus, b.payoutStatus);
        default:
          return 0;
      }
    },
  );

  const filteredTotal = useMemo(
    () => filtered.reduce((s, e) => s + e.amount, 0),
    [filtered],
  );

  const activeCategories = useMemo(
    () => getActiveExpenseCategories(expenseCategories),
    [expenseCategories],
  );

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm(),
      contractId: contracts[0]?.id ?? "",
      category: activeCategories[0]?.id ?? "press",
    });
    setModalOpen(true);
  }

  function openEdit(e: Expense) {
    setEditing(e);
    setForm({ ...e });
    setModalOpen(true);
  }

  const partnerOptions = useMemo(
    () =>
      filterPartnersForExpenseCategory(
        partners,
        form.category,
        expenseCategories,
      ),
    [partners, form.category, expenseCategories],
  );

  function applyPartner(partnerId: string) {
    const partner = partners.find((p) => p.id === partnerId);
    if (!partner) {
      setForm((prev) => ({ ...prev, partnerId: undefined }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      partnerId: partner.id,
      bankAccount: partner.bankAccount,
      accountHolder: partner.accountHolder,
      amount: prev.amount || partner.unitPrice || prev.amount,
    }));
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.contractId || !form.bankAccount || !form.paymentDueDate) return;
    const payload = { ...form, payoutStatus: editing?.payoutStatus ?? "unpaid" as const };
    if (editing) {
      updateExpense(editing.id, payload);
    } else {
      addExpense({ ...payload, payoutStatus: "unpaid" });
    }
    saveMeta.recordSave();
    setModalOpen(false);
  }

  function handleRequestPayout(expense: Expense) {
    if (!confirm("입금 요청을 상신하시겠습니까? (대표·임원 승인 후 재무 큐에 추가)")) {
      return;
    }
    requestExpensePayout(expense.id, currentUser.id);
  }

  return (
    <>
      <PageHeader
        title="집행 원가"
        description={`${expenses.length}건 · 기자단/체험단 등 실제 원가 건별 기록`}
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            원가 등록
          </Button>
        }
      />

      {canApproveExpensePayout(activeRole) && (
        <div className="mb-6">
          <ExpensePayoutApprovalPanel />
        </div>
      )}

      <PeriodFilterBar
        className="mb-4"
        value={periodFilter}
        onChange={setPeriodFilter}
        summary={`${periodFilterLabel(periodFilter)} · ${filtered.length}건 · ${formatKRW(filteredTotal)}`}
      />

      <Card className="mb-4">
        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={LIST_SEARCH_PLACEHOLDERS.expenses}
          showSortHint
          filters={
            <FilterChipGroup
              value={filterPayout}
              onChange={setFilterPayout}
              options={(Object.keys(PAYOUT_LABELS) as PayoutStatus[]).map(
                (status) => ({
                  value: status,
                  label: PAYOUT_LABELS[status],
                  count: payoutCounts[status],
                  tone: PAYOUT_FILTER_TONE[status],
                }),
              )}
            />
          }
        />
      </Card>

      <DataTable>
        <thead>
          <tr>
            <SortableTh {...sortProps("clientName")}>업체</SortableTh>
            <SortableTh {...sortProps("partnerName")}>파트너사</SortableTh>
            <SortableTh {...sortProps("categoryLabel")}>카테고리</SortableTh>
            <Th>내용</Th>
            <SortableTh {...sortProps("paymentDueDate")}>입금마감일</SortableTh>
            <SortableTh {...sortProps("amount")}>금액</SortableTh>
            <Th>은행 · 계좌</Th>
            <SortableTh {...sortProps("payoutStatus")}>상태</SortableTh>
            <Th className="w-32">관리</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((e) => {
            const overdue = isPaymentOverdue(e);
            const canRequest = canUserRequestExpense(
              data,
              e,
              currentUser.id,
              activeRole,
            );
            return (
              <Tr key={e.id}>
                <Td className="font-medium text-zinc-100">{e.clientName}</Td>
                <Td className="text-sm text-cyan-400/90">{e.partnerName}</Td>
                <Td>{e.categoryLabel}</Td>
                <Td className="max-w-[200px] truncate">{e.description}</Td>
                <Td
                  className={cn(
                    "whitespace-nowrap text-xs",
                    overdue ? "font-medium text-rose-400" : "text-zinc-300",
                  )}
                >
                  {e.paymentDueDate}
                  {overdue && (
                    <span className="ml-1 text-[10px] text-rose-400/80">
                      연체
                    </span>
                  )}
                </Td>
                <Td className="font-mono">{formatKRW(e.amount)}</Td>
                <Td className="font-mono text-xs">
                  {e.bankName ? (
                    <>
                      <span className="text-zinc-500">{e.bankName}</span>{" "}
                      {e.bankAccount}
                    </>
                  ) : (
                    e.bankAccount
                  )}
                  <br />
                  <span className="text-zinc-600">{e.accountHolder}</span>
                </Td>
                <Td>
                  <Badge variant={PAYOUT_BADGE_VARIANT[e.payoutStatus]}>
                    {PAYOUT_LABELS[e.payoutStatus]}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {canRequest && (
                      <button
                        type="button"
                        title="입금 요청"
                        onClick={() => handleRequestPayout(e)}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-cyan-400"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(e)}
                      className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {e.payoutStatus === "unpaid" && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("삭제하시겠습니까?")) deleteExpense(e.id);
                        }}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </DataTable>

      {sorted.length === 0 && <EmptyState message="원가 데이터가 없습니다" />}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "원가 수정" : "원가 등록"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="계약 업체 *"
            value={form.contractId}
            onChange={(e) => setForm({ ...form, contractId: e.target.value })}
          >
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.clientName}
              </option>
            ))}
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="집행 분야 *"
              value={form.category}
              onChange={(e) => {
                const category = e.target.value as ExpenseCategory;
                setForm({
                  ...form,
                  category,
                  partnerId: undefined,
                  bankAccount: "",
                  accountHolder: "",
                });
              }}
            >
              {(activeCategories.length
                ? activeCategories
                : expenseCategories
              ).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Select
              label="파트너사"
              value={form.partnerId ?? ""}
              onChange={(e) => applyPartner(e.target.value)}
            >
              <option value="">직접 입력 / 미선택</option>
              {partnerOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatPartnerSelectLabel(
                    p,
                    expenseCategoryToPartnerCategory(
                      form.category,
                      expenseCategories,
                    ) ?? undefined,
                    partnerFilterDefinitions,
                  )}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-medium text-zinc-400">지급 상태</p>
              <Badge variant={PAYOUT_BADGE_VARIANT[editing?.payoutStatus ?? "unpaid"]}>
                {PAYOUT_LABELS[editing?.payoutStatus ?? "unpaid"]}
              </Badge>
              <p className="mt-1 text-[11px] text-zinc-600">
                담당 입금요청 → 대표·임원 승인 → 재무 지급
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="입금마감일 *"
              type="date"
              value={form.paymentDueDate}
              onChange={(e) =>
                setForm({ ...form, paymentDueDate: e.target.value })
              }
              required
            />
            <Input
              label="금액 (원) *"
              type="number"
              min={0}
              value={form.amount || ""}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              required
            />
          </div>
          <Input
            label="내용"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="계좌번호 *"
              value={form.bankAccount}
              onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
              placeholder="110-123-456789"
              required
            />
            <Input
              label="예금주 *"
              value={form.accountHolder}
              onChange={(e) => setForm({ ...form, accountHolder: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              취소
            </Button>
            <SaveButton
              type="submit"
              dirty={formDirty}
              savedAt={saveMeta.savedAt}
              savedBy={saveMeta.savedBy}
            >
              {editing ? "저장" : "등록"}
            </SaveButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
