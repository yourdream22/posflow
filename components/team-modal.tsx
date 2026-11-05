"use client";

import { useEffect, useState } from "react";
import { posApi } from "@/lib/api";

type TeamUser = { id: number; name: string; email: string; role: string };

export default function TeamModal({ user, onClose, onToast }: { user: { name: string; email: string; role: string } | null; onClose: () => void; onToast: (message: string) => void }) {
  const [staff, setStaff] = useState<TeamUser[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.role !== "admin") return;
    posApi.staff().then((result) => setStaff(result.staff)).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load staff"));
  }, [user?.role]);

  const createStaff = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await posApi.createStaff(name, email, password);
      setStaff((current) => [...current, result.staff]);
      setName("");
      setEmail("");
      setPassword("");
      onToast(result.mode === "demo" ? "Staff account created in demo mode" : "Staff account created");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create staff account");
    } finally {
      setSaving(false);
    }
  };

  return <div className="modal-backdrop"><div className="modal-card team-modal"><div className="modal-heading"><div><p className="eyebrow">ACCOUNT SETTINGS</p><h3>{user?.role === "admin" ? "Team management" : "Your account"}</h3></div><button className="icon-button small" onClick={onClose} aria-label="Close settings">×</button></div><div className="account-summary"><strong>{user?.name}</strong><span>{user?.email}</span><small>{user?.role === "admin" ? "Admin · can create Staff accounts" : "Staff · register access"}</small></div>{user?.role === "admin" ? <><div className="team-list"><div className="eyebrow">STAFF ACCOUNTS</div>{staff.length ? staff.map((member) => <div className="team-row" key={member.id}><span className="avatar small-avatar">{member.name.slice(0, 1)}</span><span><strong>{member.name}</strong><small>{member.email}</small></span><em>Staff</em></div>) : <p className="muted">No staff accounts yet.</p>}</div><form className="staff-form" onSubmit={createStaff}><div className="eyebrow">ADD STAFF</div><div className="form-grid"><label><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Jordan Lee" required /></label><label><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="jordan@northstar.market" required /></label><label><span>Temporary password</span><input type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" required /></label></div>{error && <p className="login-error">{error}</p>}<button className="primary-button" type="submit" disabled={saving}>{saving ? "Creating…" : "Create Staff account"}</button></form></> : <p className="muted settings-copy">You are signed in as Staff. Ask an Admin to create or manage staff accounts.</p>}</div></div>;
}
