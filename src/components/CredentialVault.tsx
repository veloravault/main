"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { encryptText, decryptText } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { CardListSkeleton } from "@/components/Skeleton";
import { SelectionToolbar } from "@/components/SelectionToolbar";
import { AdaptiveSheet, AdaptiveSheetBody, AdaptiveSheetFooter } from "@/components/ui/adaptive-sheet";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  PlusIcon,
  CheckSquareIcon,
  SquareIcon,
  TrashIcon,
  EyeIcon,
  EyeOffIcon,
  CopyIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setCache, getCache, invalidateCache } from "@/lib/vaultCache";
import { useToast } from "@/components/Toast";
import { useOptimisticDelete } from "@/hooks/useOptimisticDelete";
import { copySensitiveText } from "@/lib/secureClipboard";
import { ContextActions } from "@/components/ui/context-actions";
import type { CredentialTypeConfig, CredentialFieldSchema } from "@/lib/credentialTypes";

interface SecureCredentialRow {
  id: string;
  title: string;
  encrypted_content: string;
  iv: string;
  salt: string;
}

interface DecryptedCredential {
  id: string;
  title: string;
  payload: Record<string, string>;
  decryptionFailed?: boolean;
}

function emptyValues(fields: CredentialFieldSchema[]): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field.key, ""]));
}

function CredentialFormField({
  field,
  value,
  onChange,
  idPrefix,
}: {
  field: CredentialFieldSchema;
  value: string;
  onChange: (value: string) => void;
  idPrefix: string;
}) {
  const id = `${idPrefix}-${field.key}`;
  const optionalTag = !field.required ? <span className="text-muted-foreground/50 font-normal"> (optional)</span> : null;

  if (field.type === "textarea") {
    return (
      <div>
        <label htmlFor={id} className="account-field-label">{field.label}{optionalTag}</label>
        <textarea
          id={id}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="account-field-input is-large font-mono"
          required={field.required}
        />
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="account-field-label">{field.label}{optionalTag}</label>
      <input
        id={id}
        type={field.type === "password" ? "password" : "text"}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="account-field-input full-width"
        required={field.required}
      />
    </div>
  );
}

export function CredentialVault({ config, masterPassword, focusedItemId, refreshVersion = 0 }: { config: CredentialTypeConfig; masterPassword: string; focusedItemId?: string | null; refreshVersion?: number }) {
  const toast = useToast();
  const cacheKey = `secure_credentials:${config.type}`;
  const [items, setItems] = useState<DecryptedCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSecretRevealed, setIsSecretRevealed] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [formValues, setFormValues] = useState<Record<string, string>>(() => emptyValues(config.fields));
  const [addItemError, setAddItemError] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<DecryptedCredential | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [editItemError, setEditItemError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { scheduleDelete } = useOptimisticDelete({
    items,
    setItems,
    toastLabel: (item) => item.title || config.itemNoun,
    commitDelete: async (item) => {
      const { error } = await supabase.from("secure_credentials").delete().eq("id", item.id);
      if (error) throw error;
      invalidateCache(cacheKey);
    },
  });

  useEffect(() => {
    queueMicrotask(() => setIsSecretRevealed(false));
  }, [expandedId]);

  useEffect(() => {
    if (focusedItemId) {
      queueMicrotask(() => setExpandedId(focusedItemId));
      setTimeout(() => {
        const el = document.getElementById(`item-${focusedItemId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [focusedItemId]);

  const fetchItems = useCallback(async () => {
    const cached = getCache<DecryptedCredential>(cacheKey);
    if (cached) { setItems(cached); setLoading(false); return; }

    setLoading(true);
    const { data, error } = await supabase
      .from("secure_credentials")
      .select("id, title, encrypted_content, iv, salt")
      .eq("type", config.type)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn(`Error fetching ${config.type} credentials:`, error);
      setLoading(false);
      return;
    }

    const decryptedItems: DecryptedCredential[] = [];
    for (const item of (data as SecureCredentialRow[])) {
      try {
        const jsonStr = await decryptText(item.encrypted_content, item.salt, item.iv, masterPassword);
        decryptedItems.push({ id: item.id, title: item.title, payload: JSON.parse(jsonStr) as Record<string, string> });
      } catch (err: unknown) {
        console.warn(`Failed to decrypt ${config.type} item ${item.title}`, err);
        decryptedItems.push({ id: item.id, title: item.title, payload: {}, decryptionFailed: true });
      }
    }
    setItems(decryptedItems);
    setCache(cacheKey, decryptedItems);
    setLoading(false);
  }, [masterPassword, config.type, cacheKey]);

  useEffect(() => {
    queueMicrotask(() => { void fetchItems(); });
  }, [fetchItems]);

  useEffect(() => {
    if (!refreshVersion) return;
    invalidateCache(cacheKey);
    queueMicrotask(() => void fetchItems());
  }, [fetchItems, refreshVersion, cacheKey]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const missingRequired = config.fields.some((field) => field.required && !formValues[field.key]?.trim());
    if (!newTitle.trim() || missingRequired) {
      setAddItemError("Fill in every required field before saving.");
      return;
    }
    setAddItemError(null);

    try {
      const encrypted = await encryptText(JSON.stringify(formValues), masterPassword);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase.from("secure_credentials").insert({
        user_id: user.id,
        title: newTitle,
        type: config.type,
        encrypted_content: encrypted.ciphertext,
        iv: encrypted.iv,
        salt: encrypted.salt,
      });
      if (error) throw error;

      setNewTitle("");
      setFormValues(emptyValues(config.fields));
      setIsAddOpen(false);
      invalidateCache(cacheKey);
      fetchItems();
    } catch (err) {
      console.error(`Failed to add ${config.type} item:`, err);
      toast(err instanceof Error ? err.message : `Failed to save the ${config.itemNoun}. Please try again.`, "error");
    }
  };

  const openEditItem = (item: DecryptedCredential) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditValues(Object.fromEntries(config.fields.map((field) => [field.key, item.payload[field.key] ?? ""])));
    setEditItemError(null);
  };

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const missingRequired = config.fields.some((field) => field.required && !editValues[field.key]?.trim());
    if (!editTitle.trim() || missingRequired) {
      setEditItemError("Fill in every required field before saving.");
      return;
    }
    setEditItemError(null);
    setIsSavingEdit(true);

    try {
      const encrypted = await encryptText(JSON.stringify(editValues), masterPassword);
      const { error } = await supabase.from("secure_credentials").update({
        title: editTitle,
        encrypted_content: encrypted.ciphertext,
        iv: encrypted.iv,
        salt: encrypted.salt,
      }).eq("id", editingItem.id);
      if (error) throw error;

      setEditingItem(null);
      invalidateCache(cacheKey);
      fetchItems();
      toast(`${config.itemNoun[0].toUpperCase()}${config.itemNoun.slice(1)} updated`, "success");
    } catch (err) {
      console.error(`Failed to update ${config.type} item:`, err);
      setEditItemError(err instanceof Error ? err.message : "Failed to save the changes.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} items?`)) return;
    const idsToDelete = Array.from(selectedIds);
    const { error } = await supabase.from("secure_credentials").delete().in("id", idsToDelete);
    if (!error) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      invalidateCache(cacheKey);
      fetchItems();
    } else {
      toast("Failed to delete items", "error");
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    const { scheduled } = await copySensitiveText(text);
    toast(`${label} copied${scheduled ? " and scheduled to clear" : ""}`, "success");
  };

  const Icon = config.icon;

  return (
    <div className="apple-surface vault-material-scope w-full">
      <div className="vault-section-toolbar">
        <div className="vault-section-heading">
          <h2 className="type-section-title">{config.label}</h2>
          {isSelectionMode && (
            <span className="text-[13px] font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
              {selectedIds.size} selected
            </span>
          )}
        </div>

        <div className="vault-section-actions">
          {items.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger aria-label="More actions" className="vault-section-overflow rounded-full w-9 h-9 p-0 text-muted-foreground hover:bg-muted/80 flex items-center justify-center">
                <MoreHorizontalIcon className="w-5 h-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuItem
                  onClick={() => {
                    setIsSelectionMode((value) => !value);
                    if (isSelectionMode) setSelectedIds(new Set());
                  }}
                  className="font-medium cursor-pointer"
                >
                  {isSelectionMode ? "Cancel Editing" : "Select Items"}
                </DropdownMenuItem>
                {isSelectionMode && (
                  <DropdownMenuItem
                    onClick={() => {
                      if (selectedIds.size === items.length) setSelectedIds(new Set());
                      else setSelectedIds(new Set(items.map((item) => item.id)));
                    }}
                    className="font-medium cursor-pointer"
                  >
                    {selectedIds.size === items.length ? "Deselect All" : "Select All"}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <button type="button" onClick={() => setIsAddOpen(true)} className="vault-section-primary-action rounded-full h-9 px-4 sm:px-5 font-semibold text-[14px] flex items-center gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 outline-none">
            <PlusIcon className="w-4 h-4" />
            <span className="hidden min-[380px]:inline">New</span>
          </button>

          <AdaptiveSheet open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) setAddItemError(null); }} title={`New ${config.itemNoun}`} description="Encrypted before it ever leaves this device." size="md" className="vault-create-sheet">
            <form onSubmit={handleAddItem} noValidate className="vault-create-form">
              <AdaptiveSheetBody className="space-y-4">
                <div>
                  <label htmlFor="new-credential-title" className="account-field-label">Title</label>
                  <input
                    id="new-credential-title"
                    type="text"
                    placeholder={`e.g. My ${config.itemNoun}`}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="account-field-input full-width"
                    required
                  />
                </div>
                {config.fields.map((field) => (
                  <CredentialFormField
                    key={field.key}
                    field={field}
                    value={formValues[field.key] ?? ""}
                    onChange={(value) => setFormValues((current) => ({ ...current, [field.key]: value }))}
                    idPrefix="new-credential"
                  />
                ))}
                {addItemError && <p className="text-[13px] text-destructive px-1" role="alert">{addItemError}</p>}
              </AdaptiveSheetBody>
              <AdaptiveSheetFooter><Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button><Button type="submit" className="import-primary-action">Save</Button></AdaptiveSheetFooter>
            </form>
          </AdaptiveSheet>

          <AdaptiveSheet open={!!editingItem} onOpenChange={(open) => { if (!open) { setEditingItem(null); setEditItemError(null); } }} title={`Edit ${config.itemNoun}`} description="Changes are re-encrypted with your existing master key." size="md" className="vault-create-sheet">
            <form onSubmit={handleEditItem} noValidate className="vault-create-form">
              <AdaptiveSheetBody className="space-y-4">
                <div>
                  <label htmlFor="edit-credential-title" className="account-field-label">Title</label>
                  <input
                    id="edit-credential-title"
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="account-field-input full-width"
                    required
                  />
                </div>
                {config.fields.map((field) => (
                  <CredentialFormField
                    key={field.key}
                    field={field}
                    value={editValues[field.key] ?? ""}
                    onChange={(value) => setEditValues((current) => ({ ...current, [field.key]: value }))}
                    idPrefix="edit-credential"
                  />
                ))}
                {editItemError && <p className="text-[13px] text-destructive px-1" role="alert">{editItemError}</p>}
              </AdaptiveSheetBody>
              <AdaptiveSheetFooter><Button type="button" variant="ghost" onClick={() => setEditingItem(null)}>Cancel</Button><Button type="submit" disabled={isSavingEdit} className="import-primary-action">{isSavingEdit ? "Saving…" : "Save Changes"}</Button></AdaptiveSheetFooter>
            </form>
          </AdaptiveSheet>
        </div>
      </div>

      <div className="w-full">
        {loading ? (
          <CardListSkeleton count={4} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <div className="w-16 h-16 flex items-center justify-center mb-4">
              <Icon className="w-12 h-12 text-muted-foreground/40" strokeWidth={1} />
            </div>
            <h3 className="text-[19px] font-semibold text-foreground mb-1.5 tracking-tight">No {config.label}</h3>
            <p className="text-[15px] text-muted-foreground max-w-[240px] leading-relaxed mb-6">Saved {config.label.toLowerCase()} will appear here.</p>
            <button type="button" onClick={() => setIsAddOpen(true)} className="text-[15px] font-semibold text-primary hover:opacity-75 transition-opacity">
              Add {config.itemNoun}
            </button>
          </div>
        ) : (
          <motion.div layout="position" className="flex flex-col gap-1 pb-12">
            <AnimatePresence initial={false}>
              {items.map((item) => {
                const isExpanded = expandedId === item.id;
                const isSelected = selectedIds.has(item.id);

                return (
                  <ContextActions key={item.id} title={item.title} actions={[
                    { id: "open", label: isExpanded ? "Close details" : "View details", onSelect: () => setExpandedId(isExpanded ? null : item.id) },
                    { id: "edit", label: "Edit", onSelect: () => openEditItem(item) },
                    { id: "delete", label: "Delete", destructive: true, onSelect: () => { if (expandedId === item.id) setExpandedId(null); scheduleDelete(item); } },
                  ]}>{(bindings) => (
                    <motion.div
                      {...bindings}
                      layout="position"
                      id={`item-${item.id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`relative overflow-hidden rounded-[10px] group transition-colors ${!isExpanded ? "hover:bg-black/5 dark:hover:bg-white/5" : ""} ${isSelectionMode && isSelected ? "ring-2 ring-primary/30 bg-primary/5" : "bg-transparent"}`}
                    >
                      <button
                        onClick={(e) => isSelectionMode ? toggleSelection(item.id, e) : setExpandedId(isExpanded ? null : item.id)}
                        className="relative z-10 flex items-center justify-between p-4 sm:p-5 w-full focus:outline-none group bg-transparent"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          {isSelectionMode && (
                            <div className="shrink-0 text-primary">
                              {isSelected ? <CheckSquareIcon strokeWidth={2.5} className="w-5 h-5" /> : <SquareIcon strokeWidth={2} className="w-5 h-5 text-muted-foreground/50" />}
                            </div>
                          )}
                          <div className={`w-10 h-10 bg-gradient-to-b ${config.iconGradient} rounded-xl flex items-center justify-center shrink-0 shadow-sm`}>
                            <Icon strokeWidth={2} className="w-5 h-5 text-white" />
                          </div>
                          <span className={`text-[18px] font-semibold truncate tracking-tight ${isExpanded ? "text-primary" : "text-foreground"}`}>{item.title}</span>
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isExpanded ? "bg-muted" : "group-hover:bg-muted"}`}>
                          {isExpanded ? <ChevronDownIcon strokeWidth={2.5} className="w-5 h-5 text-foreground" /> : <ChevronRightIcon strokeWidth={2.5} className="w-5 h-5 text-muted-foreground" />}
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="relative z-10 px-5 pb-5 pt-4 border-t border-border">
                              {item.decryptionFailed ? (
                                <p className="text-[14px] text-destructive">This item could not be decrypted with your current master key.</p>
                              ) : (
                                config.fields.map((field) => {
                                  const rawValue = item.payload[field.key] ?? "";
                                  if (!rawValue) return null;
                                  const isPrimary = field.key === config.primaryFieldKey;
                                  const displayValue = isPrimary && !isSecretRevealed ? "••••••••••••" : rawValue;
                                  return (
                                    <div key={field.key} className="mb-4">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">{field.label}</span>
                                        <div className="flex items-center gap-1">
                                          {isPrimary && (
                                            <button type="button" onClick={() => setIsSecretRevealed((v) => !v)} className="p-1 text-muted-foreground/60 hover:text-primary transition-colors" aria-label={isSecretRevealed ? "Hide" : "Show"}>
                                              {isSecretRevealed ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                            </button>
                                          )}
                                          <button type="button" onClick={() => copyToClipboard(rawValue, field.label)} className="p-1 text-muted-foreground/60 hover:text-primary transition-colors" aria-label={`Copy ${field.label}`}>
                                            <CopyIcon className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                      <div className="w-full bg-muted rounded-xl px-4 py-3 text-[15px] text-foreground tracking-wide break-words whitespace-pre-wrap border border-transparent font-mono">
                                        {displayValue}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                              <div className="flex flex-row gap-3 mt-2">
                                <button
                                  onClick={() => openEditItem(item)}
                                  className="flex-1 py-3 px-4 rounded-xl text-[15px] font-semibold text-foreground bg-secondary hover:bg-secondary/80 active:scale-[0.98] transition-all"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => { if (expandedId === item.id) setExpandedId(null); scheduleDelete(item); }}
                                  className="py-3 px-6 rounded-xl text-[15px] font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 active:scale-[0.98] transition-all"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}</ContextActions>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {isSelectionMode && (
        <SelectionToolbar count={selectedIds.size} onCancel={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }} onDelete={handleBulkDelete} />
      )}
    </div>
  );
}
