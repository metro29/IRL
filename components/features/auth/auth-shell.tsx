import Link from "next/link";
import { AppLogo } from "@/components/layout/logo";

interface AuthShellProps {
  children: React.ReactNode;
  mode: "login" | "signup";
}

const copy = {
  login: {
    eyebrow: "Welcome back",
    title: "Continue",
    subtitle: "Same browser as before? Jump right in.",
    switch: "First time?",
    switchHref: "/signup",
    switchLabel: "Set up your profile",
  },
  signup: {
    eyebrow: "Join your crew",
    title: "Your profile",
    subtitle: "Username and name only — no email signup.",
    switch: "Already set up?",
    switchHref: "/login",
    switchLabel: "Continue",
  },
} as const;

export function AuthShell({ children, mode }: AuthShellProps) {
  const c = copy[mode];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0a] text-[#f5f2eb]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 20% -10%, hsl(24 95% 55% / 0.35), transparent 55%),
            radial-gradient(ellipse 60% 40% at 90% 100%, hsl(38 90% 50% / 0.12), transparent 50%)
          `,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        aria-hidden
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col lg:flex-row">
        <aside className="flex flex-col justify-between px-6 py-10 lg:w-[52%] lg:px-12 lg:py-14">
          <AppLogo variant="light" className="w-fit" />

          <div className="mt-16 hidden max-w-md lg:block">
            <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-[#f5f2eb]/50">
              In real life
            </p>
            <h1 className="font-display mt-4 text-5xl font-extrabold leading-[1.05] tracking-tight xl:text-6xl">
              Plans with
              <br />
              <span className="text-[#ff7a45]">your people.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-[#f5f2eb]/65">
              Events, challenges, and a live leaderboard — built for friend groups
              who actually show up.
            </p>
            <ul className="mt-10 space-y-3 text-sm text-[#f5f2eb]/55">
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ff7a45]" />
                Daily challenges with photo proof
              </li>
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ff7a45]" />
                Group chat and XP that sticks
              </li>
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ff7a45]" />
                Leaderboard your whole crew can see
              </li>
            </ul>
          </div>

          <p className="mt-12 hidden text-xs text-[#f5f2eb]/35 lg:block">
            © {new Date().getFullYear()} IRL
          </p>
        </aside>

        <section className="flex flex-1 flex-col justify-center px-6 py-10 lg:border-l lg:border-[#f5f2eb]/8 lg:px-12 lg:py-14">
          <div className="mx-auto w-full max-w-[400px]">
            <div className="mb-8 lg:hidden">
              <AppLogo variant="light" />
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff7a45]">
              {c.eyebrow}
            </p>
            <h2 className="font-display mt-2 text-3xl font-bold tracking-tight">
              {c.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#f5f2eb]/55">
              {c.subtitle}
            </p>

            <div className="mt-8">{children}</div>

            <p className="mt-8 text-center text-sm text-[#f5f2eb]/45">
              {c.switch}{" "}
              <Link
                href={c.switchHref}
                className="font-medium text-[#ff7a45] underline-offset-4 transition-opacity hover:opacity-80 hover:underline"
              >
                {c.switchLabel}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
