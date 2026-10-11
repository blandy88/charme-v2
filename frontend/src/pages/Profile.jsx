import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function Profile() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "", birthday: "" });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        phone: user.phone || "",
        birthday: user.birthday || "",
      });
    }
  }, [user]);

  if (!user) {
    return (
      <main className="mx-auto max-w-[700px] px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl text-cream">Profile</h1>
        <p className="mt-3 text-sm text-muted">
          <Link to="/auth" className="text-brass underline underline-offset-4">Sign in</Link> to see your profile.
        </p>
      </main>
    );
  }

  async function submit(e) {
    e.preventDefault();
    setNotice("");
    try {
      await api("/api/user/profile", { method: "PUT", body: form });
      await refresh();
      setNotice("Profile saved.");
    } catch (err) {
      setNotice(err.message || "Could not save.");
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <main className="mx-auto max-w-[700px] px-4 py-10 sm:px-6">
      <p className="meta">{user.email}</p>
      <h1 className="mt-2 font-display text-3xl text-cream">Profile</h1>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-muted">
            First name
            <input value={form.first_name} onChange={set("first_name")}
              className="mt-1 w-full rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-cream" />
          </label>
          <label className="block text-xs text-muted">
            Last name
            <input value={form.last_name} onChange={set("last_name")}
              className="mt-1 w-full rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-cream" />
          </label>
        </div>
        <label className="block text-xs text-muted">
          Phone
          <input value={form.phone} onChange={set("phone")}
            className="mt-1 w-full rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-cream" />
        </label>
        <label className="block text-xs text-muted">
          Birthday
          <input type="date" value={form.birthday} onChange={set("birthday")}
            className="mt-1 w-full rounded-sm border border-hairline bg-surface px-3 py-2 text-sm text-cream" />
        </label>
        {notice ? <p role="status" className="text-sm text-brass">{notice}</p> : null}
        <button type="submit" className="w-fit rounded-sm bg-brass px-5 py-2 text-sm font-semibold text-ink">Save</button>
      </form>
      <p className="mt-6 text-sm text-muted">
        <Link to="/favorites" className="text-brass underline underline-offset-4">Your favorites</Link>
      </p>
    </main>
  );
}
