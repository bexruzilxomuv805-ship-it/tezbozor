import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";

export default function AdminUsers() {
  const { t, API_BASE, showToast } = useApp();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/users`).then((r) => r.json()).then(setUsers).catch(() => {});
  }, [API_BASE]);

  const changeRole = (id, role) => {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    const updated = { ...user, role };
    fetch(`${API_BASE}/users/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) })
      .then((r) => r.json())
      .then((u) => {
        setUsers((prev) => prev.map((x) => (x.id === id ? u : x)));
        showToast(t?.admin?.roleUpdated || "Role updated", "info");
      })
      .catch(() => showToast(t?.errorGeneric || "Xatolik yuz berdi", "error"));
  };

  return (
    <div>
      <h2 className="font-bold text-lg mb-4">{t?.admin?.users || 'Users'}</h2>
      <div className="overflow-auto">
        <table className="w-full table-auto">
          <thead>
            <tr>
              <th className="text-left px-3 py-2">ID</th>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="odd:bg-(--gc-surface-alt)">
                <td className="px-3 py-2">{u.id}</td>
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">
                  <select value={u.role || 'user'} onChange={(e) => changeRole(u.id, e.target.value)} className="p-1 border rounded">
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
