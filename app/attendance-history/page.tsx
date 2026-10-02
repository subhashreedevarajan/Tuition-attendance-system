"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

import {
  firebaseAuthentication,
  firebaseDatabase,
} from "@/lib/firebase-configuration";

type AttendanceDay = {
  id: string;
  date: string;
  locked: boolean;
  records: Record<string, any>;
};

export default function AttendanceHistoryPage() {
  const router = useRouter();

  const [attendanceDays, setAttendanceDays] = useState<
    AttendanceDay[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      firebaseAuthentication,
      (user) => {
        if (!user) {
          router.replace("/");
          return;
        }

        loadAttendanceHistory();
      }
    );

    return () => unsubscribe();
  }, [router]);

  async function loadAttendanceHistory() {
    try {
      setLoading(true);
      setErrorMessage("");

      const user = firebaseAuthentication.currentUser;

      if (!user) {
        router.replace("/");
        return;
      }

      // --------------------------------
      // GET STAFF INFORMATION
      // --------------------------------

      const staffReference = doc(
        firebaseDatabase,
        "staffUsers",
        user.uid
      );

      const staffSnapshot = await getDoc(
        staffReference
      );

      if (!staffSnapshot.exists()) {
        throw new Error(
          "Staff account not found."
        );
      }

      const staffData = staffSnapshot.data();

      const tuitionId = staffData.tuitionId;

      if (!tuitionId) {
        throw new Error(
          "Tuition information not found."
        );
      }

      // --------------------------------
      // GET ATTENDANCE DOCUMENTS
      // --------------------------------

      const attendanceReference = collection(
        firebaseDatabase,
        "attendance"
      );

      const attendanceSnapshot = await getDocs(
        attendanceReference
      );

      const history: AttendanceDay[] = [];

      attendanceSnapshot.forEach(
        (attendanceDocument) => {
          const data =
            attendanceDocument.data();

          // Only show attendance
          // belonging to this tuition

          if (data.tuitionId === tuitionId) {
            history.push({
              id: attendanceDocument.id,

              date: data.date || "",

              locked:
                data.locked === true,

              records:
                data.records || {},
            });
          }
        }
      );

      // --------------------------------
      // SORT NEWEST DATE FIRST
      // --------------------------------

      history.sort((a, b) =>
        b.date.localeCompare(a.date)
      );

      setAttendanceDays(history);

    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Unable to load attendance history."
      );
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------
  // COUNT PRESENT
  // --------------------------------

  function getPresentCount(
    records: Record<string, any>
  ) {
    return Object.values(records).filter(
      (record) =>
        typeof record === "object" &&
        record?.status === "present"
    ).length;
  }

  // --------------------------------
  // COUNT ABSENT
  // --------------------------------

  function getAbsentCount(
    records: Record<string, any>
  ) {
    return Object.values(records).filter(
      (record) =>
        typeof record === "object" &&
        record?.status === "absent"
    ).length;
  }

  // --------------------------------
  // LOADING
  // --------------------------------

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">

        <div className="text-center">

          <p className="text-xl font-semibold text-purple-800">
            Loading attendance history...
          </p>

          <p className="mt-2 text-gray-500">
            Please wait.
          </p>

        </div>

      </main>
    );
  }

  // --------------------------------
  // PAGE
  // --------------------------------

  return (
    <main className="min-h-screen bg-gray-100">

      {/* HEADER */}

      <header className="border-b bg-white px-6 py-5 shadow-sm">

        <div className="mx-auto flex max-w-5xl items-center justify-between">

          <div>

            <h1 className="text-2xl font-bold text-purple-900">
              📚 Tuition Attendance
            </h1>

            <p className="text-sm text-gray-500">
              Attendance History
            </p>

          </div>

          <button
            onClick={() =>
              router.push("/dashboard")
            }
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            ← Dashboard
          </button>

        </div>

      </header>


      {/* CONTENT */}

      <div className="mx-auto max-w-5xl px-6 py-8">

        {/* TITLE */}

        <div className="mb-8">

          <h2 className="text-3xl font-bold text-gray-900">
            Attendance History
          </h2>

          <p className="mt-1 text-gray-500">
            View attendance records from previous days.
          </p>

        </div>


        {/* ERROR */}

        {errorMessage && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}


        {/* NO RECORDS */}

        {attendanceDays.length === 0 ? (

          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

            <div className="text-5xl">
              📋
            </div>

            <h3 className="mt-4 text-xl font-bold text-gray-900">
              No Attendance Records
            </h3>

            <p className="mt-2 text-gray-500">
              Attendance records will appear here
              after you save attendance.
            </p>

            <button
              onClick={() =>
                router.push("/attendance")
              }
              className="mt-6 rounded-xl bg-purple-700 px-5 py-3 font-semibold text-white hover:bg-purple-800"
            >
              Take Attendance
            </button>

          </div>

        ) : (

          /* ATTENDANCE LIST */

          <div className="space-y-4">

            {attendanceDays.map(
              (attendanceDay) => {

                const presentCount =
                  getPresentCount(
                    attendanceDay.records
                  );

                const absentCount =
                  getAbsentCount(
                    attendanceDay.records
                  );

                return (

                  <div
                    key={attendanceDay.id}
                    className="rounded-2xl bg-white p-6 shadow-sm"
                  >

                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                      {/* DATE */}

                      <div>

                        <h3 className="text-xl font-bold text-gray-900">
                          {attendanceDay.date}
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">

                          {attendanceDay.locked
                            ? "🔒 Attendance Locked"
                            : "● Attendance Editable"}

                        </p>

                      </div>


                      {/* STATISTICS */}

                      <div className="flex gap-3">

                        <div className="rounded-xl bg-green-50 px-4 py-3 text-center">

                          <p className="text-xs font-medium text-green-700">
                            Present
                          </p>

                          <p className="text-2xl font-bold text-green-700">
                            {presentCount}
                          </p>

                        </div>


                        <div className="rounded-xl bg-red-50 px-4 py-3 text-center">

                          <p className="text-xs font-medium text-red-700">
                            Absent
                          </p>

                          <p className="text-2xl font-bold text-red-700">
                            {absentCount}
                          </p>

                        </div>

                      </div>

                    </div>


                    {/* VIEW BUTTON */}

                    <div className="mt-5 border-t pt-5">

                      <button
                        onClick={() =>
                          router.push(
                            `/attendance-history/${attendanceDay.date}`
                          )
                        }
                        className="rounded-xl bg-purple-700 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-800"
                      >
                        View Attendance →
                      </button>

                    </div>

                  </div>

                );
              }
            )}

          </div>

        )}

      </div>

    </main>
  );
}