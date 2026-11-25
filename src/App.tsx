import { useCallback, useEffect, useRef, useState } from "react";
import logo from "./assets/logo.jpg";
import { COMPANY } from "./lib/company";
import { deleteJob, deleteOffer, getOffers, loadApp, readNow, saveJob, saveOffer } from "./lib/db";
import { createInstallJob, createServiceJob } from "./lib/defaults";
import { emptyMoney } from "./lib/simple";
import type { RecommendSize } from "./lib/btu";
import type { JobRecord, Offer, Settings } from "./lib/types";
import { Dialog } from "./ui";
import { BtuScreen } from "./screens/BtuScreen";
import { JobForm } from "./screens/JobForm";
import { JobHome } from "./screens/JobHome";
import { OfferHost } from "./screens/OffersScreen";
import { PrintView } from "./screens/PrintView";
import { ProfitScreen } from "./screens/ProfitScreen";
import { SettingsScreen } from "./screens/SettingsScreen";

type MainTab = "btu" | "offers" | "jobs" | "profit";
type Route =
  | { name: "main"; tab: MainTab }
  | { name: "settings" }
  | { name: "job"; id: string }
  | { name: "offer"; id: string }
  | { name: "print"; id: string; mode: "quote" | "internal" };

function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, "") || "/";
  if (path === "/" || path === "/btu") return { name: "main", tab: "btu" };
  if (path === "/offers") return { name: "main", tab: "offers" };
  if (path === "/service" || path === "/install" || path === "/jobs") return { name: "main", tab: "jobs" };
  if (path === "/profit") return { name: "main", tab: "profit" };
  if (path === "/settings") return { name: "settings" };
  const print = path.match(/^\/print\/([^/]+)(?:\/(internal))?$/);
  if (print) return { name: "print", id: decodeURIComponent(print[1]), mode: print[2] ? "internal" : "quote" };
  const offer = path.match(/^\/offer\/([^/]+)$/);
  if (offer) return { name: "offer", id: decodeURIComponent(offer[1]) };
  const job = path.match(/^\/job\/([^/]+)/);
  if (job) return { name: "job", id: decodeURIComponent(job[1]) };
  return { name: "main", tab: "btu" };
}

function href(route: Route): string {
  if (route.name === "main") return route.tab === "btu" ? "#/btu" : `#/${route.tab}`;
  if (route.name === "settings") return "#/settings";
  if (route.name === "offer") return `#/offer/${encodeURIComponent(route.id)}`;
  if (route.name === "print") return `#/print/${encodeURIComponent(route.id)}${route.mode === "internal" ? "/internal" : ""}`;
  return `#/job/${encodeURIComponent(route.id)}`;
}

export function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<JobRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [pendingNav, setPendingNav] = useState<Route | null>(null);
  const dirtyRef = useRef(false);
  const onDirty = useCallback((dirty: boolean) => { dirtyRef.current = dirty; }, []);

  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    void loadApp().then(
      async (data) => {
        setJobs(data.jobs);
        setSettings(data.settings);
        setOffers(await getOffers());
        setReady(true);
      },
      () => setError("Could not open the job store on this phone."),
    );
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function commit(next: Route) {
    const hash = href(next);
    if (window.location.hash !== hash) window.location.hash = hash;
    else setRoute(next);
  }

  function go(next: Route) {
    const leavingJob = route.name === "job" && !(next.name === "job" && next.id === route.id);
    if (leavingJob && dirtyRef.current) {
      setPendingNav(next);
      return;
    }
    if (leavingJob && draft && route.name === "job" && draft.id === route.id) setDraft(null);
    commit(next);
  }

  const current = route.name === "job" || route.name === "print"
    ? jobs.find((job) => job.id === route.id) ?? (draft && route.name === "job" && draft.id === route.id ? draft : undefined)
    : undefined;

  async function useSize(size: RecommendSize, target: "offer" | "install") {
    if (!settings) return;
    if (target === "offer") {
      const created = createInstallJob(settings);
      const job: JobRecord = {
        ...created,
        status: "quote",
        notes: `BTU calculator recommended ${size}.`,
        money: { ...emptyMoney(), size },
      };
      await saveJob(job);
      setJobs((list) => [job, ...list]);
      commit({ name: "job", id: job.id });
      return;
    }
    const created = createInstallJob(settings);
    const job = {
      ...created,
      status: "quote" as const,
      notes: `BTU calculator recommended ${size}.`,
      money: { ...emptyMoney(), size },
    };
    setDraft(job);
    commit({ name: "job", id: job.id });
  }

  function add(kind: "install" | "service", status: "quote" | "scheduled") {
    if (!settings) return;
    const job = kind === "service" ? createServiceJob(settings) : createInstallJob(settings);
    job.status = status;
    setDraft(job);
    go({ name: "job", id: job.id });
  }

  const jobsTab = route.name === "job" || (route.name === "main" && route.tab === "jobs");
  const offerTab = route.name === "offer" || (route.name === "main" && route.tab === "offers");

  return (
    <div className="app">
      <header className="topbar no-print">
        {route.name === "main" ? (
          <>
            <img className="brand-logo" src={logo} alt="L.C.P Clima" />
            <div>
              <div className="brand-name">{COMPANY.brand}</div>
              <div className="brand-sub">{COMPANY.city} · {COMPANY.nuis}</div>
            </div>
            <span className="spacer" />
            <button type="button" className="text-btn" onClick={() => go({ name: "settings" })}>Settings</button>
          </>
        ) : (
          <>
            <button type="button" className="icon-btn" onClick={() => go({ name: "main", tab: route.name === "offer" ? "offers" : "jobs" })}>Back</button>
            <img className="brand-logo small" src={logo} alt="" />
            <h1>{route.name === "settings" ? "Settings (cilësimet)" : route.name === "print" ? "Print (printo)" : current?.customerName || "Job"}</h1>
            <span className="spacer" />
            <button type="button" className="text-btn" onClick={() => go({ name: "settings" })}>Settings</button>
            {route.name === "print" ? (
              <button type="button" className="text-btn" onClick={() => window.print()}>Print</button>
            ) : null}
          </>
        )}
        </header>
      <nav className="tabbar four top no-print">
        <button type="button" data-testid="tab-btu" className={route.name === "main" && route.tab === "btu" ? "on" : ""} onClick={() => go({ name: "main", tab: "btu" })}>BTU</button>
        <button type="button" data-testid="tab-offers" className={offerTab ? "on" : ""} onClick={() => go({ name: "main", tab: "offers" })}>Ofertë<small>Offer</small></button>
        <button type="button" data-testid="tab-jobs" className={jobsTab ? "on" : ""} onClick={() => go({ name: "main", tab: "jobs" })}>Servis & montim<small>Service & install</small></button>
        <button type="button" data-testid="tab-profit" className={route.name === "main" && route.tab === "profit" ? "on" : ""} onClick={() => go({ name: "main", tab: "profit" })}>Fitim / humbje<small>Profit & loss</small></button>
      </nav>
      <main className="main">
        {!ready && !error ? <p>Opening LCP Clima…</p> : null}
        {error ? <p>{error}</p> : null}
        {ready && settings && route.name === "main" && route.tab === "btu" ? <BtuScreen onUse={(size, target) => void useSize(size, target)} /> : null}
        {ready && settings && route.name === "main" && route.tab === "offers" ? (
          <JobHome mode="offer" jobs={jobs} offers={offers} onOpen={(id) => commit({ name: "job", id })} onOpenOffer={(id) => commit({ name: "offer", id })} onNew={add} />
        ) : null}
        {ready && settings && route.name === "main" && route.tab === "jobs" ? (
          <JobHome mode="work" jobs={jobs} offers={[]} onOpen={(id) => commit({ name: "job", id })} onOpenOffer={() => undefined} onNew={add} />
        ) : null}
        {ready && settings && route.name === "main" && route.tab === "profit" ? (
          <ProfitScreen jobs={jobs} onOpen={(id) => commit({ name: "job", id })} />
        ) : null}
        {ready && settings && route.name === "offer" ? (
          offers.some((offer) => offer.id === route.id) ? (
            <OfferHost
              key={route.id}
              initial={offers.find((offer) => offer.id === route.id)!}
              settings={settings}
              onSaved={(offer) => {
                void saveOffer(offer);
                setOffers((list) => list.map((item) => (item.id === offer.id ? offer : item)));
              }}
              onDelete={() => {
                const id = route.id;
                void deleteOffer(id).then(() => {
                  setOffers((list) => list.filter((offer) => offer.id !== id));
                  commit({ name: "main", tab: "offers" });
                });
              }}
            />
          ) : <p>This offer is not on this phone.</p>
        ) : null}
        {ready && settings && route.name === "settings" ? (
          <SettingsScreen
            settings={settings}
            jobs={jobs}
            onChange={setSettings}
            onImported={() => {
              void readNow().then((data) => {
                setJobs(data.jobs);
                setSettings(data.settings);
                go({ name: "main", tab: "jobs" });
              });
            }}
          />
        ) : null}
        {ready && route.name === "job" && current ? (
          <JobForm
            key={current.id}
            initial={current}
            book={settings?.priceBook ?? []}
            draft={draft?.id === current.id}
            onDirty={onDirty}
            onSaved={(job) => {
              setJobs((list) => list.some((item) => item.id === job.id) ? list.map((item) => (item.id === job.id ? job : item)) : [job, ...list]);
              setDraft(null);
            }}
            onDelete={() => setPendingDelete(current.id)}
          />
        ) : null}
        {ready && route.name === "job" && !current ? <p>This job is not on this phone. (Kjo punë nuk është këtu.)</p> : null}
        {ready && route.name === "print" && current ? (
          <>
            <p className="hint no-print">On iPhone, tap Print, then use Share in the preview to save a PDF. (Printo, pastaj Share për PDF.)</p>
            <PrintView job={current} mode={route.mode} phone={settings?.companyPhone ?? ""} />
          </>
        ) : null}
      </main>
      {pendingNav ? (
        <Dialog title="Unsaved changes (ndryshime të paruajtura)" onClose={() => setPendingNav(null)}>
          <p>Leave without saving? (Dil pa i ruajtur?)</p>
          <div className="actions">
            <button type="button" className="btn danger" onClick={() => { const next = pendingNav; dirtyRef.current = false; if (draft && route.name === "job" && draft.id === route.id) setDraft(null); setPendingNav(null); commit(next); }}>
              Leave (dil)
            </button>
            <button type="button" className="btn" onClick={() => setPendingNav(null)}>Stay (rri)</button>
          </div>
        </Dialog>
      ) : null}
      {pendingDelete ? (
        <Dialog title="Delete this job? (Fshi këtë punë?)" onClose={() => setPendingDelete(null)}>
          <p>The job and its photos will be removed from this phone. This cannot be undone.</p>
          <div className="actions">
            <button
              type="button"
              className="btn danger"
              data-testid="confirm-delete"
              onClick={() => {
                const id = pendingDelete;
                if (draft?.id === id && !jobs.some((job) => job.id === id)) {
                  setDraft(null);
                  setPendingDelete(null);
                  dirtyRef.current = false;
                  commit({ name: "main", tab: "jobs" });
                  return;
                }
                void deleteJob(id).then(() => {
                  setJobs((list) => list.filter((job) => job.id !== id));
                  setDraft(null);
                  setPendingDelete(null);
                  dirtyRef.current = false;
                  commit({ name: "main", tab: "jobs" });
                });
              }}
            >
              Delete (fshi)
            </button>
            <button type="button" className="btn" onClick={() => setPendingDelete(null)}>Cancel (anulo)</button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
