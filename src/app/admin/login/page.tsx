import AdminLoginForm from "./AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <main className="wrap">
      <section className="card narrow center">
        <div className="logo">B</div>
        <div className="eyebrow">ADMIN ACCESS</div>
        <h1>Sign in to Backspin Admin</h1>
        <p className="muted">Manage tournaments, applications, payments and player validation from one place.</p>
        <AdminLoginForm />
        <p className="muted small">Authorized Backspin Admin users only.</p>
      </section>
    </main>
  );
}
