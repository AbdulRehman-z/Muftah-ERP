import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAllExpenseCategoriesFn,
  createExpenseCategoryFn,
  updateExpenseCategoryFn,
  deleteExpenseCategoryFn,
} from "@/server-functions/finance/expense-categories-fn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pencil,
  Trash2,
  Plus,
  Loader2,
  Check,
  X,
  Hash,
  Search,
  Tag,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Category = {
  id: string;
  name: string;
  isActive: boolean;
};

export function ExpenseCategoriesManager() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["expense-categories", "all"],
    queryFn: () => listAllExpenseCategoriesFn(),
  });

  useEffect(() => {
    if ((isCreating || editingId) && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating, editingId]);

  // ── Mutations ─────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: createExpenseCategoryFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense-categories"] });
      toast.success("Category created");
      cancelAction();
    },
    onError: (e: any) => toast.error(e.message || "Operation failed"),
  });

  const updateMutation = useMutation({
    mutationFn: updateExpenseCategoryFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense-categories"] });
      cancelAction();
    },
    onError: (e: any) => toast.error(e.message || "Sync failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExpenseCategoryFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense-categories"] });
      toast.success("Category deleted permanently");
      setIsDeletingId(null);
      setActiveTab("active"); // Force switch back to active tab as it's fully gone
    },
    onError: (e: any) => {
      setIsDeletingId(null);
      toast.error(e.message || "Delete failed (Is it still in use?)");
    },
  });

  // ── Handlers ─────────────────────────────────────────────

  const handleSaveCreate = () => {
    if (!draftName.trim()) return cancelAction();
    createMutation.mutate({ data: { name: draftName.trim() } });
  };

  const handleSaveEdit = () => {
    if (!editingId || !draftName.trim()) return cancelAction();
    updateMutation.mutate({
      data: { id: editingId, name: draftName.trim() },
    });
  };

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    updateMutation.mutate({
      data: { id, isActive: !currentStatus },
    });
  };

  const handleDelete = (id: string) => {
    setIsDeletingId(id);
    deleteMutation.mutate({ data: { id } });
  };

  const startCreate = () => {
    setEditingId(null);
    setDraftName("");
    setIsCreating(true);
  };

  const startEdit = (cat: Category) => {
    setIsCreating(false);
    setEditingId(cat.id);
    setDraftName(cat.name);
  };

  const cancelAction = () => {
    setIsCreating(false);
    setEditingId(null);
    setDraftName("");
  };

  // Filtered data
  const listData = categories
    .filter((c: Category) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .filter((c: Category) =>
      activeTab === "active" ? c.isActive : !c.isActive,
    );
  const activeCount = categories.filter((c: Category) => c.isActive).length;
  const archivedCount = categories.filter((c: Category) => !c.isActive).length;

  // ── UI ───────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full min-h-[500px] w-full bg-background border rounded-lg overflow-hidden  relative">
        {/* Header */}
        <header className="px-6 py-4 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-md bg-primary flex items-center justify-center">
              <Tag className="size-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                Expense Categories
              </h2>
              <p className="text-[11px] text-muted-foreground font-medium">
                Configure and manage expense classifications
              </p>
            </div>
          </div>
          <Button onClick={startCreate} size="sm" className="h-8 gap-1.5">
            <Plus className="size-3.5 stroke-[3px]" />
            Add Category
          </Button>
        </header>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-border/50 flex items-center justify-between gap-4">
          <div className="relative group flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground group-focus-within:text-foreground transition-colors" />
            <Input
              placeholder="Find a category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-9 text-xs bg-muted/50 border-transparent focus:border-border transition-all"
            />
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-auto"
          >
            <TabsList className="h-8 p-0.5 bg-muted">
              <TabsTrigger
                value="active"
                className="h-7 text-[11px] px-3 data-[state=active]:bg-background data-[state=active]:shadow-none"
              >
                Active{" "}
                <Badge
                  variant="secondary"
                  className="ml-2 h-4 px-1 text-[9px] bg-emerald-500/10 text-emerald-600 border-none"
                >
                  {activeCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="archived"
                className="h-7 text-[11px] px-3 data-[state=active]:bg-background data-[state=active]:shadow-none"
              >
                Archived{" "}
                <Badge
                  variant="secondary"
                  className="ml-2 h-4 px-1 text-[9px] bg-muted-foreground/10 text-muted-foreground border-none"
                >
                  {archivedCount}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col">
            <AnimatePresence mode="popLayout">
              {isCreating && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden border-b bg-primary/2"
                >
                  <div className="p-4 flex items-center gap-3">
                    <div className="size-8 rounded bg-background border flex items-center justify-center">
                      <Hash className="size-4 text-muted-foreground" />
                    </div>
                    <Input
                      ref={inputRef}
                      placeholder="Enter category name..."
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveCreate();
                        if (e.key === "Escape") cancelAction();
                      }}
                      className="flex-1 h-9 bg-transparent border-none text-sm focus-visible:ring-0 placeholder:text-muted-foreground/50"
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        onClick={handleSaveCreate}
                        disabled={createMutation.isPending || !draftName.trim()}
                        className="h-8"
                      >
                        {createMutation.isPending ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={cancelAction}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                    Loading Registry...
                  </p>
                </div>
              ) : listData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                  <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Archive className="size-8 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-sm font-semibold">No results found</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                    Try adjusting your search or add a new category to get
                    started.
                  </p>
                  {!isCreating && (
                    <Button
                      onClick={startCreate}
                      variant="outline"
                      size="sm"
                      className="mt-6"
                    >
                      Add First Category
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  <LayoutGroup>
                    {listData.map((cat: Category) => (
                      <CategoryRow
                        key={cat.id}
                        cat={cat}
                        isEditing={editingId === cat.id}
                        draftName={draftName}
                        setDraftName={setDraftName}
                        handleSaveEdit={handleSaveEdit}
                        cancelAction={cancelAction}
                        startEdit={startEdit}
                        handleToggleActive={handleToggleActive}
                        handleDelete={handleDelete}
                        isDeleting={isDeletingId === cat.id}
                        updatePending={updateMutation.isPending}
                      />
                    ))}
                  </LayoutGroup>
                </div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-3 border-t bg-muted/20 flex items-center justify-between text-[10px] font-medium text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <div className="size-1 bg-emerald-500 rounded-full animate-pulse" />{" "}
              Linked to Finance DB
            </span>
          </div>
          <span>{activeCount + archivedCount} Total Records</span>
        </footer>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--muted-foreground) / 0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground) / 0.2); }
            `,
        }}
      />
    </TooltipProvider>
  );
}

function CategoryRow({
  cat,
  isEditing,
  draftName,
  setDraftName,
  handleSaveEdit,
  cancelAction,
  startEdit,
  handleToggleActive,
  handleDelete,
  updatePending,
}: any) {
  const isArchived = !cat.isActive;

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "group relative flex items-center justify-between px-6 py-3 transition-colors",
        isEditing ? "bg-primary/3" : "hover:bg-muted/30",
        isArchived && "bg-muted/10 opacity-75",
      )}
    >
      <div className="flex items-center gap-4 flex-1">
        <div
          className={cn(
            "size-8 rounded flex items-center justify-center transition-colors",
            isArchived
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary",
          )}
        >
          <Hash className="size-4" />
        </div>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit();
                  if (e.key === "Escape") cancelAction();
                }}
                className="h-7 text-xs flex-1 max-w-[200px]"
                placeholder="Category name"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleSaveEdit}
                className="h-7 w-7"
              >
                <Check className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={cancelAction}
                className="h-7 w-7"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col">
              <span
                className={cn(
                  "text-sm font-medium leading-none mb-1",
                  isArchived &&
                    "text-muted-foreground line-through decoration-muted-foreground/30",
                )}
              >
                {cat.name}
              </span>
              <span className="text-[10px] text-muted-foreground/50 font-mono tracking-tighter uppercase">
                {cat.id.slice(0, 8)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Active Toggle */}
        <div className="flex items-center gap-2 pr-4 border-r">
          <span className="text-[10px] uppercase font-bold text-muted-foreground/40 hidden sm:inline-block tracking-widest">
            Active
          </span>
          <Switch
            checked={cat.isActive}
            onCheckedChange={() => handleToggleActive(cat.id, cat.isActive)}
            disabled={updatePending}
            className="scale-75 data-[state=checked]:bg-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => startEdit(cat)}
            className="size-7 rounded-full text-muted-foreground hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[400px]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-lg font-bold">
                  Delete permanently?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm">
                  You are about to delete{" "}
                  <span className="font-semibold text-foreground italic">
                    "{cat.name}"
                  </span>
                  . This action is{" "}
                  <span className="text-destructive font-bold">
                    irreversible
                  </span>{" "}
                  and will fail if the category is still in use.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4">
                <AlertDialogCancel className="h-8 text-xs">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(cat.id)}
                  className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Forever
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </motion.div>
  );
}
