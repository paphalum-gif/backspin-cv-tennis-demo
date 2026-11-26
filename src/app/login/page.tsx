import LineLoginButton from "./LineLoginButton";

export default function LoginPage() {
  return (
    <main className="wrap">
      <section className="card narrow center">
        <div className="logo">B</div>
        <div className="eyebrow">BACKSPIN</div>
        <h1>Sign in with LINE</h1>
        <p className="muted">Use your LINE account to access Backspin.</p>
        <LineLoginButton />
        <p className="muted small">
          By continuing, you agree to Backspin&apos;s terms and privacy policy.
        </p>
      </section>
    </main>
  );
}
