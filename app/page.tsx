import Link from "next/link";
import { DEFAULT_YEAR } from "@/lib/config";
import { getSession } from "@/lib/session";

const ERRORS: Record<string, string> = {
  denied: "Sign-in was cancelled.",
  bad_state: "That sign-in link expired. Try again.",
  missing_code: "GitHub didn't send back an authorisation code. Try again.",
  no_token: "GitHub refused to issue a token. Check the OAuth app credentials.",
  not_configured:
    "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET aren't set. Copy .env.example to .env.local and fill them in.",
};

export default async function Home({
  searchParams,
}: PageProps<"/">) {
  const session = await getSession();
  const { error } = await searchParams;
  const errorMessage = typeof error === "string" ? (ERRORS[error] ?? "Something went wrong.") : null;

  return (
    <main className="page-frame relative mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center gap-10">
      <header className="space-y-5">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
          Reflog · {DEFAULT_YEAR}
        </p>
        <h1 className="text-balance text-5xl leading-[1.05] font-semibold sm:text-6xl">
          Your year in code, measured properly.
        </h1>
        <p className="max-w-lg text-pretty text-lg leading-relaxed text-muted">
          Most year-in-review tools rank you by stars. Reflog ranks nothing. It reads the
          shape of your actual year — volume, consistency, the breadth of the stack you
          own, the organisations you built for — and tells you what it found.
        </p>
      </header>

      {errorMessage ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-mono text-sm text-red-200"
        >
          {errorMessage}
        </p>
      ) : null}

      {session ? (
        <section className="space-y-4">
          <p className="font-mono text-sm text-muted">
            Signed in as <span className="text-paper">{session.login}</span>
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/debug"
              className="rounded-full bg-paper px-6 py-3 font-mono text-sm font-medium text-ink transition hover:opacity-90"
            >
              View raw data
            </Link>
            <Link
              href="/api/auth/logout"
              className="rounded-full border border-white/15 px-6 py-3 font-mono text-sm text-paper transition hover:border-white/40"
            >
              Sign out
            </Link>
          </div>
        </section>
      ) : (
        <section className="space-y-5">
          <Link
            href="/api/auth/login"
            className="inline-flex items-center gap-3 rounded-full bg-paper px-7 py-3.5 font-mono text-sm font-medium text-ink transition hover:opacity-90"
          >
            <GitHubMark />
            Continue with GitHub
          </Link>
          <p className="max-w-lg text-sm leading-relaxed text-muted">
            Most engineers&rsquo; real work is private. We read repo metadata only — never
            your code — and we never store it.
          </p>
        </section>
      )}
    </main>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
