import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
    getWalletsListFn,
    getTransactionsFn,
    getExpensesFn,
    EXPENSE_CATEGORIES,
} from "@/server-functions/finance-fn";
import {
    useCreateWallet,
    useDepositToWallet,
    useCreateExpense,
} from "@/hooks/finance/use-finance";
import { GenericEmpty } from "@/components/custom/empty";
import { Button } from "@/components/ui/button";
import { FinanceEmptyIllustration } from "@/components/illustrations/FinanceEmptyIllustration";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ResponsiveSheet } from "@/components/custom/responsive-sheet";
import {
    WalletIcon,
    BanknoteIcon,
    PlusIcon,
    ArrowDownIcon,
    ArrowUpIcon,
    ReceiptIcon,
    TrendingUpIcon,
    AlertTriangleIcon,
    CheckCircle2Icon,
    Loader2,
    Building2,
    SparklesIcon,
    ClockIcon,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const FinanceContainer = () => {
    const { data: wallets } = useSuspenseQuery({
        queryKey: ["wallets"],
        queryFn: getWalletsListFn,
    });

    const { data: recentTransactions } = useSuspenseQuery({
        queryKey: ["transactions"],
        queryFn: () => getTransactionsFn({ data: { limit: 20 } }),
    });

    const { data: expenses } = useSuspenseQuery({
        queryKey: ["expenses"],
        queryFn: () => getExpensesFn({ data: {} }),
    });

    const [isCreateWalletOpen, setIsCreateWalletOpen] = useState(false);
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [isExpenseOpen, setIsExpenseOpen] = useState(false);
    const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);

    // KPI totals
    const totalBalance = wallets.reduce(
        (sum, w) => sum + parseFloat(w.balance || "0"),
        0,
    );
    const cashBalance = wallets
        .filter((w) => w.type === "cash")
        .reduce((sum, w) => sum + parseFloat(w.balance || "0"), 0);
    const bankBalance = wallets
        .filter((w) => w.type === "bank")
        .reduce((sum, w) => sum + parseFloat(w.balance || "0"), 0);
    const totalExpenses = expenses.reduce(
        (sum, e) => sum + parseFloat(e.amount || "0"),
        0,
    );

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-2 font-semibold"
                        onClick={() => setIsDepositOpen(true)}
                        disabled={wallets.length === 0}
                    >
                        <ArrowDownIcon className="size-3.5 text-emerald-600" /> Deposit
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-2 font-semibold"
                        onClick={() => setIsExpenseOpen(true)}
                        disabled={wallets.length === 0}
                    >
                        <ReceiptIcon className="size-3.5 text-amber-600" /> Record Expense
                    </Button>
                </div>
                <Button
                    size="sm"
                    className="h-9 gap-2 font-semibold"
                    onClick={() => setIsCreateWalletOpen(true)}
                >
                    <PlusIcon className="size-3.5" /> New Account
                </Button>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    label="Total Balance"
                    value={`₨ ${totalBalance.toLocaleString()}`}
                    icon={TrendingUpIcon}
                    color="text-emerald-600"
                    bgColor="bg-emerald-50 dark:bg-emerald-950/20"
                />
                <KPICard
                    label="Cash Balance"
                    value={`₨ ${cashBalance.toLocaleString()}`}
                    icon={BanknoteIcon}
                    color="text-violet-600"
                    bgColor="bg-violet-50 dark:bg-violet-950/20"
                    subtext={`${wallets.filter((w) => w.type === "cash").length} cash account(s)`}
                />
                <KPICard
                    label="Bank Balance"
                    value={`₨ ${bankBalance.toLocaleString()}`}
                    icon={Building2}
                    color="text-blue-600"
                    bgColor="bg-blue-50 dark:bg-blue-950/20"
                    subtext={`${wallets.filter((w) => w.type === "bank").length} bank account(s)`}
                />
                <KPICard
                    label="Total Expenses"
                    value={`₨ ${totalExpenses.toLocaleString()}`}
                    icon={ReceiptIcon}
                    color="text-rose-600"
                    bgColor="bg-rose-50 dark:bg-rose-950/20"
                    subtext={`${expenses.length} recorded`}
                />
            </div>

            {/* Wallet Cards Grid */}
            {wallets.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-16">
                        <GenericEmpty
                            icon={FinanceEmptyIllustration}
                            title="No Accounts Yet"
                            description='Create your first account (Cash Box or Bank Account) to start tracking finances. Click "New Account" above.'
                        />
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {wallets.map((wallet) => (
                        <WalletCard
                            key={wallet.id}
                            wallet={wallet}
                            onDeposit={() => {
                                setSelectedWalletId(wallet.id);
                                setIsDepositOpen(true);
                            }}
                            onExpense={() => {
                                setSelectedWalletId(wallet.id);
                                setIsExpenseOpen(true);
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Recent Transactions */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                        <ClockIcon className="size-5 text-muted-foreground/70" />
                        Recent Activity
                    </h2>
                    <Badge variant="secondary" className="font-semibold text-xs">
                        {recentTransactions.length} entries
                    </Badge>
                </div>
                {recentTransactions.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="py-8">
                            <GenericEmpty
                                icon={FinanceEmptyIllustration}
                                title="No Transactions"
                                description="Transactions will appear here when you deposit, withdraw, or record expenses."
                            />
                        </CardContent>
                    </Card>
                ) : (
                    <div className="border border-muted-foreground/10 rounded-2xl bg-card overflow-hidden">
                        <div className="divide-y divide-muted-foreground/5">
                            {recentTransactions.map((txn) => (
                                <TransactionRow key={txn.id} txn={txn} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Sheets */}
            <CreateWalletSheet
                open={isCreateWalletOpen}
                onOpenChange={setIsCreateWalletOpen}
            />
            <DepositSheet
                open={isDepositOpen}
                onOpenChange={(open) => {
                    setIsDepositOpen(open);
                    if (!open) setSelectedWalletId(null);
                }}
                wallets={wallets}
                preselectedWalletId={selectedWalletId}
            />
            <ExpenseSheet
                open={isExpenseOpen}
                onOpenChange={(open) => {
                    setIsExpenseOpen(open);
                    if (!open) setSelectedWalletId(null);
                }}
                wallets={wallets}
                preselectedWalletId={selectedWalletId}
            />
        </div>
    );
};

// ────────────────────────────────────────────────────────
// KPI Card
// ────────────────────────────────────────────────────────

function KPICard({
    label,
    value,
    icon: Icon,
    color,
    bgColor,
    subtext,
}: {
    label: string;
    value: string;
    icon: any;
    color: string;
    bgColor: string;
    subtext?: string;
}) {
    return (
        <Card>
            <CardContent className="p-0">
                <div className="p-6 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-2.5 rounded-xl ${bgColor}`}>
                            <Icon className={`size-5 ${color}`} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            {label}
                        </p>
                        <h3 className={`text-2xl font-black tracking-tight ${color}`}>
                            {value}
                        </h3>
                        {subtext && (
                            <p className="text-xs font-semibold tracking-tight text-muted-foreground/70">
                                {subtext}
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ────────────────────────────────────────────────────────
// Wallet Card
// ────────────────────────────────────────────────────────

function WalletCard({
    wallet,
    onDeposit,
    onExpense,
}: {
    wallet: any;
    onDeposit: () => void;
    onExpense: () => void;
}) {
    const balance = parseFloat(wallet.balance || "0");
    const isLowBalance = balance < 5000;

    return (
        <Card
            className={`relative overflow-hidden group hover:shadow-lg transition-all duration-300 ${isLowBalance ? "border-amber-300/50" : ""
                }`}
        >
            {/* Gradient accent strip */}
            <div
                className={`absolute inset-x-0 top-0 h-1.5 ${wallet.type === "bank"
                        ? "bg-gradient-to-r from-blue-500 to-cyan-400"
                        : "bg-gradient-to-r from-violet-500 to-fuchsia-400"
                    }`}
            />
            {/* Decorative blur circle */}
            <div
                className={`absolute -top-10 -right-10 size-32 rounded-full blur-3xl opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-500 ${wallet.type === "bank" ? "bg-blue-400" : "bg-violet-400"
                    }`}
            />

            <CardContent className="p-5 pt-7 relative">
                <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div
                            className={`p-2.5 rounded-xl shadow-sm ${wallet.type === "bank"
                                    ? "bg-linear-to-br from-blue-100 to-cyan-50 dark:from-blue-900/40 dark:to-cyan-900/20"
                                    : "bg-linear-to-br from-violet-100 to-fuchsia-50 dark:from-violet-900/40 dark:to-fuchsia-900/20"
                                }`}
                        >
                            {wallet.type === "bank" ? (
                                <Building2 className="size-5 text-blue-600" />
                            ) : (
                                <BanknoteIcon className="size-5 text-violet-600" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-sm leading-tight">{wallet.name}</h3>
                            <Badge
                                variant="secondary"
                                className="text-[9px] font-bold uppercase tracking-widest mt-1 px-2"
                            >
                                {wallet.type === "bank" ? "Bank Account" : "Cash Box"}
                            </Badge>
                        </div>
                    </div>
                    {isLowBalance && (
                        <div className="flex items-center gap-1 text-amber-500">
                            <AlertTriangleIcon className="size-4" />
                        </div>
                    )}
                </div>

                <div className="mb-5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Current Balance
                    </p>
                    <p
                        className={`text-3xl font-black tracking-tight mt-1 tabular-nums ${isLowBalance ? "text-amber-600" : ""
                            }`}
                    >
                        ₨ {balance.toLocaleString()}
                    </p>
                    {isLowBalance && (
                        <p className="text-[10px] text-amber-600 font-semibold mt-1 flex items-center gap-1">
                            <AlertTriangleIcon className="size-2.5" /> Low balance — consider
                            depositing
                        </p>
                    )}
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9 text-xs font-bold gap-1.5 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 dark:hover:bg-emerald-950/20 transition-colors"
                        onClick={onDeposit}
                    >
                        <ArrowDownIcon className="size-3.5 text-emerald-600" /> Deposit
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9 text-xs font-bold gap-1.5 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 dark:hover:bg-rose-950/20 transition-colors"
                        onClick={onExpense}
                    >
                        <ArrowUpIcon className="size-3.5 text-rose-500" /> Expense
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// ────────────────────────────────────────────────────────
// Transaction Row
// ────────────────────────────────────────────────────────

function TransactionRow({ txn }: { txn: any }) {
    const isCredit = txn.type === "credit";
    const amount = parseFloat(txn.amount || "0");

    return (
        <div className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors group">
            <div className="flex items-center gap-3">
                <div
                    className={`p-2 rounded-xl transition-colors ${isCredit
                            ? "bg-emerald-50 dark:bg-emerald-950/30 group-hover:bg-emerald-100"
                            : "bg-rose-50 dark:bg-rose-950/30 group-hover:bg-rose-100"
                        }`}
                >
                    {isCredit ? (
                        <ArrowDownIcon className="size-4 text-emerald-600" />
                    ) : (
                        <ArrowUpIcon className="size-4 text-rose-500" />
                    )}
                </div>
                <div>
                    <p className="text-sm font-bold leading-tight">{txn.source}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                            {txn.wallet?.type === "bank" ? (
                                <Building2 className="size-2.5" />
                            ) : (
                                <BanknoteIcon className="size-2.5" />
                            )}{" "}
                            {txn.wallet?.name}
                        </span>
                        <span className="text-muted-foreground/30">•</span>
                        <span className="text-[10px] text-muted-foreground">
                            {format(new Date(txn.createdAt), "dd MMM yyyy, hh:mm a")}
                        </span>
                        {txn.performer?.name && (
                            <>
                                <span className="text-muted-foreground/30">•</span>
                                <span className="text-[10px] text-muted-foreground">
                                    {txn.performer.name}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <span
                className={`font-black text-sm tabular-nums ${isCredit ? "text-emerald-600" : "text-rose-500"
                    }`}
            >
                {isCredit ? "+" : "−"} ₨ {amount.toLocaleString()}
            </span>
        </div>
    );
}

// ────────────────────────────────────────────────────────
// SHEETS
// ────────────────────────────────────────────────────────

function CreateWalletSheet({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [name, setName] = useState("");
    const [type, setType] = useState<"cash" | "bank">("cash");
    const [initialBalance, setInitialBalance] = useState("");
    const mutation = useCreateWallet();

    const handleSubmit = () => {
        if (!name.trim()) {
            toast.error("Please provide an account name");
            return;
        }
        mutation.mutate(
            {
                data: {
                    name: name.trim(),
                    type,
                    initialBalance: parseFloat(initialBalance) || 0,
                },
            },
            {
                onSuccess: () => {
                    onOpenChange(false);
                    setName("");
                    setType("cash");
                    setInitialBalance("");
                },
            },
        );
    };

    return (
        <ResponsiveSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Create New Account"
            description="Add a cash box or bank account to track your finances."
            icon={WalletIcon}
        >
            <div className="space-y-5 py-4">
                {/* Account Type */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Account Type
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setType("cash")}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${type === "cash"
                                    ? "border-violet-500 bg-violet-50 dark:bg-violet-950/20 shadow-sm"
                                    : "border-muted-foreground/10 hover:border-muted-foreground/20"
                                }`}
                        >
                            <BanknoteIcon
                                className={`size-6 ${type === "cash" ? "text-violet-600" : "text-muted-foreground"}`}
                            />
                            <span
                                className={`text-sm font-bold ${type === "cash" ? "text-violet-700 dark:text-violet-400" : "text-muted-foreground"}`}
                            >
                                Cash Box
                            </span>
                            <span className="text-[10px] text-muted-foreground/70 text-center">
                                Physical cash drawer
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setType("bank")}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${type === "bank"
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-sm"
                                    : "border-muted-foreground/10 hover:border-muted-foreground/20"
                                }`}
                        >
                            <Building2
                                className={`size-6 ${type === "bank" ? "text-blue-600" : "text-muted-foreground"}`}
                            />
                            <span
                                className={`text-sm font-bold ${type === "bank" ? "text-blue-700 dark:text-blue-400" : "text-muted-foreground"}`}
                            >
                                Bank Account
                            </span>
                            <span className="text-[10px] text-muted-foreground/70 text-center">
                                HBL, Meezan, etc.
                            </span>
                        </button>
                    </div>
                </div>

                {/* Name */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Account Name
                    </Label>
                    <Input
                        placeholder={
                            type === "bank"
                                ? "e.g., HBL Business Account"
                                : "e.g., Main Cash Drawer"
                        }
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-11"
                    />
                </div>

                {/* Opening Balance */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Opening Balance (PKR)
                    </Label>
                    <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={initialBalance}
                        onChange={(e) => setInitialBalance(e.target.value)}
                        className="h-11 text-lg font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <SparklesIcon className="size-3" />
                        Leave 0 if starting fresh. You can deposit later.
                    </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={mutation.isPending}>
                        {mutation.isPending && (
                            <Loader2 className="size-4 mr-2 animate-spin" />
                        )}
                        Create Account
                    </Button>
                </div>
            </div>
        </ResponsiveSheet>
    );
}

function DepositSheet({
    open,
    onOpenChange,
    wallets,
    preselectedWalletId,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    wallets: any[];
    preselectedWalletId: string | null;
}) {
    const [walletId, setWalletId] = useState(preselectedWalletId || "");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const mutation = useDepositToWallet();

    const effectiveWalletId = walletId || preselectedWalletId || "";
    const selectedWallet = wallets.find((w) => w.id === effectiveWalletId);

    const handleSubmit = () => {
        const parsedAmount = parseFloat(amount);
        if (!effectiveWalletId) {
            toast.error("Please select an account");
            return;
        }
        if (!parsedAmount || parsedAmount <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }
        mutation.mutate(
            {
                data: {
                    walletId: effectiveWalletId,
                    amount: parsedAmount,
                    description: description.trim() || "Manual Deposit",
                    source: "Manual Deposit",
                },
            },
            {
                onSuccess: () => {
                    onOpenChange(false);
                    setAmount("");
                    setDescription("");
                    setWalletId("");
                },
            },
        );
    };

    return (
        <ResponsiveSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Deposit Money"
            description="Add funds to a cash box or bank account."
            icon={ArrowDownIcon}
        >
            <div className="space-y-5 py-4">
                {/* Wallet selection */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Deposit Into
                    </Label>
                    <Select value={effectiveWalletId} onValueChange={setWalletId}>
                        <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select account..." />
                        </SelectTrigger>
                        <SelectContent>
                            {wallets.map((w) => (
                                <SelectItem key={w.id} value={w.id}>
                                    <div className="flex items-center gap-2">
                                        {w.type === "bank" ? (
                                            <Building2 className="size-3.5 text-blue-600" />
                                        ) : (
                                            <BanknoteIcon className="size-3.5 text-violet-600" />
                                        )}
                                        <span className="font-medium">{w.name}</span>
                                        <span className="text-xs text-muted-foreground ml-2 tabular-nums">
                                            ₨ {parseFloat(w.balance || "0").toLocaleString()}
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedWallet && (
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-muted-foreground/5">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Current Balance
                            </span>
                            <span className="text-sm font-black tabular-nums">
                                ₨ {parseFloat(selectedWallet.balance || "0").toLocaleString()}
                            </span>
                        </div>
                    )}
                </div>

                {/* Amount */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Amount (PKR)
                    </Label>
                    <Input
                        type="number"
                        min="1"
                        placeholder="Enter amount..."
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="h-11 text-lg font-mono"
                    />
                    {selectedWallet && parseFloat(amount) > 0 && (
                        <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2Icon className="size-3" />
                            New balance: ₨{" "}
                            {(
                                parseFloat(selectedWallet.balance || "0") + parseFloat(amount)
                            ).toLocaleString()}
                        </p>
                    )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Description (Optional)
                    </Label>
                    <Input
                        placeholder="e.g., Sales revenue, Bank deposit..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="h-11"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={mutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {mutation.isPending && (
                            <Loader2 className="size-4 mr-2 animate-spin" />
                        )}
                        Confirm Deposit
                    </Button>
                </div>
            </div>
        </ResponsiveSheet>
    );
}

function ExpenseSheet({
    open,
    onOpenChange,
    wallets,
    preselectedWalletId,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    wallets: any[];
    preselectedWalletId: string | null;
}) {
    const [walletId, setWalletId] = useState(preselectedWalletId || "");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const mutation = useCreateExpense();

    const effectiveWalletId = walletId || preselectedWalletId || "";
    const selectedWallet = wallets.find((w) => w.id === effectiveWalletId);
    const currentBalance = parseFloat(selectedWallet?.balance || "0");
    const parsedAmount = parseFloat(amount) || 0;
    const insufficientFunds = parsedAmount > 0 && parsedAmount > currentBalance;

    const handleSubmit = () => {
        if (!effectiveWalletId) {
            toast.error("Please select a payment source");
            return;
        }
        if (!category) {
            toast.error("Please select a category");
            return;
        }
        if (!parsedAmount || parsedAmount <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }
        if (!description.trim()) {
            toast.error("Please provide a description");
            return;
        }
        if (insufficientFunds) {
            toast.error(
                `Insufficient balance in "${selectedWallet?.name}". Available: ₨ ${currentBalance.toLocaleString()}`,
            );
            return;
        }
        mutation.mutate(
            {
                data: {
                    walletId: effectiveWalletId,
                    amount: parsedAmount,
                    category,
                    description: description.trim(),
                },
            },
            {
                onSuccess: () => {
                    onOpenChange(false);
                    setAmount("");
                    setCategory("");
                    setDescription("");
                    setWalletId("");
                },
            },
        );
    };

    return (
        <ResponsiveSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Record Expense"
            description="Record an expense and debit from an account."
            icon={ReceiptIcon}
        >
            <div className="space-y-5 py-4">
                {/* Pay From */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Pay From
                    </Label>
                    <Select value={effectiveWalletId} onValueChange={setWalletId}>
                        <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select payment source..." />
                        </SelectTrigger>
                        <SelectContent>
                            {wallets.map((w) => (
                                <SelectItem key={w.id} value={w.id}>
                                    <div className="flex items-center gap-2">
                                        {w.type === "bank" ? (
                                            <Building2 className="size-3.5 text-blue-600" />
                                        ) : (
                                            <BanknoteIcon className="size-3.5 text-violet-600" />
                                        )}
                                        <span className="font-medium">{w.name}</span>
                                        <span className="text-xs text-muted-foreground ml-2 tabular-nums">
                                            ₨ {parseFloat(w.balance || "0").toLocaleString()}
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Balance indicator with real-time validation */}
                    {selectedWallet && (
                        <div
                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${insufficientFunds
                                    ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800"
                                    : "bg-muted/30 border-muted-foreground/5"
                                }`}
                        >
                            <span className="text-xs font-semibold text-muted-foreground">
                                Available Balance
                            </span>
                            <span
                                className={`text-sm font-black tabular-nums ${insufficientFunds ? "text-rose-600" : ""
                                    }`}
                            >
                                ₨ {currentBalance.toLocaleString()}
                            </span>
                        </div>
                    )}
                    {insufficientFunds && (
                        <div className="flex items-center gap-2 text-rose-600 text-xs font-bold p-2 bg-rose-50 dark:bg-rose-950/20 rounded-lg">
                            <AlertTriangleIcon className="size-3.5 shrink-0" />
                            Insufficient funds! You need ₨{" "}
                            {(parsedAmount - currentBalance).toLocaleString()} more.
                        </div>
                    )}
                </div>

                {/* Category */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Category
                    </Label>
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select expense category..." />
                        </SelectTrigger>
                        <SelectContent>
                            {EXPENSE_CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                    {cat}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Amount (PKR)
                    </Label>
                    <Input
                        type="number"
                        min="1"
                        placeholder="Enter amount..."
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="h-11 text-lg font-mono"
                    />
                    {selectedWallet && parsedAmount > 0 && !insufficientFunds && (
                        <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2Icon className="size-3" />
                            After expense: ₨{" "}
                            {(currentBalance - parsedAmount).toLocaleString()} remaining
                        </p>
                    )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Description
                        <Badge variant="destructive" className="ml-2 text-[9px]">
                            Required
                        </Badge>
                    </Label>
                    <Textarea
                        placeholder="e.g., February 2026 electricity bill from LESCO..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="min-h-[80px]"
                    />
                </div>

                {/* Audit warning */}
                <div className="text-xs text-muted-foreground p-3 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-lg">
                    ⚠️ All expenses are <strong>permanently recorded</strong> in the
                    ledger with your name, timestamp, and details.
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={mutation.isPending || insufficientFunds}
                        variant="destructive"
                    >
                        {mutation.isPending && (
                            <Loader2 className="size-4 mr-2 animate-spin" />
                        )}
                        Record Expense
                    </Button>
                </div>
            </div>
        </ResponsiveSheet>
    );
}
