"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { loginStaff } from "@/lib/tuition-account-service";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setIsLoggingIn(true);

    try {
      await loginStaff(email, password);
      router.push("/dashboard");
    } catch {
      setErrorMessage(
        "Invalid email or password. Please try again."
      );
    } finally {
      setIsLoggingIn(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-black flex items-center justify-center px-5">

      <div className="w-full max-w-md">

        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-purple-600 shadow-xl">
            <span className="text-4xl">📚</span>
          </div>

          <h1 className="text-4xl font-bold text-white">
            Tuition Attendance
          </h1>

          <p className="mt-2 text-purple-200">
            Smart & Secure Attendance Management
          </p>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-2xl">

          <h2 className="text-2xl font-bold text-gray-900">
            Welcome Back
          </h2>

          <p className="mt-2 text-gray-500">
            Login to manage your tuition attendance
          </p>

          <form
            onSubmit={handleLogin}
            className="mt-7 space-y-5"
          >

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                required
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
              />
            </div>

            {errorMessage && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full rounded-xl bg-purple-700 py-3.5 font-semibold text-white hover:bg-purple-800 disabled:opacity-60"
            >
              {isLoggingIn ? "Signing in..." : "Login"}
            </button>

          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account?
            </p>

            <button
              onClick={() => router.push("/sign-up")}
              className="mt-1 font-semibold text-purple-700 hover:text-purple-900"
            >
              Create a new tuition account
            </button>
          </div>

        </div>

      </div>
    </main>
  );
}