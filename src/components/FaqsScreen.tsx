import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { PlaceholderPage } from "./PlaceholderPage";

interface Faq {
  question: string;
  answer: ReactNode;
}

const SUPPORT_EMAIL = "support@riverlaunch.app";

const FAQS: Faq[] = [
  {
    question: "How do I add a river?",
    answer: (
      <>
        You can't add rivers directly — they're curated reference data. To
        suggest a new river or a correction to an existing one, email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we'll review
        it.
      </>
    ),
  },
  {
    question: "How do I add an access point, hazard, or other feature?",
    answer: (
      <>
        On the map, use <strong>Add local knowledge</strong> (the button on the
        map controls) to drop a point and describe it. Community contributions
        are checked by our moderators before they appear for everyone.
      </>
    ),
  },
  {
    question: "Where do river levels and gauges come from?",
    answer: (
      <>
        Live levels come from official gauging stations, shown alongside
        community notes. Conditions change quickly — always check locally before
        you get on the water.
      </>
    ),
  },
  {
    question: "How do I save a favourite river?",
    answer: (
      <>
        Tap the star on any river to favourite it. Favourites are saved to your
        account, so you'll need to sign in or create a free account first.
      </>
    ),
  },
  {
    question: "What is a Club, and how do I join one?",
    answer: (
      <>
        Clubs are for organising meetups and sharing paddles with friends.
        Public clubs appear on Discover — open one and request to join, or
        accept an invite. Private clubs aren't listed; you join them by
        invitation.
      </>
    ),
  },
  {
    question: "How do I add photos?",
    answer: (
      <>
        Add photos when you create or edit a point on the map. Like other
        contributions, photos are moderated before they're shown publicly.
      </>
    ),
  },
  {
    question: "Can I use RiverLaunch offline?",
    answer: (
      <>
        Yes — RiverLaunch is a web app you can install, and recently-viewed
        areas keep working offline. Anything you add while offline syncs
        automatically once you're back online.
      </>
    ),
  },
  {
    question: "Is the information reliable?",
    answer: (
      <>
        RiverLaunch blends community knowledge with official data, but it's
        guidance, not a guarantee. Rivers change fast — check conditions locally
        and always paddle within your own judgement and ability.
      </>
    ),
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
      <div className="faq-list">
        {FAQS.map((faq) => (
          <details className="faq-item" key={faq.question}>
            <summary>{faq.question}</summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </div>
      <p className="source-note faq-contact">
        Didn't find your answer? Email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </PlaceholderPage>
  );
}
