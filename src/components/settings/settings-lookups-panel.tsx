"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/loading-state";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useCreateLookupMutation,
  useDeleteLookupMutation,
  useGetLookupsQuery,
  useUpdateLookupMutation,
} from "@/store/api/settingsApi";

const lookupEntities = [
  { key: "reference-types", label: "Reference types", hint: "IFB, RFP, EOI, PQ, …" },
  { key: "media-of-bid", label: "Media of bid", hint: "Publication channels" },
  { key: "bid-types", label: "Bid types", hint: "Bid period days and price bid opening offset" },
  { key: "sbd", label: "SBD", hint: "Standard bidding documents" },
  { key: "contract-types", label: "Contract types", hint: "" },
  { key: "units", label: "Units", hint: "Quantity units" },
  { key: "currencies", label: "Currencies", hint: "Bid amount currencies (code + symbol)" },
  { key: "payment-conditions", label: "Payment conditions", hint: "Payment terms for winner bid" },
  { key: "work-day-categories", label: "Work day categories", hint: "Timeline categories" },
];

export function SettingsLookupsPanel() {
  const [lookupEntity, setLookupEntity] = useState("bid-types");
  const { data: lookups, refetch: refetchLookups } = useGetLookupsQuery(lookupEntity);
  const [createLookup] = useCreateLookupMutation();
  const [updateLookup] = useUpdateLookupMutation();
  const [deleteLookup] = useDeleteLookupMutation();
  const [newLookupName, setNewLookupName] = useState("");
  const [newLookupExtra, setNewLookupExtra] = useState("");
  const [newLookupPriceBidDays, setNewLookupPriceBidDays] = useState("");

  const entityMeta = lookupEntities.find((e) => e.key === lookupEntity);
  const rows = (lookups as Array<Record<string, unknown>>) ?? [];

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Lookup tables</CardTitle>
          <CardDescription>
            Master data used across procurements. You can change or remove items freely; each
            procurement keeps its own saved snapshot and copied labels.
          </CardDescription>
        </div>
      </CardHeader>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
        <Select
          label="Table"
          value={lookupEntity}
          onChange={(e) => setLookupEntity(e.target.value)}
        >
          {lookupEntities.map((e) => (
            <option key={e.key} value={e.key}>
              {e.label}
            </option>
          ))}
        </Select>
        {entityMeta?.hint ? (
          <p className="flex items-end text-sm text-[var(--color-text-soft)] lg:pb-2">
            {entityMeta.hint}
          </p>
        ) : null}
      </div>

      <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-strong)]/30 p-4">
        <p className="mb-3 text-sm font-semibold text-[var(--color-text)]">Add item</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <Input
            className="min-w-0 flex-1 sm:min-w-[200px]"
            label="Name"
            placeholder="New item name"
            value={newLookupName}
            onChange={(e) => setNewLookupName(e.target.value)}
          />
          {lookupEntity === "bid-types" && (
            <>
              <Input
                className="w-full sm:w-32"
                label="Bid days"
                type="number"
                placeholder="21"
                value={newLookupExtra}
                onChange={(e) => setNewLookupExtra(e.target.value)}
              />
              <Input
                className="w-full sm:w-36"
                label="Price bid days"
                type="number"
                placeholder="7"
                value={newLookupPriceBidDays}
                onChange={(e) => setNewLookupPriceBidDays(e.target.value)}
              />
            </>
          )}
          {lookupEntity === "currencies" && (
            <>
              <Input
                className="w-full sm:w-28"
                label="Code"
                placeholder="NPR"
                value={newLookupExtra}
                onChange={(e) => setNewLookupExtra(e.target.value.toUpperCase())}
              />
              <Input
                className="w-full sm:w-28"
                label="Symbol"
                placeholder="Rs"
                value={newLookupPriceBidDays}
                onChange={(e) => setNewLookupPriceBidDays(e.target.value)}
              />
            </>
          )}
          <Button
            className="w-full sm:w-auto"
            onClick={async () => {
              if (!newLookupName.trim()) {
                toast.error("Name is required");
                return;
              }
              const body: Record<string, unknown> = { name: newLookupName, isActive: true };
              if (lookupEntity === "reference-types") {
                body.code = newLookupName.trim().toUpperCase().replace(/\s+/g, "_");
              }
              if (lookupEntity === "units") {
                body.symbol = newLookupName.trim();
              }
              if (lookupEntity === "bid-types") {
                body.defaultBidDays = Number(newLookupExtra || "21");
                body.defaultPriceBidDays = Number(newLookupPriceBidDays || "7");
              }
              if (lookupEntity === "currencies") {
                if (!newLookupExtra.trim()) {
                  toast.error("Currency code is required");
                  return;
                }
                body.code = newLookupExtra.trim().toUpperCase();
                body.symbol = (newLookupPriceBidDays || newLookupExtra).trim();
              }
              if (lookupEntity === "payment-conditions") {
                body.code = newLookupName.trim().toUpperCase().replace(/\s+/g, "_");
              }
              await createLookup({ entity: lookupEntity, body });
              setNewLookupName("");
              setNewLookupExtra("");
              setNewLookupPriceBidDays("");
              refetchLookups();
              toast.success("Created");
            }}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="mt-6 hidden md:block">
        {rows.length > 0 ? (
          <div className="table-wrap">
            <table className="table-modern min-w-0">
              <thead>
                <tr>
                  <th>Name</th>
                  {lookupEntity === "bid-types" && (
                    <>
                      <th>Bid days</th>
                      <th>Price bid days</th>
                    </>
                  )}
                  {lookupEntity === "currencies" && (
                    <>
                      <th>Code</th>
                      <th>Symbol</th>
                    </>
                  )}
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <LookupRow
                    key={String(item.id)}
                    item={item}
                    lookupEntity={lookupEntity}
                    layout="table"
                    onUpdate={async (body) => {
                      await updateLookup({
                        entity: lookupEntity,
                        id: String(item.id),
                        body,
                      });
                      toast.success("Updated");
                      refetchLookups();
                    }}
                    onDelete={async () => {
                      await deleteLookup({ entity: lookupEntity, id: String(item.id) });
                      toast.success("Deleted");
                      refetchLookups();
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No items yet" description="Add your first lookup value above." />
        )}
      </div>

      {/* Mobile cards */}
      <ul className="mt-4 space-y-3 md:hidden">
        {rows.map((item) => (
          <li
            key={String(item.id)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm"
          >
            <LookupRow
              item={item}
              lookupEntity={lookupEntity}
              layout="card"
              onUpdate={async (body) => {
                await updateLookup({
                  entity: lookupEntity,
                  id: String(item.id),
                  body,
                });
                toast.success("Updated");
                refetchLookups();
              }}
              onDelete={async () => {
                await deleteLookup({ entity: lookupEntity, id: String(item.id) });
                toast.success("Deleted");
                refetchLookups();
              }}
            />
          </li>
        ))}
        {!rows.length && (
          <li>
            <EmptyState title="No items yet" description="Add your first lookup value above." />
          </li>
        )}
      </ul>
    </Card>
  );
}

function LookupRow({
  item,
  lookupEntity,
  layout,
  onUpdate,
  onDelete,
}: {
  item: Record<string, unknown>;
  lookupEntity: string;
  layout: "table" | "card";
  onUpdate: (body: Record<string, unknown>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const name = String(item.name ?? "");

  async function handleEdit() {
    const nextName = window.prompt("Enter updated name", name);
    if (!nextName?.trim()) return;
    const body: Record<string, unknown> = { name: nextName.trim() };
    if (lookupEntity === "bid-types") {
      const nextDays = window.prompt(
        "Enter number of bid days",
        String(item.defaultBidDays ?? 21),
      );
      body.defaultBidDays = Number(nextDays ?? item.defaultBidDays ?? 21);
      const nextPriceBidDays = window.prompt(
        "Enter number of price bid opening days (working-day offset after letters sent)",
        String(item.defaultPriceBidDays ?? 7),
      );
      body.defaultPriceBidDays = Number(nextPriceBidDays ?? item.defaultPriceBidDays ?? 7);
    }
    if (lookupEntity === "currencies") {
      const nextCode = window.prompt("Enter currency code", String(item.code ?? "NPR"));
      if (!nextCode?.trim()) return;
      const nextSymbol = window.prompt("Enter currency symbol", String(item.symbol ?? nextCode));
      body.code = nextCode.trim().toUpperCase();
      body.symbol = (nextSymbol ?? nextCode).trim();
    }
    await onUpdate(body);
  }

  const actions = (
    <div className={`flex gap-2 ${layout === "card" ? "mt-3" : "justify-end"}`}>
      <Button variant="secondary" size="sm" onClick={handleEdit}>
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Button>
      <Button variant="danger" size="sm" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>
    </div>
  );

  if (layout === "table") {
    return (
      <tr>
        <td className="font-semibold">{name}</td>
        {lookupEntity === "bid-types" && (
          <>
            <td>
              <Badge tone="primary">{String(item.defaultBidDays ?? 0)} days</Badge>
            </td>
            <td>
              <Badge>{String(item.defaultPriceBidDays ?? 0)} days</Badge>
            </td>
          </>
        )}
        {lookupEntity === "currencies" && (
          <>
            <td>
              <Badge tone="primary">{String(item.code ?? "—")}</Badge>
            </td>
            <td>
              <Badge>{String(item.symbol ?? "—")}</Badge>
            </td>
          </>
        )}
        <td>{actions}</td>
      </tr>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-[var(--color-text)]">{name}</span>
        {lookupEntity === "bid-types" && (
          <>
            <Badge tone="primary">{String(item.defaultBidDays ?? 0)} bid days</Badge>
            <Badge>{String(item.defaultPriceBidDays ?? 0)} price bid days</Badge>
          </>
        )}
        {lookupEntity === "currencies" && (
          <>
            <Badge tone="primary">{String(item.code ?? "—")}</Badge>
            <Badge>{String(item.symbol ?? "—")}</Badge>
          </>
        )}
      </div>
      {actions}
    </div>
  );
}
