import type { ReactElement } from 'react';
import { CITIES, REGION_LABEL, type City, type Region } from '../data/cities';
import { SESSIONS, type SessionInfo } from '../data/sessions';
import { FOREX_SESSIONS } from '../data/forexSessions';
import {
  OPEN_NOW_FAQS,
  killzoneExplainer,
  killzoneFaqs,
  killzoneModel,
  marketHoursExplainer,
  marketHoursFaqs,
  marketHoursModel,
  multiYear,
  nySpan,
  type Ctx,
  type Faq,
} from '../content';
import { WEEKDAY, fmtRange, span12, span24, type Regime } from '../times';
import { KZ_INDEX, MH_INDEX, OPEN_NOW, kzUrl, mhUrl, relatedCities, sessionUrl } from '../routes';
import { FaqBlock, LiveCard, type Crumb, type PageMeta } from './Layout';
import { AdSlot } from '../../components/AdSlot';
import { AffiliateCta } from '../../components/AffiliateCta';
import { defOf } from '../data/sessions';

export interface Page {
  meta: PageMeta;
  body: ReactElement;
}

const HOME: Crumb = { name: 'Home', path: '/' };
const KZ: Crumb = { name: 'Killzones', path: KZ_INDEX };
const MH: Crumb = { name: 'Market hours', path: MH_INDEX };
const REGIONS = Object.keys(REGION_LABEL) as Region[];

/** Append a suffix only while the title stays within ~60 chars (what search results display). */
const withSuffix = (t: string, suffix: string) => (t.length + suffix.length <= 60 ? t + suffix : t);
const periodLabel = (ctx: Ctx) => `${ctx.from.toFormat('LLL yyyy')} – ${ctx.to.minus({ days: 1 }).toFormat('LLL yyyy')}`;
const stdOffset = (ctx: Ctx) => (c: City) => ctx.from.setZone(c.tz).offset;

function ScheduleTable({ rs, ctx, caption, weekly = false }: { rs: Regime[]; ctx: Ctx; caption: string; weekly?: boolean }) {
  const my = multiYear(ctx);
  return (
    <div className="table-wrap">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Dates</th>
            <th scope="col">Local time</th>
            <th scope="col">UTC</th>
          </tr>
        </thead>
        <tbody>
          {rs.map((r) => (
            <tr key={r.first.toISO()}>
              <td>{fmtRange(r, my)}</td>
              <td>
                <b>{weekly ? `${WEEKDAY[r.weekday]} ${r.start}` : span24(r.start, r.end)}</b>
              </td>
              <td className="dim">{weekly ? r.first.toUTC().toFormat('ccc HH:mm') : `${r.first.toUTC().toFormat('HH:mm')}–${utcEnd(r)}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** UTC end time of a regime = UTC start + session length (length is constant in absolute time). */
function utcEnd(r: Regime): string {
  const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  let len = toMin(r.end) - toMin(r.start);
  if (len <= 0) len += 1440;
  return r.first.toUTC().plus({ minutes: len }).toFormat('HH:mm');
}

function Paras({ ps }: { ps: string[] }) {
  return (
    <>
      {ps.map((p) => (
        <p key={p.slice(0, 40)}>{p}</p>
      ))}
    </>
  );
}

function LinkGrid({ links }: { links: { href: string; label: string; sub?: string }[] }) {
  return (
    <ul className="link-grid">
      {links.map((l) => (
        <li key={l.href}>
          <a href={l.href}>
            {l.label}
            {l.sub ? <small>{l.sub}</small> : null}
          </a>
        </li>
      ))}
    </ul>
  );
}

// ---------------- /killzone/[session]/[city] ----------------

export function killzoneCityPage(session: SessionInfo, city: City, ctx: Ctx): Page {
  const m = killzoneModel(session, city, ctx);
  const u = m.usual;
  const faqs = killzoneFaqs(m, ctx);
  const related = relatedCities(city, 8, stdOffset(ctx));
  const meta: PageMeta = {
    path: kzUrl(session, city),
    title: withSuffix(`${session.name} in ${city.name} Time`, ' – Live Countdown'),
    description: `${session.name} in ${city.name}: usually ${span24(u.start, u.end)} local time (${span12(m.ny.start, m.ny.end)} New York). Live countdown, DST-adjusted dates and FAQ.`,
    og: { title: `${session.name} · ${city.name}`, sub: `Usually ${span24(u.start, u.end)} ${city.name} time` },
    crumbs: [HOME, KZ, { name: session.name, path: sessionUrl(session) }, { name: city.name, path: kzUrl(session, city) }],
    faqs,
  };
  const body = (
    <>
      <h1>
        {session.name} in {city.name} time
      </h1>
      <p className="lead">
        Usually <b>{span24(u.start, u.end)}</b> ({span12(u.start, u.end)}) in {city.name} · {span12(m.ny.start, m.ny.end)} New York
        time · {m.utc}
      </p>
      <LiveCard
        kind="killzone"
        tz={city.tz}
        place={city.name}
        defId={m.def.id}
        fallback={`The ${session.label} killzone usually runs ${span24(u.start, u.end)} ${city.name} time on trading days.`}
      />
      <section>
        <h2>
          About the {session.label} killzone in {city.name}
        </h2>
        <Paras ps={killzoneExplainer(m, ctx)} />
      </section>
      <AdSlot id="in-content" />
      <section>
        <h2>
          Exact {session.label} killzone times in {city.name}, {periodLabel(ctx)}
        </h2>
        <ScheduleTable rs={m.regimes} ctx={ctx} caption={`${session.name} on trading days (Mon–Fri), ${city.name} local time`} />
      </section>
      <AffiliateCta placement={`kz-${session.slug}`} />
      <FaqBlock faqs={faqs} />
      <section>
        <h2>Other killzones in {city.name}</h2>
        <LinkGrid
          links={[
            ...m.others.map((o) => ({ href: kzUrl(o.session, city), label: `${o.session.name}`, sub: span24(o.usual.start, o.usual.end) })),
            { href: mhUrl(city), label: `Forex market hours in ${city.name}`, sub: 'Sessions, open & close' },
          ]}
        />
        <h2>
          {session.name} in other cities
        </h2>
        <LinkGrid
          links={related.map((c) => {
            const r = killzoneModel(session, c, ctx, false).usual;
            return { href: kzUrl(session, c), label: c.name, sub: span24(r.start, r.end) };
          })}
        />
        <p>
          <a href={sessionUrl(session)}>All {CITIES.length} cities for the {session.name} →</a>
        </p>
      </section>
      <AdSlot id="below-faq" />
    </>
  );
  return { meta, body };
}

// ---------------- /killzone/[session] ----------------

export function sessionHubPage(session: SessionInfo, ctx: Ctx): Page {
  const ny = nySpan(defOf(session));
  const faqs: Faq[] = [
    { q: `What is the ${session.name}?`, a: session.faqWhat },
    {
      q: `What time is the ${session.name} in New York time?`,
      a: `${span12(ny.start, ny.end)} New York time on trading days. In UTC that is ${utcOf(session, ctx, 'edt')} while New York is on daylight time and ${utcOf(session, ctx, 'est')} in US winter time.`,
    },
    {
      q: `Does the ${session.name} change with daylight saving time?`,
      a: `It is fixed in New York time, so it moves in UTC when the US changes clocks. Cities that change clocks on other dates, or not at all, see the local time shift by an hour for part of the year. Each city page lists the exact dates.`,
    },
  ];
  const meta: PageMeta = {
    path: sessionUrl(session),
    title: `${session.name} Times in ${CITIES.length} Cities – DST-Adjusted`,
    description: `${session.name} is ${span12(ny.start, ny.end)} New York time. See it converted to local time in ${CITIES.length} trading cities, with a live countdown and daylight saving dates.`,
    og: { title: session.name, sub: `${span12(ny.start, ny.end)} New York · in ${CITIES.length} cities` },
    crumbs: [HOME, KZ, { name: session.name, path: sessionUrl(session) }],
    faqs,
  };
  const body = (
    <>
      <h1>{session.name} times by city</h1>
      <p className="lead">
        {span12(ny.start, ny.end)} New York time · converted to {CITIES.length} cities with daylight saving handled
      </p>
      <LiveCard kind="killzone" tz="auto" place="You" defId={defOf(session).id} fallback={`The ${session.name} runs ${span12(ny.start, ny.end)} New York time.`} />
      <section>
        <h2>What is the {session.name}?</h2>
        <p>
          {session.faqWhat} {session.about[0]} {session.marketContext[0]}
        </p>
      </section>
      <AdSlot id="in-content" />
      {REGIONS.map((reg) => (
        <section key={reg}>
          <h2>
            {session.name} in {REGION_LABEL[reg]}
          </h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">City</th>
                  <th scope="col">Usual local time</th>
                  <th scope="col">Other times in the year</th>
                </tr>
              </thead>
              <tbody>
                {CITIES.filter((c) => c.region === reg).map((c) => {
                  const m = killzoneModel(session, c, ctx, false);
                  return (
                    <tr key={c.slug}>
                      <td>
                        <a href={kzUrl(session, c)}>{c.name}</a>
                      </td>
                      <td>
                        <b>{span24(m.usual.start, m.usual.end)}</b>
                      </td>
                      <td className="dim">{m.variants.slice(1).map((v) => span24(v.start, v.end)).join(', ') || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <FaqBlock faqs={faqs} />
      <section>
        <h2>Other ICT killzones</h2>
        <LinkGrid
          links={SESSIONS.filter((s) => s.slug !== session.slug).map((s) => {
            const n = nySpan(defOf(s));
            return { href: sessionUrl(s), label: s.name, sub: `${span12(n.start, n.end)} NY` };
          })}
        />
      </section>
      <AdSlot id="below-faq" />
    </>
  );
  return { meta, body };
}

function utcOf(session: SessionInfo, ctx: Ctx, which: 'edt' | 'est'): string {
  const m = killzoneModel(session, CITIES.find((c) => c.slug === 'new-york')!, ctx, false);
  const r = m.regimes.find((x) => x.first.offset === (which === 'edt' ? -240 : -300)) ?? m.regimes[0];
  return `${r.first.toUTC().toFormat('HH:mm')}–${utcEnd(r)}`;
}

// ---------------- /killzone ----------------

export function killzoneIndexPage(ctx: Ctx): Page {
  const faqs: Faq[] = [
    {
      q: 'What are the ICT killzone times?',
      a: 'In New York time: Asian killzone 8:00 PM–12:00 AM, London Open 2:00–5:00 AM, New York AM 7:00–10:00 AM, London Close 10:00 AM–12:00 PM, and the New York PM session 1:30–4:00 PM.',
    },
    {
      q: 'Why are killzones defined in New York time?',
      a: 'ICT (Inner Circle Trader) teaches the schedule in New York local time, so the windows stay tied to the US trading day and move in UTC when US daylight saving changes.',
    },
  ];
  const meta: PageMeta = {
    path: KZ_INDEX,
    title: 'ICT Killzone Times in Your Time Zone – All Sessions & Cities',
    description: `All five ICT killzones (Asian, London Open, New York AM, London Close, New York PM) converted to local time in ${CITIES.length} cities, DST-adjusted, with live countdowns.`,
    og: { title: 'ICT Killzone Times', sub: `5 sessions · ${CITIES.length} cities · DST-aware` },
    crumbs: [HOME, KZ],
    faqs,
  };
  const body = (
    <>
      <h1>ICT killzone times in your time zone</h1>
      <p className="lead">Five ICT killzones, defined in New York time, converted to {CITIES.length} trading cities.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Killzone</th>
              <th scope="col">New York time</th>
            </tr>
          </thead>
          <tbody>
            {SESSIONS.map((s) => {
              const n = nySpan(defOf(s));
              return (
                <tr key={s.slug}>
                  <td>
                    <a href={sessionUrl(s)}>{s.name}</a>
                  </td>
                  <td>{span12(n.start, n.end)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <AdSlot id="in-content" />
      {REGIONS.map((reg) => (
        <section key={reg}>
          <h2>{REGION_LABEL[reg]}</h2>
          <div className="table-wrap">
            <table className="matrix">
              <thead>
                <tr>
                  <th scope="col">City</th>
                  {SESSIONS.map((s) => (
                    <th scope="col" key={s.slug}>
                      {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CITIES.filter((c) => c.region === reg).map((c) => (
                  <tr key={c.slug}>
                    <th scope="row">
                      <a href={mhUrl(c)}>{c.name}</a>
                    </th>
                    {SESSIONS.map((s) => {
                      const u = killzoneModel(s, c, ctx, false).usual;
                      return (
                        <td key={s.slug}>
                          <a href={kzUrl(s, c)}>{span24(u.start, u.end)}</a>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <FaqBlock faqs={faqs} />
      <AdSlot id="below-faq" />
    </>
  );
  return { meta, body };
}

// ---------------- /market-hours/[city] ----------------

export function marketHoursCityPage(city: City, ctx: Ctx): Page {
  const m = marketHoursModel(city, ctx);
  const faqs = marketHoursFaqs(m);
  const related = relatedCities(city, 8, stdOffset(ctx));
  const o = m.usualOpen;
  const c = m.usualClose;
  const meta: PageMeta = {
    path: mhUrl(city),
    title: withSuffix(`Forex Market Hours in ${city.name} Time`, ' – Open & Close'),
    description: `Forex market hours in ${city.name}: opens ${WEEKDAY[o.weekday]} ${o.start}, closes ${WEEKDAY[c.weekday]} ${c.start} local time. Sydney, Tokyo, London and New York sessions, DST-adjusted.`,
    og: { title: `Forex Hours · ${city.name}`, sub: `Opens ${WEEKDAY[o.weekday]} ${o.start} · Closes ${WEEKDAY[c.weekday]} ${c.start}` },
    crumbs: [HOME, MH, { name: city.name, path: mhUrl(city) }],
    faqs,
  };
  const body = (
    <>
      <h1>Forex market hours in {city.name} time</h1>
      <p className="lead">
        Opens <b>{WEEKDAY[o.weekday]} {o.start}</b> · closes <b>{WEEKDAY[c.weekday]} {c.start}</b> {city.name} time · {m.utc}
      </p>
      <LiveCard kind="market" tz={city.tz} place={city.name} fallback={`Forex is open from ${WEEKDAY[o.weekday]} ${o.start} to ${WEEKDAY[c.weekday]} ${c.start} ${city.name} time.`} />
      <section>
        <h2>Forex sessions in {city.name} local time</h2>
        <div className="table-wrap">
          <table>
            <caption>Approximate session hours on weekdays, converted to {city.name} time</caption>
            <thead>
              <tr>
                <th scope="col">Session</th>
                <th scope="col">Usual local time</th>
                <th scope="col">Other times in the year</th>
              </tr>
            </thead>
            <tbody>
              {m.sessions.map((s) => {
                const alt = [...new Set(s.regimes.map((r) => span24(r.start, r.end)))].filter((x) => x !== span24(s.usual.start, s.usual.end));
                return (
                  <tr key={s.name}>
                    <td>{s.name}</td>
                    <td>
                      <b>{span24(s.usual.start, s.usual.end)}</b>
                    </td>
                    <td className="dim">{alt.join(', ') || '—'}</td>
                  </tr>
                );
              })}
              <tr>
                <td>London–New York overlap</td>
                <td>
                  <b>{span24(m.overlap.usual.start, m.overlap.usual.end)}</b>
                </td>
                <td className="dim">
                  {[...new Set(m.overlap.regimes.map((r) => span24(r.start, r.end)))]
                    .filter((x) => x !== span24(m.overlap.usual.start, m.overlap.usual.end))
                    .join(', ') || '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2>About forex trading hours in {city.name}</h2>
        <Paras ps={marketHoursExplainer(m)} />
      </section>
      <AdSlot id="in-content" />
      <section>
        <h2>ICT killzones in {city.name}</h2>
        <LinkGrid links={m.killzones.map((k) => ({ href: kzUrl(k.session, city), label: k.session.name, sub: span24(k.usual.start, k.usual.end) }))} />
      </section>
      <section>
        <h2>Weekly open and close dates, {periodLabel(ctx)}</h2>
        <ScheduleTable rs={m.open} ctx={ctx} caption={`Weekly forex open (Sunday 17:00 New York) in ${city.name} time`} weekly />
        <ScheduleTable rs={m.close} ctx={ctx} caption={`Weekly forex close (Friday 17:00 New York) in ${city.name} time`} weekly />
      </section>
      <AffiliateCta placement="market-hours" />
      <FaqBlock faqs={faqs} />
      <section>
        <h2>Forex market hours in other cities</h2>
        <LinkGrid links={related.map((r) => ({ href: mhUrl(r), label: r.name }))} />
        <p>
          <a href={OPEN_NOW}>Is the forex market open right now? →</a>
        </p>
      </section>
      <AdSlot id="below-faq" />
    </>
  );
  return { meta, body };
}

// ---------------- /market-hours ----------------

export function marketHoursIndexPage(ctx: Ctx): Page {
  const meta: PageMeta = {
    path: MH_INDEX,
    title: `Forex Market Hours by City – ${CITIES.length} Time Zones`,
    description: `When the forex market opens and closes in ${CITIES.length} cities, plus Sydney, Tokyo, London and New York session times in local time. Daylight saving handled.`,
    og: { title: 'Forex Market Hours', sub: `Open & close in ${CITIES.length} cities` },
    crumbs: [HOME, MH],
  };
  const body = (
    <>
      <h1>Forex market hours by city</h1>
      <p className="lead">Forex trades from Sunday 17:00 to Friday 17:00 New York time. Here is what that means where you live.</p>
      {REGIONS.map((reg) => (
        <section key={reg}>
          <h2>{REGION_LABEL[reg]}</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">City</th>
                  <th scope="col">Weekly open</th>
                  <th scope="col">Weekly close</th>
                  <th scope="col">London–NY overlap</th>
                </tr>
              </thead>
              <tbody>
                {CITIES.filter((c) => c.region === reg).map((c) => {
                  const m = marketHoursModel(c, ctx);
                  return (
                    <tr key={c.slug}>
                      <td>
                        <a href={mhUrl(c)}>{c.name}</a>
                      </td>
                      <td>
                        {WEEKDAY[m.usualOpen.weekday].slice(0, 3)} {m.usualOpen.start}
                      </td>
                      <td>
                        {WEEKDAY[m.usualClose.weekday].slice(0, 3)} {m.usualClose.start}
                      </td>
                      <td>{span24(m.overlap.usual.start, m.overlap.usual.end)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <AdSlot id="below-faq" />
    </>
  );
  return { meta, body };
}

// ---------------- /is-forex-market-open-now ----------------

export function openNowPage(): Page {
  const meta: PageMeta = {
    path: OPEN_NOW,
    title: 'Is the Forex Market Open Now? Live Status & Countdown',
    description: 'Live check: is the forex market open right now? See which sessions (Sydney, Tokyo, London, New York) are active and a countdown to the next open or close.',
    og: { title: 'Is the Forex Market Open Now?', sub: 'Live status · sessions · countdown' },
    crumbs: [HOME, { name: 'Is forex open now?', path: OPEN_NOW }],
    faqs: OPEN_NOW_FAQS,
  };
  const body = (
    <>
      <h1>Is the forex market open now?</h1>
      <p className="lead">Forex is open 24 hours a day from Sunday 17:00 to Friday 17:00 New York time.</p>
      <LiveCard kind="market" tz="auto" place="You" fallback="Forex is open from Sunday 17:00 to Friday 17:00 New York time." />
      <section>
        <h2>Forex trading sessions</h2>
        <p>
          The currency market has no central exchange. Trading follows the business day around the world, moving from Sydney and Tokyo to
          London and then New York. The hours below are the commonly quoted approximate local hours of each centre. The live widget above
          converts them to your time zone and shows which are open now.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Session</th>
                <th scope="col">Local hours</th>
                <th scope="col">Time zone</th>
              </tr>
            </thead>
            <tbody>
              {FOREX_SESSIONS.map((fs) => (
                <tr key={fs.id}>
                  <td>{fs.name}</td>
                  <td>
                    {String(fs.open).padStart(2, '0')}:00–{fs.close}:00
                  </td>
                  <td className="dim">{fs.tz}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <AdSlot id="in-content" />
      <FaqBlock faqs={OPEN_NOW_FAQS} />
      <section>
        <h2>Forex market hours in your city</h2>
        <LinkGrid links={CITIES.map((c) => ({ href: mhUrl(c), label: c.name }))} />
      </section>
      <AffiliateCta placement="open-now" />
      <AdSlot id="below-faq" />
    </>
  );
  return { meta, body };
}

// ---------------- 404 ----------------

export function notFoundPage(): Page {
  return {
    meta: {
      path: '/404',
      title: 'Page not found – Can I Trade Now?',
      description: 'This page does not exist.',
      og: { title: 'Page not found', sub: 'ICT killzone clock' },
      crumbs: [HOME],
      noindex: true,
    },
    body: (
      <>
        <h1>Page not found</h1>
        <p>
          Try the <a href="/">live killzone clock</a>, <a href={KZ_INDEX}>killzone times by city</a> or{' '}
          <a href={MH_INDEX}>forex market hours</a>.
        </p>
      </>
    ),
  };
}
