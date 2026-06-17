"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { UserPlus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { PaginationBar } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import {
  useCreateUserMutation,
  useDeleteUserMutation,
  useGetUserPermissionsQuery,
  useListUsersQuery,
  useUpdateUserMutation,
  useUpdateUserPermissionsMutation,
} from "@/store/api/usersApi";
import { useAppSelector } from "@/store/hooks";
import { hasPermission } from "@/store/slices/authSlice";
import { getApiErrorMessage } from "@/lib/api/error-message";

export default function UsersPage() {
  const user = useAppSelector((s) => s.auth.user);
  const canViewUsers = hasPermission(user, "users.view");
  const canManageUsers = hasPermission(user, "users.manage");
  const canManageUserPermissions = hasPermission(user, "users.permissions.manage");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListUsersQuery(
    { page, pageSize: 25 },
    { skip: !canViewUsers },
  );
  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [updateUserPermissions] = useUpdateUserPermissionsMutation();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [editUser, setEditUser] = useState<{
    id: string;
    fullName: string;
    role: string;
    isActive: boolean;
    password: string;
  } | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<{ id: string; fullName: string } | null>(null);
  const [permissionDraft, setPermissionDraft] = useState<Record<string, boolean>>({});
  const { data: permissionsData } = useGetUserPermissionsQuery(permissionsUser?.id ?? "", {
    skip: !permissionsUser,
  });

  const permissionRows =
    (permissionsData?.permissions as Array<{
      id: string;
      key: string;
      name: string;
      allowed: boolean;
    }>) ?? [];

  if (!canViewUsers) {
    return (
      <AppShell title="Users">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Access denied</CardTitle>
              <CardDescription>You do not have permission to view users.</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="Users">
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <Card className="w-full max-w-xl">
            <CardHeader>
              <div>
                <CardTitle>Edit user</CardTitle>
                <CardDescription>Update role, status, and password</CardDescription>
              </div>
            </CardHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Full name"
                value={editUser.fullName}
                onChange={(e) => setEditUser((prev) => (prev ? { ...prev, fullName: e.target.value } : prev))}
              />
              <Select
                label="Role"
                value={editUser.role}
                onChange={(e) => setEditUser((prev) => (prev ? { ...prev, role: e.target.value } : prev))}
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </Select>
              <Select
                label="Status"
                value={editUser.isActive ? "active" : "inactive"}
                onChange={(e) =>
                  setEditUser((prev) =>
                    prev ? { ...prev, isActive: e.target.value === "active" } : prev,
                  )
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
              <Input
                label="New password (optional)"
                type="password"
                value={editUser.password}
                onChange={(e) => setEditUser((prev) => (prev ? { ...prev, password: e.target.value } : prev))}
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditUser(null)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!editUser) return;
                  if (!editUser.fullName.trim()) {
                    toast.error("Full name is required");
                    return;
                  }
                  if (editUser.password && editUser.password.length < 8) {
                    toast.error("Password must be at least 8 characters");
                    return;
                  }
                  try {
                    await updateUser({
                      id: editUser.id,
                      body: {
                        fullName: editUser.fullName.trim(),
                        role: editUser.role,
                        isActive: editUser.isActive,
                        ...(editUser.password ? { password: editUser.password } : {}),
                      },
                    }).unwrap();
                    toast.success("User updated");
                    setEditUser(null);
                  } catch (err) {
                    toast.error(getApiErrorMessage(err, "Failed to update user"));
                  }
                }}
              >
                Save changes
              </Button>
            </div>
          </Card>
        </div>
      )}

      {permissionsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div>
                <CardTitle>Manage permissions</CardTitle>
                <CardDescription>{permissionsUser.fullName}</CardDescription>
              </div>
            </CardHeader>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto">
              {permissionRows.map((p) => {
                const current = permissionDraft[p.id] ?? p.allowed;
                return (
                  <label
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--color-border)] px-3 py-2"
                  >
                    <span className="text-sm">
                      <span className="font-semibold">{p.name}</span>
                      <span className="ml-2 text-[var(--color-text-soft)]">({p.key})</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={current}
                      onChange={(e) =>
                        setPermissionDraft((prev) => ({ ...prev, [p.id]: e.target.checked }))
                      }
                    />
                  </label>
                );
              })}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setPermissionsUser(null);
                  setPermissionDraft({});
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!permissionsUser) return;
                  try {
                    await updateUserPermissions({
                      id: permissionsUser.id,
                      permissions: permissionRows.map((p) => ({
                        permissionId: p.id,
                        allowed: permissionDraft[p.id] ?? p.allowed,
                      })),
                    }).unwrap();
                    toast.success("Permissions updated");
                    setPermissionsUser(null);
                    setPermissionDraft({});
                  } catch (err) {
                    toast.error(getApiErrorMessage(err, "Failed to update permissions"));
                  }
                }}
              >
                Save permissions
              </Button>
            </div>
          </Card>
        </div>
      )}

      {canManageUsers && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Create user</CardTitle>
              <CardDescription>Add a new account with role and permissions</CardDescription>
            </div>
          </CardHeader>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </div>
          <Button
            className="mt-5"
            onClick={async () => {
              if (!email.trim() || !fullName.trim() || !password.trim()) {
                toast.error("Email, full name, and password are required");
                return;
              }
              if (password.trim().length < 8) {
                toast.error("Password must be at least 8 characters");
                return;
              }
              try {
                await createUser({
                  email: email.trim(),
                  fullName: fullName.trim(),
                  password,
                  role,
                }).unwrap();
                toast.success("User created");
                setEmail("");
                setFullName("");
                setPassword("");
              } catch (err) {
                toast.error(getApiErrorMessage(err, "Failed to create user"));
              }
            }}
          >
            <UserPlus className="h-4 w-4" />
            Create user
          </Button>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>All users</CardTitle>
            <CardDescription>Manage system accounts</CardDescription>
          </div>
        </CardHeader>
        {isLoading ? (
          <LoadingState />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th className="hidden sm:table-cell">Status</th>
                    {(canManageUsers || canManageUserPermissions) && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {(data?.data as Array<{
                    id: string;
                    fullName: string;
                    email: string;
                    role: string;
                    isActive: boolean;
                  }>)?.map((u) => (
                    <tr key={u.id}>
                      <td className="font-semibold">{u.fullName}</td>
                      <td>{u.email}</td>
                      <td>
                        <Badge tone={u.role === "ADMIN" ? "primary" : "default"}>{u.role}</Badge>
                      </td>
                      <td className="hidden sm:table-cell">
                        <Badge tone={u.isActive ? "success" : "default"}>
                          {u.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      {(canManageUsers || canManageUserPermissions) && (
                        <td>
                          <div className="flex flex-wrap gap-2">
                            {canManageUsers && (
                              <>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() =>
                                    setEditUser({
                                      id: u.id,
                                      fullName: u.fullName,
                                      role: u.role,
                                      isActive: u.isActive,
                                      password: "",
                                    })
                                  }
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={async () => {
                                    const ok = window.confirm(`Delete user "${u.fullName}"?`);
                                    if (!ok) return;
                                    try {
                                      await deleteUser(u.id).unwrap();
                                      toast.success("User deleted");
                                    } catch (err) {
                                      toast.error(getApiErrorMessage(err, "Failed to delete user"));
                                    }
                                  }}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                            {canManageUserPermissions && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setPermissionsUser({ id: u.id, fullName: u.fullName });
                                  setPermissionDraft({});
                                }}
                              >
                                Permissions
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data && (
              <PaginationBar
                page={data.meta.page}
                totalPages={data.meta.totalPages}
                total={data.meta.total}
                onPrev={() => setPage((p) => p - 1)}
                onNext={() => setPage((p) => p + 1)}
              />
            )}
          </>
        )}
      </Card>
    </AppShell>
  );
}
