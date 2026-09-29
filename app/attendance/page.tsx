"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  firebaseAuthentication,
  firebaseDatabase,
} from "@/lib/firebase-configuration";

type Student = {
  id: string;
  name: string;
  joiningDate: string;
  tuitionId: string;
  active: boolean;
};

type AttendanceStatus = "present" | "absent";

export default function AttendancePage() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<
    Record<string, AttendanceStatus>
  >({});

  const [tuitionId, setTuitionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Get today's date in local time
  function getTodayDate() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const today = getTodayDate();

  useEffect(() => {
    loadAttendance();
  }, []);

  async function loadAttendance() {
    try {
      setLoading(true);

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
        throw new Error("Staff account not found.");
      }

      const staffData = staffSnapshot.data();

      const currentTuitionId = staffData.tuitionId;

      if (!currentTuitionId) {
        throw new Error("Tuition information not found.");
      }

      setTuitionId(currentTuitionId);

      // Get students belonging to this tuition
      const studentsSnapshot = await getDocs(
        collection(firebaseDatabase, "students")
      );

      const studentList: Student[] = [];

      studentsSnapshot.forEach((studentDocument) => {
        const data = studentDocument.data();

        // Only show students belonging to this tuition
        // and whose joining date has arrived.
        if (
          data.tuitionId === currentTuitionId &&
          data.active !== false &&
          data.joiningDate <= today
        ) {
          studentList.push({
            id: studentDocument.id,
            name: data.name,
            joiningDate: data.joiningDate,
            tuitionId: data.tuitionId,
            active: data.active,
          });
        }
      });

      // Sort alphabetically
      studentList.sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      setStudents(studentList);

      // Check whether today's attendance already exists
      const attendanceReference = doc(
        firebaseDatabase,
        "attendance",
        `${currentTuitionId}_${today}`
      );

      const attendanceSnapshot = await getDoc(
        attendanceReference
      );

      if (attendanceSnapshot.exists()) {
        const attendanceData = attendanceSnapshot.data();

        setAttendance(attendanceData.records || {});
        setLocked(attendanceData.locked === true);
      }

    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Unable to load attendance. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function markAttendance(
    studentId: string,
    status: AttendanceStatus
  ) {
    if (locked) return;

    setAttendance((previous) => ({
      ...previous,
      [studentId]: status,
    }));
  }

  async function saveAttendance() {
    if (locked) return;

    try {
      setSaving(true);
      setErrorMessage("");

      if (!tuitionId) {
        throw new Error("Tuition ID missing.");
      }

      const attendanceReference = doc(
        firebaseDatabase,
        "attendance",
        `${tuitionId}_${today}`
      );

      await setDoc(
        attendanceReference,
        {
          tuitionId: tuitionId,
          date: today,
          records: attendance,
          locked: false,
          updatedAt: serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      alert("Attendance saved successfully.");

    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Unable to save attendance."
      );
    } finally {
      setSaving(false);
    }
  }

  async function lockAttendance() {
    if (locked) return;

    const confirmed = window.confirm(
      "Are you sure you want to lock today's attendance? You will not be able to change it until it is unlocked."
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      const attendanceReference = doc(
        firebaseDatabase,
        "attendance",
        `${tuitionId}_${today}`
      );

      await setDoc(
        attendanceReference,
        {
          tuitionId: tuitionId,
          date: today,
          records: attendance,
          locked: true,
          lockedAt: serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      setLocked(true);

    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Unable to lock attendance."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-xl font-semibold text-purple-800">
            Loading attendance...
          </div>

          <p className="mt-2 text-gray-500">
            Please wait.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">

      {/* HEADER */}

      <header className="bg-purple-900 px-6 py-6 text-white">

        <div className="mx-auto max-w-5xl">

          <button
            onClick={() => router.push("/dashboard")}
            className="mb-4 text-sm text-purple-200 hover:text-white"
          >
            ← Back to Dashboard
          </button>

          <h1 className="text-3xl font-bold">
            Today&apos;s Attendance
          </h1>

          <p className="mt-1 text-purple-200">
            {today}
          </p>

        </div>

      </header>


      {/* CONTENT */}

      <div className="mx-auto max-w-5xl px-6 py-8">

        {/* ERROR */}

        {errorMessage && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {errorMessage}
          </div>
        )}


        {/* STATUS */}

        <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-sm text-gray-500">
              Attendance Status
            </p>

            {locked ? (
              <p className="mt-1 font-bold text-red-600">
                🔒 Locked
              </p>
            ) : (
              <p className="mt-1 font-bold text-green-600">
                ● Editable
              </p>
            )}

          </div>


          <div className="text-sm text-gray-500">
            {students.length} student
            {students.length !== 1 ? "s" : ""}
          </div>

        </div>


        {/* STUDENT LIST */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b px-6 py-5">

            <h2 className="text-xl font-bold text-gray-900">
              Student Attendance
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Mark each student as present or absent.
            </p>

          </div>


          {students.length === 0 ? (

            <div className="p-10 text-center">

              <p className="text-lg font-semibold text-gray-700">
                No students found
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Add students before taking attendance.
              </p>

              <button
                onClick={() => router.push("/students/add")}
                className="mt-5 rounded-xl bg-purple-700 px-5 py-3 font-semibold text-white"
              >
                + Add Student
              </button>

            </div>

          ) : (

            <div className="divide-y">

              {students.map((student) => {

                const currentStatus =
                  attendance[student.id];

                return (
                  <div
                    key={student.id}
                    className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                  >

                    {/* STUDENT */}

                    <div>

                      <p className="text-lg font-semibold text-gray-900">
                        {student.name}
                      </p>

                      <p className="text-xs text-gray-500">
                        Joined: {student.joiningDate}
                      </p>

                    </div>


                    {/* BUTTONS */}

                    <div className="flex gap-3">

                      <button
                        disabled={locked}
                        onClick={() =>
                          markAttendance(
                            student.id,
                            "present"
                          )
                        }
                        className={`rounded-xl px-5 py-3 font-semibold transition ${
                          currentStatus === "present"
                            ? "bg-green-600 text-white"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        } ${
                          locked
                            ? "cursor-not-allowed opacity-60"
                            : ""
                        }`}
                      >
                        ✓ Present
                      </button>


                      <button
                        disabled={locked}
                        onClick={() =>
                          markAttendance(
                            student.id,
                            "absent"
                          )
                        }
                        className={`rounded-xl px-5 py-3 font-semibold transition ${
                          currentStatus === "absent"
                            ? "bg-red-600 text-white"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        } ${
                          locked
                            ? "cursor-not-allowed opacity-60"
                            : ""
                        }`}
                      >
                        ✕ Absent
                      </button>

                    </div>

                  </div>
                );
              })}

            </div>

          )}

        </div>


        {/* ACTION BUTTONS */}

        {students.length > 0 && (

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">

            <button
              onClick={saveAttendance}
              disabled={saving || locked}
              className="rounded-xl bg-purple-700 px-6 py-3 font-semibold text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "💾 Save Attendance"}
            </button>


            <button
              onClick={lockAttendance}
              disabled={saving || locked}
              className="rounded-xl bg-gray-900 px-6 py-3 font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {locked
                ? "🔒 Attendance Locked"
                : "🔒 Lock Attendance"}
            </button>

          </div>

        )}

      </div>

    </main>
  );
}