import Link from "next/link";

export default function PlayerShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="player-bar">
        <Link href="/" className="player-brand">
          <span className="logo">B</span>
          <span>BACKSPIN</span>
        </Link>
        <nav>
          <Link href="/tournaments">Tournaments</Link>
          <Link href="/applications">My Applications</Link>
          <Link href="/profile">Profile</Link>
        </nav>
      </header>
      <main className="page">{children}</main>
    </>
  );
}
