import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { PlaceholderPage } from "./PlaceholderPage";

interface Faq {
  question: string;
  answer: ReactNode;
}

interface FaqSection {
  title: string;
  blurb: string;
  faqs: Faq[];
}

const SUPPORT_EMAIL = "support@riverlaunch.app";
const PRIVACY_URL = "https://riverlaunch.app/privacy";
const TERMS_URL = "https://riverlaunch.app/terms";

function SupportLink() {
  return <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
}

const SECTIONS: FaqSection[] = [
  {
    title: "Data",
    blurb: "Where the information comes from, and what happens to what you add.",
    faqs: [
      {
        question: "How do I add a river?",
        answer: (
          <>
            You can't add rivers directly — they're curated reference data. To
            suggest a new river or a correction to an existing one, email{" "}
            <SupportLink /> and we'll review it.
          </>
        ),
      },
      {
        question: "Where do river levels and gauges come from?",
        answer: (
          <>
            Live levels come from official gauging stations, shown alongside
            community notes. Conditions change quickly — always check locally
            before you get on the water.
          </>
        ),
      },
      {
        question: "Why don't my contributions show up straight away?",
        answer: (
          <>
            New points, edits and photos are reviewed before they go live for
            everyone. You can see the status of your own contributions in the
            meantime.
          </>
        ),
      },
      {
        question: "What is the moderation process?",
        answer: (
          <>
            Community contributions are checked by our moderators, and paddlers
            help keep them honest — on any point you can open the{" "}
            <strong>Verify</strong> tab to confirm it or flag that it needs
            re-checking. Approved contributions appear for everyone; unsafe or
            inaccurate ones are edited, hidden, or removed.
          </>
        ),
      },
      {
        question: "How does my public paddler profile work?",
        answer: (
          <>
            A public profile is optional. From <strong>Profile › Public</strong>{" "}
            you can turn it on, pick a friendly handle, and choose what's shown —
            your paddles, skills, and photos. Everything stays private until you
            switch it on.
          </>
        ),
      },
      {
        question: "Is my data secure, and how is it used?",
        answer: (
          <>
            We use your data to run the app and keep contributions honest, and
            analytics only run with your consent. See our{" "}
            <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
              Privacy Statement
            </a>{" "}
            and{" "}
            <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">
              Terms of Use
            </a>{" "}
            for the full detail.
          </>
        ),
      },
    ],
  },
  {
    title: "Setup",
    blurb: "Getting RiverLaunch onto your device, running it, and flagging issues.",
    faqs: [
      {
        question: "How do I install RiverLaunch on my phone?",
        answer: (
          <>
            RiverLaunch installs straight from your browser — no app store
            needed.
            <br />
            <strong>iPhone (Safari):</strong> tap Share, then{" "}
            <em>Add to Home Screen</em>.
            <br />
            <strong>Android (Chrome):</strong> tap the ⋮ menu, then{" "}
            <em>Install app</em> (or <em>Add to Home screen</em>).
          </>
        ),
      },
      {
        question: "How do I remove the app?",
        answer: (
          <>
            <strong>iPhone:</strong> press and hold the RiverLaunch icon, then{" "}
            <em>Remove App</em>.
            <br />
            <strong>Android:</strong> press and hold the icon, then{" "}
            <em>Uninstall</em> (or drag it to Remove).
          </>
        ),
      },
      {
        question: "Can I use RiverLaunch offline?",
        answer: (
          <>
            Yes — once installed, recently-viewed areas keep working offline, and
            anything you add while offline syncs automatically once you're back
            online.
          </>
        ),
      },
      {
        question: "How do I report a problem or incorrect data?",
        answer: (
          <>
            For a specific point, open it and use the <strong>Verify</strong> tab
            to confirm it or flag that it needs re-checking. For anything else —
            a wrong river, a bug, or a broader issue — email <SupportLink /> with
            the details.
          </>
        ),
      },
    ],
  },
  {
    title: "Using the app",
    blurb: "A few behaviours that aren't obvious at first glance.",
    faqs: [
      {
        question:
          'What’s the difference between "Details", "Snap view" and "Select" on a river?',
        answer: (
          <>
            <strong>Details</strong> opens the river's panel without moving the
            map. <strong>Snap view</strong> centres the map on the river and
            opens the panel. <strong>Select</strong> focuses the map on just that
            river's points and hides the rest — tap it again to{" "}
            <strong>Deselect</strong> and bring everything back.
          </>
        ),
      },
      {
        question: "Why do some points only appear when I zoom in?",
        answer: (
          <>
            Access points, hazards and photos appear once you're zoomed in far
            enough, so the wider map stays uncluttered. Zoom in, or select a
            river, to see them.
          </>
        ),
      },
      {
        question: "Why can't I find a club on Discover?",
        answer: (
          <>
            Only public clubs are listed on Discover. Private clubs are
            invite-only — you join one by accepting an invitation, and it then
            appears under your clubs.
          </>
        ),
      },
      {
        question:
          "What's the difference between favouriting a river and logging a paddle?",
        answer: (
          <>
            A <strong>favourite</strong> is a river you've saved for quick
            access. A <strong>paddle log</strong> is your personal record of a
            trip — the date, level, and any notes — kept private to you.
          </>
        ),
      },
    ],
  },
];

export function FaqsScreen({ onBack }: { onBack: () => void }) {
  return (
    <PlaceholderPage section="faqs" title="FAQs">
      <button
        className="ghost-button ghost-button--compact"
        type="button"
        onClick={onBack}
      >
        <ChevronLeft size={15} />
        More
      </button>
      {SECTIONS.map((section) => (
        <section className="faq-section" key={section.title}>
          <div className="faq-section__head">
            <h2>{section.title}</h2>
            <p>{section.blurb}</p>
          </div>
          <div className="faq-list">
            {section.faqs.map((faq) => (
              <details className="faq-item" key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
      <p className="source-note faq-contact">
        Didn't find your answer? Email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </PlaceholderPage>
  );
}
