"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createTuitionAccount } from "@/lib/tuition-account-service";

export default function SignUpPage() {
  const router = useRouter();

  const [tuitionName, setTuitionName] = useState("");
  const [staffName, setStaffName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");

const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage(
        "Password must contain at least 8 characters."
      );
      return;
    }

    setIsCreating(true);

    try {
      await createTuitionAccount({
        tuitionName,
        staffName,
        email,
        password,
      });

      router.push("/dashboard");
   } catch (error: any) {
  console.error(error);

  if (error.message === "TUITION_ALREADY_EXISTS") {
    setErrorMessage(
      "This tuition name already exists. Please use another name."
    );
  } else if (error.code === "auth/email-already-in-use") {
    setErrorMessage(
      "An account already exists with this email."
    );
  } else {
    setErrorMessage(
      "Unable to create the account. Please try again."
    );
  }
} finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-black flex items-center justify-center px-5 py-10">

      <div className="w-full max-w-lg">

        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600">
            <span className="text-3xl">📚</span>
          </div>

          <h1 className="text-3xl font-bold text-white">
            Create Tuition Account
          </h1>

          <p className="mt-2 text-purple-200">
            Start managing your tuition attendance
          </p>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-2xl">

          <form onSubmit={handleSignUp} className="space-y-4">

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Tuition Name
              </label>

              <input
                type="text"
                value={tuitionName}
                onChange={(e) => setTuitionName(e.target.value)}
                placeholder="Example: Jayam Institute"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Admin / Staff Name
              </label>

              <input
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Enter your name"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Password
              </label>

             <div className="relative">
  <input
    type={showPassword ? "text" : "password"}
    value={password}
    onChange={(event) => setPassword(event.target.value)}
    placeholder="Enter your password"
    required
    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-12 text-gray-900 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
  />

  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-purple-700"
    aria-label={showPassword ? "Hide password" : "Show password"}
  >
    {showPassword ? "🙈" : "👁️"}
  </button>
</div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Confirm Password
              </label>

             <div className="relative">
  <input
    type={showConfirmPassword ? "text" : "password"}
    value={confirmPassword}
    onChange={(e) => setConfirmPassword(e.target.value)}
    placeholder="Re-enter your password"
    required
    className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 text-gray-900 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
  />

  <button
    type="button"
    onClick={() =>
      setShowConfirmPassword(!showConfirmPassword)
    }
    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-purple-700"
    aria-label={
      showConfirmPassword
        ? "Hide confirm password"
        : "Show confirm password"
    }
  >
    {showConfirmPassword ? "🙈" : "👁️"}
  </button>
</div>
            </div>

            {errorMessage && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isCreating}
              className="w-full rounded-xl bg-purple-700 py-3.5 font-semibold text-white hover:bg-purple-800 disabled:opacity-60"
            >
              {isCreating
                ? "Creating account..."
                : "Create Tuition Account"}
            </button>

          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?
            </p>

            <button
              onClick={() => router.push("/")}
              className="mt-1 font-semibold text-purple-700"
            >
              Back to Login
            </button>
          </div>

        </div>

      </div>
    </main>
  );
}