"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    setIsLoading(false);

    if (!response.ok) {
      setError("Wrong username or password");
      return;
    }

    window.location.href = "/";
  }

  return (
    <main className="login-shell">
      <form onSubmit={login} className="login-panel animate-rise">
        <img src="/kliq-logo.png" alt="KLIQ" className="h-16 w-auto object-contain" />

        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium text-[#36332e]">
            Username
            <input
              className="field"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoFocus
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-[#36332e]">
            Password
            <input
              className="field"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error ? <p className="text-sm font-medium text-[#a33b2b]">{error}</p> : null}

          <button type="submit" className="primary-button" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </form>
    </main>
  );
}
