import { Card, LinkButton } from "../components/ui.jsx";

const FEATURES = [
  ["Browse health information", "General, sexual & reproductive, menstrual and mental health guidance."],
  ["Ask a question", "Send a question to a professional and read the reply when it suits you."],
  ["Get referred", "A student health ambassador connects you to the right service, seeing only what’s needed."],
  ["Book at the health centre", "Request an appointment with the university health centre."],
];
const PRIVACY = [
  ["Anonymous", "Anonymous concerns are never linked to a student account."],
  ["Role-based", "Ambassadors see only the referrals assigned to them."],
  ["Protected", "Reference codes are stored hashed, and attempts are rate-limited."],
];

export default function Home() {
  return (
    <div>
      <section className="grid items-center gap-8 py-4 md:grid-cols-[1.2fr_1fr]">
        <div>
          <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">Private · Judgement-free · For students</span>
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">Ask about your health without giving your name.</h1>
          <p className="mt-4 max-w-xl text-lg text-stone-600">Get reliable information, talk to a healthcare professional, or get connected to the university health centre, anonymously or confidentially, whichever feels right.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton to="/anonymous">Submit an anonymous concern</LinkButton>
            <LinkButton to="/login" variant="outline">Log in for confidential support</LinkButton>
          </div>
          <p className="mt-4 text-sm text-stone-600">Having an emergency? <a className="font-semibold text-brand-700 underline" href="/emergency">Get help immediately</a>. No login needed.</p>
        </div>
        <Card className="bg-brand-50 p-6">
          <h2 className="text-lg font-bold">How anonymous help works</h2>
          <ol className="mt-4 space-y-3 text-sm">
            {["Share your concern. No name, no account.", "Save your reference code. It’s your only key, and we can’t look it up for you.", "Return any time and enter the code to read the response."].map((t, i) => (
              <li key={i} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span><span>{t}</span></li>
            ))}
          </ol>
        </Card>
      </section>

      <h2 className="mt-12 text-2xl font-bold">What you can do here</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(([t, d]) => <Card key={t}><h3 className="font-bold">{t}</h3><p className="mt-1 text-sm text-stone-600">{d}</p></Card>)}
      </div>

      <h2 className="mt-12 text-2xl font-bold">Your privacy, by design</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {PRIVACY.map(([t, d]) => <Card key={t}><span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">{t}</span><p className="mt-2 text-sm text-stone-600">{d}</p></Card>)}
      </div>
    </div>
  );
}
