import { useState } from "react";
import { api } from "../api/client.js";

/*
 * Contact owns everything the legacy hero stacked on top of the photo:
 * guest-note form, live map, phone/WhatsApp, social links.
 * One column each, no overlaps, no auto-open popups.
 */
export default function Contact() {
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setStatus(null);
    try {
      await api("/api/notes", {
        method: "POST",
        body: { message, authorName: contact || "Anonymous" },
        auth: false,
      });
      setStatus({ ok: true, text: "Note received — we will get back to you soon." });
      setContact("");
      setMessage("");
    } catch (err) {
      setStatus({ ok: false, text: err.message || "Could not send the note." });
    }
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <p className="meta">Parfumerie · Kélibia</p>
      <h1 className="mt-2 font-display text-3xl text-cream sm:text-4xl">Contact</h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <form onSubmit={submit} className="rounded-sm border border-hairline bg-surface p-5">
          <h2 className="font-display text-xl text-cream">Leave a note</h2>
          <p className="mt-1 text-sm text-muted">Direct message to our team.</p>
          <label className="mt-4 block text-xs text-muted" htmlFor="c-contact">Your contact</label>
          <input
            id="c-contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Phone number or email"
            autoComplete="off"
            className="mt-1 w-full rounded-sm border border-hairline bg-ink px-3 py-2 text-sm text-cream placeholder:text-faint"
          />
          <label className="mt-4 block text-xs text-muted" htmlFor="c-msg">Your message</label>
          <textarea
            id="c-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write us a few words…"
            rows={4}
            maxLength={300}
            required
            className="mt-1 w-full rounded-sm border border-hairline bg-ink px-3 py-2 text-sm text-cream placeholder:text-faint"
          />
          {status ? (
            <p role={status.ok ? "status" : "alert"} className={`mt-3 text-sm ${status.ok ? "text-brass" : "text-red-400"}`}>
              {status.text}
            </p>
          ) : null}
          <button
            type="submit"
            className="mt-4 rounded-sm bg-brass px-5 py-2 text-sm font-semibold text-ink transition-opacity hover:opacity-90"
          >
            Send
          </button>
        </form>

        <div className="flex flex-col gap-6">
          <div className="rounded-sm border border-hairline bg-surface p-5">
            <h2 className="font-display text-xl text-cream">Store Direct</h2>
            <p className="mt-1 text-sm text-muted">Replies in ~2 min during opening hours.</p>
            <p className="mt-3 font-display text-2xl tabular-nums text-cream">54 786 930</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="https://wa.me/21654786930?text=Hello!%20I%20have%20an%20inquiry%20regarding%20the%20store."
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm bg-[#25d366] px-4 py-2 text-sm font-semibold text-ink"
              >
                WhatsApp
              </a>
              <a
                href="https://www.google.com/maps?q=36.843530,11.095981&z=15"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm border border-hairline px-4 py-2 text-sm text-cream transition-colors hover:border-brass hover:text-brass"
              >
                Open in Google Maps
              </a>
            </div>
          </div>

          <div className="overflow-hidden rounded-sm border border-hairline">
            <iframe
              title="Find us on the map"
              src="https://www.openstreetmap.org/export/embed.html?bbox=11.088%2C36.838%2C11.104%2C36.849&layer=mapnik&marker=36.843530%2C11.095981"
              loading="lazy"
              className="h-64 w-full border-0"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
