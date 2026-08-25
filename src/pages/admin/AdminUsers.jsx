import { useEffect, useState } from "react";
import { Ban, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "../../context/AppContext";

const PAGE_SIZE = 5;

export default function AdminUsers() {
  const { t, API_BASE, showToast, currentUser } = useApp();
  const [users, setUsers] = useState([]);
  const [pendingBlock, setPendingBlock] = useState(null); // { id, name, nextBlocked }
  const [pendingRole, setPendingRole] = useState(null); // { id, name, role }
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(`${API_BASE}/users`).then((r) => r.json()).then(setUsers).catch(() => {});
  }, [API_BASE]);

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = users.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const requestChangeRole = (u, role) => {
    if (role === (u.role || "user")) return;
    if (u.id === currentUser?.id) {
      showToast(t.admin.cannotChangeOwnRole, "error");
      return;
    }
    setPendingRole({ id: u.id, name: u.name || u.email, role });
  };

  const confirmChangeRole = () => {
    const { id, role } = pendingRole;
    const user = users.find((u) => u.id === id);
    if (!user) { setPendingRole(null); return; }
    const updated = { ...user, role };
    fetch(`${API_BASE}/users/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) })
      .then((r) => r.json())
      .then((u) => {
        setUsers((prev) => prev.map((x) => (x.id === id ? u : x)));
        showToast(t?.admin?.roleUpdated || "Role updated", "info");
      })
      .catch(() => showToast(t?.errorGeneric || "Xatolik yuz berdi", "error"))
      .finally(() => setPendingRole(null));
  };

  const requestToggleBlock = (u) => {
    if (u.id === currentUser?.id) {
      showToast(t.admin.cannotBlockSelf, "error");
      return;
    }
    setPendingBlock({ id: u.id, name: u.name || u.email, nextBlocked: !u.blocked });
  };

  const confirmToggleBlock = () => {
    const { id, nextBlocked } = pendingBlock;
    const user = users.find((u) => u.id === id);
    if (!user) return;
    const updated = { ...user, blocked: nextBlocked };
    fetch(`${API_BASE}/users/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) })
      .then((r) => r.json())
      .then((u) => {
        setUsers((prev) => prev.map((x) => (x.id === id ? u : x)));
        showToast(nextBlocked ? t.admin.userBlocked : t.admin.userUnblocked, "info");
      })
      .catch(() => showToast(t?.errorGeneric || "Xatolik yuz berdi", "error"))
      .finally(() => setPendingBlock(null));
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
              <th className="text-left px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((u) => (
              <tr key={u.id} className="odd:bg-(--gc-surface-alt)">
                <td className="px-3 py-2">{u.id}</td>
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">
                  <select value={u.role || 'user'} onChange={(e) => requestChangeRole(u, e.target.value)} className="p-1 border rounded">
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => requestToggleBlock(u)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition"
                    style={
                      u.blocked
                        ? { background: "var(--cat-sabzavot-bg)", color: "var(--cat-sabzavot-fg)" }
                        : { background: "var(--gc-danger-soft)", color: "var(--gc-tomato-dark)" }
                    }
                  >
                    {u.blocked ? <CheckCircle2 size={13} /> : <Ban size={13} />}
                    {u.blocked ? t.admin.unblock : t.admin.block}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length > PAGE_SIZE && (
        <div className="flex items-center justify-between px-1 py-3 flex-wrap gap-2">
          <span className="text-xs font-bold" style={{ color: "var(--gc-muted-dark)" }}>{t.admin.pageOf(safePage, totalPages)}</span>
          <div className="flex gap-2">
            <button
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: "var(--gc-surface)", border: "1px solid var(--gc-border)", color: safePage <= 1 ? "var(--gc-muted-light)" : "var(--gc-muted-dark)", cursor: safePage <= 1 ? "not-allowed" : "pointer" }}
            >
              <ChevronLeft size={13} /> {t.admin.prevPage}
            </button>
            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: "var(--gc-surface)", border: "1px solid var(--gc-border)", color: safePage >= totalPages ? "var(--gc-muted-light)" : "var(--gc-muted-dark)", cursor: safePage >= totalPages ? "not-allowed" : "pointer" }}
            >
              {t.admin.nextPage} <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {pendingBlock && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-4"
          style={{ background: "rgba(43,38,32,0.45)" }}
          onClick={() => setPendingBlock(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 bg-(--gc-surface)"
            style={{ border: "1px solid var(--gc-border)", animation: "modalPop 0.2s ease-out" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3" style={{ background: "var(--gc-danger-soft)" }}>
              <Ban size={19} color="var(--gc-tomato-dark)" />
            </div>
            <h3 className="font-display text-lg font-semibold mb-1" style={{ color: "var(--gc-charcoal)" }}>
              {t.admin.confirmDelete}
            </h3>
            <p className="text-sm mb-5" style={{ color: "var(--gc-muted-dark)" }}>
              {pendingBlock.nextBlocked ? t.admin.confirmBlockUser(pendingBlock.name) : t.admin.confirmUnblockUser(pendingBlock.name)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPendingBlock(null)}
                className="flex-1 py-2.5 rounded-full text-sm font-bold"
                style={{ background: "var(--gc-cream-2)", color: "var(--gc-muted-dark)" }}
              >
                {t.admin.confirmNo}
              </button>
              <button
                onClick={confirmToggleBlock}
                className="flex-1 py-2.5 rounded-full text-sm font-bold text-white"
                style={{ background: "var(--gc-tomato-dark)" }}
              >
                {t.admin.confirmYes}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingRole && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-4"
          style={{ background: "rgba(43,38,32,0.45)" }}
          onClick={() => setPendingRole(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 bg-(--gc-surface)"
            style={{ border: "1px solid var(--gc-border)", animation: "modalPop 0.2s ease-out" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-semibold mb-1" style={{ color: "var(--gc-charcoal)" }}>
              {t.admin.confirmDelete}
            </h3>
            <p className="text-sm mb-5" style={{ color: "var(--gc-muted-dark)" }}>
              {t.admin.confirmChangeRole(pendingRole.name, pendingRole.role)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPendingRole(null)}
                className="flex-1 py-2.5 rounded-full text-sm font-bold"
                style={{ background: "var(--gc-cream-2)", color: "var(--gc-muted-dark)" }}
              >
                {t.admin.confirmNo}
              </button>
              <button
                onClick={confirmChangeRole}
                className="flex-1 py-2.5 rounded-full text-sm font-bold text-white"
                style={{ background: "var(--gc-tomato-dark)" }}
              >
                {t.admin.confirmYes}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
