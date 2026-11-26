import Link from "next/link";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  return (
    <main className="wrap">
      <section className="card narrow center">
        <div className="logo">B</div>
        <h1>Sign-in could not be completed</h1>
        <p className="muted">Please start LINE Login again.</p>
        {message && <div className="notice red">{message}</div>}
        <Link className="btn" href="/login">
          Return to login
        </Link>
      </section>
    </main>
  );
}
