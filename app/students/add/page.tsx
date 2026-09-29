"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  firebaseAuthentication,
  firebaseDatabase,
} from "@/lib/firebase-configuration";

export default function AddStudentPage() {
  const router = useRouter();

  const [studentName, setStudentName] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [joiningDate, setJoiningDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleAddStudent(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setErrorMessage("");

    try {
      const user = firebaseAuthentication.currentUser;

      if (!user) {
        router.replace("/");
        return;
      }

      // Get staff information
      const staffReference = doc(
        firebaseDatabase,
        "staffUsers",
        user.uid
      );

      const staffSnapshot = await getDoc(staffReference);

      if (!staffSnapshot.exists()) {
        throw new Error("STAFF_NOT_FOUND");
      }

      const staffData = staffSnapshot.data();

      const tuitionId = staffData.tuitionId;

      // Create student document
      const studentReference = doc(
        collection(firebaseDatabase, "students")
      );

      await setDoc(studentReference, {
        name: studentName.trim(),
        parentName: parentName.trim(),
        parentEmail: parentEmail.trim(),
        parentPhone: parentPhone.trim(),
        joiningDate: joiningDate,
        tuitionId: tuitionId,
        active: true,
        createdAt: serverTimestamp(),
      });

      router.push("/students");

    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Unable to add the student. Please try again."
      );

    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100">

      {/* HEADER */}

      <header className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between">

          <div>
            <h1 className="text-xl font-bold text-purple-900">
              📚 Tuition Attendance
            </h1>

            <p className="text-sm text-gray-500">
              Add Student
            </p>
          </div>

          <button
            onClick={() => router.push("/students")}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            ← Students
          </button>

        </div>
      </header>


      {/* FORM */}

      <div className="mx-auto max-w-3xl px-6 py-8">

        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">

          <h2 className="text-2xl font-bold text-gray-900">
            Add New Student
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Enter the student and parent details.
          </p>


          <form
            onSubmit={handleAddStudent}
            className="mt-8 space-y-5"
          >

            {/* STUDENT NAME */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Student Name
              </label>

              <input
                type="text"
                value={studentName}
                onChange={(event) =>
                  setStudentName(event.target.value)
                }
                placeholder="Enter student's full name"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
              />
            </div>


            {/* PARENT NAME */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Parent Name
              </label>

              <input
                type="text"
                value={parentName}
                onChange={(event) =>
                  setParentName(event.target.value)
                }
                placeholder="Enter parent's name"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
              />
            </div>


            {/* PARENT EMAIL */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Parent Email
              </label>

              <input
                type="email"
                value={parentEmail}
                onChange={(event) =>
                  setParentEmail(event.target.value)
                }
                placeholder="parent@example.com"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
              />
            </div>


            {/* PARENT PHONE */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Parent Phone
              </label>

              <input
                type="tel"
                value={parentPhone}
                onChange={(event) =>
                  setParentPhone(event.target.value)
                }
                placeholder="Enter parent's phone number"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
              />
            </div>


            {/* JOINING DATE */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Joining Date
              </label>

              <input
                type="date"
                value={joiningDate}
                onChange={(event) =>
                  setJoiningDate(event.target.value)
                }
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
              />
            </div>


            {/* ERROR */}

            {errorMessage && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                {errorMessage}
              </div>
            )}


            {/* BUTTON */}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-purple-700 px-5 py-3 font-semibold text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Adding Student..." : "Add Student"}
            </button>

          </form>

        </div>

      </div>

    </main>
  );
}