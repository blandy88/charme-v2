import { Link } from "react-router-dom";
import { useI18n } from "../contexts/I18nContext.jsx";

/*
 * Homepage hero, rebuilt clean:
 * one headline, one subline, two actions, one image.
 * The legacy hero stacked four competing widgets (note form, live map,
 * concierge island, social pills) on top of the photo — those live on
 * /contact now, where they belong.
 */
export default function Home() {
  const { t } = useI18n();

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:pt-20">
          <div>
            <p className="meta">{t("heroEyebrow")}</p>
            <h1 className="mt-4 font-display text-5xl leading-[1.02] tracking-tight text-cream sm:text-6xl">
              {t("heroTitleA")}
              <br />
              <span className="text-brass">{t("heroTitleB")}</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
              {t("heroSub")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/collection"
                className="rounded-sm bg-brass px-5 py-2.5 text-sm font-semibold text-ink transition-opacity hover:opacity-90"
              >
                {t("heroCta")}
              </Link>
              <Link
                to="/contact"
                className="rounded-sm border border-hairline px-5 py-2.5 text-sm text-cream transition-colors hover:border-brass hover:text-brass"
              >
                {t("heroSecondary")}
              </Link>
            </div>
          </div>
          <div className="relative">
            <img
              src="/hero-bg.jpg"
              alt="Parfumerie Charme boutique"
              width="960"
              height="1200"
              loading="eager"
              decoding="async"
              className="aspect-[4/5] w-full rounded-sm border border-hairline object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 rounded-sm ring-1 ring-inset ring-white/5"
              aria-hidden="true"
            />
          </div>
        </div>
      </section>

      <section className="border-t border-hairline">
        <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-12 sm:grid-cols-3 sm:px-6">
          {[
            { title: "Curated", body: "Every bottle on the shelf was chosen by hand — no filler, no dupes." },
            { title: "Loyalty", body: "Points with every visit, rewards for regulars. Your card lives in your account." },
            { title: "Advice", body: "Tell us what you love and we will match the scent — in store or on WhatsApp." },
          ].map((f) => (
            <div key={f.title} className="rounded-sm border border-hairline bg-surface p-5">
              <p className="meta">{f.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
