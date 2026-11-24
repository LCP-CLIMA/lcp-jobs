import { useCallback, useEffect, useRef, useState } from "react";
import logo from "./assets/logo.jpg";
import { COMPANY } from "./lib/company";
import { deleteJob, deleteOffer, getOffers, getPhotos, loadApp, putPhoto, readNow, saveJob, saveOffer } from "./lib/db";
import { createInstallJob, createOffer, createServiceJob, isService } from "./lib/defaults";
import { applySize, compute } from "./lib/calc";
import type { RecommendSize } from "./lib/btu";
import { serviceCompute } from "./lib/service";
import type { JobRecord, Offer, Settings } from "./lib/types";
import { Dialog, IncomeAmount, Money } from "./ui";
import { BtuScreen } from "./screens/BtuScreen";
import { JobList } from "./screens/JobList";
import { JobScreen } from "./screens/JobScreen";
import { OfferHost, OfferList } from "./screens/OffersScreen";
import { PrintView } from "./screens/PrintView";
import { SettingsScreen } from "./screens/SettingsScreen";

type Tab = "job" | "costs" | "quote" | "photos";
type MainTab = "btu" | "offers" | "service" | "install";
type Route =
  | { name: "main"; tab: MainTab }
  | { name: "settings" }
  | { name: "job"; id: string; tab: Tab }
  | { name: "offer"; id: string }
  | { name: "print"; id: string; mode: "quote" | "internal" };

function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, "") || "/";
  if (path === "/" || path === "/btu") return { name: "main", tab: "btu" };
  if (path === "/offers") return { name: "main", tab: "offers" };
  if (path === "/service") return { name: "main", tab: "service" };
  if (path === "/install") return { name: "main", tab: "install" };
  if (path === "/settings") return { name: "settings" };
  const print = path.match(/^\/print\/([^/]+)(?:\/(internal))?$/);
  if (print) return { name: "print", id: decodeURIComponent(print[1]), mode: print[2] ? "internal" : "quote" };
  const offer = path.match(/^\/offer\/([^/]+)$/);
  if (offer) return { name: "offer", id: decodeURIComponent(offer[1]) };
  const job = path.match(/^\/job\/([^/]+)(?:\/(costs|quote|photos))?$/);
  if (job) return { name: "job", id: decodeURIComponent(job[1]), tab: (job[2] as Tab) || "job" };
  return { name: "main", tab: "btu" };
}

function href(route: Route): string {
  if (route.name === "main") return route.tab === "btu" ? "#/btu" : `#/${route.tab}`;
  if (route.name === "settings") return "#/settings";
  if (route.name === "offer") return `#/offer/${encodeURIComponent(route.id)}`;
  if (route.name === "print") return `#/print/${encodeURIComponent(route.id)}${route.mode === "internal" ? "/internal" : ""}`;
  const tail = route.tab === "job" ? "" : `/${route.tab}`;
  return `#/job/${encodeURIComponent(route.id)}${tail}`;
}

function cloneJob(job: JobRecord): JobRecord {
  const now = new Date().toISOString();
  const copy = structuredClone(job);
  copy.id = crypto.randomUUID();
  copy.customerName = `${job.customerName || "Job"} (copy)`;
  copy.status = "quote";
  copy.createdAt = now;
  copy.updatedAt = now;
  if (copy.kind === "service") {
    copy.timerStartedAt = null;
    copy.materials = copy.materials.map((row) => ({ ...row, id: crypto.randomUUID() }));
  }
  return copy;
}

export function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
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
    commit(next);
  }

  const current = route.name === "job" || route.name === "print" ? jobs.find((job) => job.id === route.id) : undefined;
  const profit = current ? (isService(current) ? serviceCompute(current).net : compute(current).net) : 0;
  const price = current ? (isService(current) ? serviceCompute(current).sell : compute(current).sell) : 0;

  async function useSize(size: RecommendSize, target: "offer" | "install") {
    if (!settings) return;
    if (target === "offer") {
      const offer = createOffer(size);
      await saveOffer(offer);
      setOffers((list) => [offer, ...list]);
      commit({ name: "offer", id: offer.id });
      return;
    }
    const created = createInstallJob(settings);
    const job = size === "9k"
      ? { ...created, notes: "BTU calculator recommended 9k. The price list used here is 12k, the smallest package." }
      : applySize(created, size);
    await saveJob(job);
    setJobs((list) => [job, ...list]);
    commit({ name: "job", id: job.id, tab: "costs" });
  }

  async function add(kind: "install" | "service") {
    if (!settings) return;
    const job = kind === "service" ? createServiceJob(settings) : createInstallJob(settings);
    await saveJob(job);
    setJobs((list) => [job, ...list]);
    go({ name: "job", id: job.id, tab: "job" });
  }

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
            <button type="button" className="icon-btn" onClick={() => go({ name: "main", tab: current && isService(current) ? "service" : "install" })}>Back</button>
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
      <main className="main">
        {!ready && !error ? <p>Opening LCP Clima…</p> : null}
        {error ? <p>{error}</p> : null}
        {ready && settings && route.name === "main" && route.tab === "btu" ? <BtuScreen onUse={(size, target) => void useSize(size, target)} /> : null}
        {ready && settings && route.name === "main" && route.tab === "offers" ? (
          <OfferList offers={offers} onOpen={(id) => commit({ name: "offer", id })} onNew={() => {
            const offer = createOffer();
            void saveOffer(offer).then(() => {
              setOffers((list) => [offer, ...list]);
              commit({ name: "offer", id: offer.id });
            });
          }} />
        ) : null}
        {ready && settings && route.name === "main" && route.tab === "service" ? (
          <JobList focus="service" jobs={jobs.filter((job) => job.kind === "service")} onOpen={(id) => commit({ name: "job", id, tab: "job" })} onNewInstall={() => void add("install")} onNewService={() => void add("service")} />
        ) : null}
        {ready && settings && route.name === "main" && route.tab === "install" ? (
          <JobList focus="install" jobs={jobs.filter((job) => job.kind === "install")} onOpen={(id) => commit({ name: "job", id, tab: "job" })} onNewInstall={() => void add("install")} onNewService={() => void add("service")} />
        ) : null}
        {ready && settings && route.name === "offer" ? (
          offers.some((offer) => offer.id === route.id) ? (
            <OfferHost
              key={route.id}
              initial={offers.find((offer) => offer.id === route.id)!}
              packages={settings.warrantyPackages ?? []}
              phone={settings.companyPhone}
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
                go({ name: "main", tab: "install" });
              });
            }}
          />
        ) : null}
        {ready && route.name === "job" && current ? (
          <JobScreen
            key={current.id}
            initial={current}
            tab={route.tab}
            phone={settings?.companyPhone ?? ""}
            onTab={(tab) => commit({ name: "job", id: current.id, tab })}
            onDirty={onDirty}
            onFinished={() => commit({ name: "main", tab: current && isService(current) ? "service" : "install" })}
            onSaved={(job) => setJobs((list) => list.map((item) => (item.id === job.id ? job : item)))}
            onPrint={(mode) => go({ name: "print", id: current.id, mode })}
            onDuplicate={(job) => {
              void (async () => {
                const copy = cloneJob(job);
                await saveJob(copy);
                const photos = await getPhotos(job.id);
                for (const photo of photos) await putPhoto({ ...photo, id: crypto.randomUUID(), jobId: copy.id });
                setJobs((list) => [copy, ...list]);
                go({ name: "job", id: copy.id, tab: "job" });
              })();
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
      {route.name === "job" && current ? (
        <div className="profitbar no-print">
          <div>
            <div className="kicker">Profit</div>
            <Money value={profit} large />
          </div>
          <div className="side">Price (çmimi)<IncomeAmount value={price} /></div>
        </div>
      ) : null}
      {route.name === "main" || route.name === "settings" || route.name === "offer" ? (
        <nav className="tabbar four no-print">
          <button type="button" className={route.name === "main" && route.tab === "btu" ? "on" : ""} onClick={() => go({ name: "main", tab: "btu" })}>BTU</button>
          <button type="button" className={(route.name === "main" && route.tab === "offers") || route.name === "offer" ? "on" : ""} onClick={() => go({ name: "main", tab: "offers" })}>Offers (oferta)</button>
          <button type="button" className={route.name === "main" && route.tab === "service" ? "on" : ""} onClick={() => go({ name: "main", tab: "service" })}>Service (servis)</button>
          <button type="button" className={route.name === "main" && route.tab === "install" ? "on" : ""} onClick={() => go({ name: "main", tab: "install" })}>Install (montim)</button>
        </nav>
      ) : null}
      {pendingNav ? (
        <Dialog title="Unsaved changes (ndryshime të paruajtura)" onClose={() => setPendingNav(null)}>
          <p>Leave without saving? (Dil pa i ruajtur?)</p>
          <div className="actions">
            <button type="button" className="btn danger" onClick={() => { const next = pendingNav; dirtyRef.current = false; setPendingNav(null); commit(next); }}>
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
              onClick={() => {
                const id = pendingDelete;
                void deleteJob(id).then(() => {
                  setJobs((list) => list.filter((job) => job.id !== id));
                  setPendingDelete(null);
                  go({ name: "main", tab: "install" });
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
