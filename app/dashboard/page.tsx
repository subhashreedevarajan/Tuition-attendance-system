"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { firebaseAuthentication } from "@/lib/firebase-configuration";

export default function DashboardPage() {
  const router = useRouter();

  const [isCheckingLogin, setIsCheckingLogin] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      firebaseAuthentication,
      (user) => {
        if (!user) {
          router.replace("/");
          return;
        }

        setIsCheckingLogin(false);
      }
    );

    return () => unsubscribe();
  }, [router]);

  async function handleLogout() {
    await signOut(firebaseAuthentication);
    router.replace("/");
  }

  if (isCheckingLogin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-500">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">

      {/* HEADER */}
      <header className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">

          <div>
            <h1 className="text-xl font-bold text-purple-900">
              📚 Tuition Attendance
            </h1>

            <p className="text-sm text-gray-500">
              Jayam Institute
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Logout
          </button>

        </div>
      </header>


      {/* MAIN CONTENT */}
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* WELCOME */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Dashboard 👋
          </h2>

          <p className="mt-1 text-gray-500">
            Manage your tuition students and attendance.
          </p>
        </div>


        {/* STATISTICS */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Total Students
            </p>

            <p className="mt-3 text-4xl font-bold text-gray-900">
              0
            </p>
          </div>


          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Present Today
            </p>

            <p className="mt-3 text-4xl font-bold text-green-600">
              0
            </p>
          </div>


          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Absent Today
            </p>

            <p className="mt-3 text-4xl font-bold text-red-600">
              0
            </p>
          </div>


          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Overall Attendance
            </p>

            <p className="mt-3 text-4xl font-bold text-purple-700">
              0%
            </p>
          </div>

        </section>


        {/* QUICK ACTIONS */}
        <section className="mt-8">

          <h3 className="mb-4 text-xl font-bold text-gray-900">
            Quick Actions
          </h3>

<div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

            {/* STUDENTS */}
            <button
              onClick={() => router.push("/students")}
              className="rounded-2xl bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-2xl">
                👨‍🎓
              </div>

              <h4 className="text-lg font-bold text-gray-900">
                Manage Students
              </h4>

              <p className="mt-2 text-sm text-gray-500">
                Add new students and manage student information.
              </p>
            </button>
            {/* DELETE STUDENT */}
            <button
              onClick={() => router.push("/students/delete")}
              className="rounded-2xl bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-2xl">
                🗑️
              </div>

              <h4 className="text-lg font-bold text-gray-900">
                Delete Student
              </h4>

              <p className="mt-2 text-sm text-gray-500">
                Remove a student from your active student list.
              </p>
            </button>

            {/* ATTENDANCE */}
            <button
              onClick={() => router.push("/attendance")}
              className="rounded-2xl bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-2xl">
                📋
              </div>

              <h4 className="text-lg font-bold text-gray-900">
                Take Attendance
              </h4>

              <p className="mt-2 text-sm text-gray-500">
                Create today's attendance sheet and mark students.
              </p>
            </button>


            {/* REPORTS */}
            <button
              onClick={() => router.push("/reports")}
              className="rounded-2xl bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl">
                📊
              </div>

              <h4 className="text-lg font-bold text-gray-900">
                Attendance Reports
              </h4>

              <p className="mt-2 text-sm text-gray-500">
                View attendance statistics and monthly reports.
              </p>
            </button>

          </div>

        </section>


        {/* TODAY'S ATTENDANCE */}
        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Today&apos;s Attendance
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                No attendance has been created for today.
              </p>
            </div>

            <button
              onClick={() => router.push("/attendance")}
              className="rounded-xl bg-purple-700 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-800"
            >
              + Create Attendance
            </button>

          </div>

        </section>

      </div>

    </main>
  );
}