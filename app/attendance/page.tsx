"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

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

type AttendanceRecord = {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
};

export default function AttendancePage() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);

  const [attendance, setAttendance] = useState<
    Record<string, AttendanceRecord>
  >({});

  const [tuitionId, setTuitionId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [locked, setLocked] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  // --------------------------------
  // GET TODAY'S DATE
  // --------------------------------

  function getTodayDate() {
    const date = new Date();

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const today = getTodayDate();

  // --------------------------------
  // AUTHENTICATION + LOAD PAGE
  // --------------------------------

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      firebaseAuthentication,
      (user) => {
        if (!user) {
          router.replace("/");
          return;
        }

        loadAttendance();
      }
    );

    return () => unsubscribe();
  }, [router]);

  // --------------------------------
  // AUTOMATIC MIDNIGHT LOCK CHECK
  // --------------------------------

  useEffect(() => {
    if (!tuitionId) {
      return;
    }

    /*
      Check every 30 seconds.

      This means that if the page remains open,
      attendance will automatically lock shortly
      after midnight.
    */

    const midnightLockInterval = setInterval(() => {
      checkAutomaticMidnightLock();
    }, 30 * 1000);

    // Also check immediately when this component loads.
    checkAutomaticMidnightLock();

    return () => {
      clearInterval(midnightLockInterval);
    };
  }, [tuitionId, locked]);

  // --------------------------------
  // AUTOMATIC MIDNIGHT LOCK
  // --------------------------------

  async function checkAutomaticMidnightLock() {
    try {
      if (!tuitionId) {
        return;
      }

      /*
        We only perform the automatic lock when
        the current time is exactly in the first
        few minutes after midnight.

        This prevents today's attendance from
        being accidentally locked immediately
        when the page is opened during the day.
      */

      const now = new Date();

      const currentHour = now.getHours();

      const currentMinute = now.getMinutes();

      /*
        Automatic locking window:
        12:00 AM - 12:05 AM
      */

if (
  currentHour !== 23 ||
  currentMinute < 35 ||
  currentMinute > 40
) {
  return;
}

      const attendanceReference = doc(
        firebaseDatabase,
        "attendance",
        `${tuitionId}_${today}`
      );

      const attendanceSnapshot = await getDoc(
        attendanceReference
      );

      if (!attendanceSnapshot.exists()) {
        return;
      }

      const data = attendanceSnapshot.data();

      /*
        If already locked, nothing needs to be done.
      */

      if (data.locked === true) {
        setLocked(true);
        return;
      }

      /*
        Lock the attendance automatically.
      */

      await setDoc(
        attendanceReference,
        {
          tuitionId: tuitionId,

          date: today,

          records: data.records || {},

          locked: true,

          lockedAt: serverTimestamp(),

          updatedAt: serverTimestamp(),

          lockReason: "automatic-midnight-lock",
        },
        {
          merge: true,
        }
      );

      setLocked(true);

      setErrorMessage("");

      alert(
        "Today's attendance has been automatically locked at midnight."
      );

    } catch (error) {
      console.error(
        "Automatic midnight lock error:",
        error
      );
    }
  }

  // --------------------------------
  // LOAD STUDENTS + SAVED ATTENDANCE
  // --------------------------------

  async function loadAttendance() {
    try {
      setLoading(true);
      setErrorMessage("");

      const user =
        firebaseAuthentication.currentUser;

      if (!user) {
        router.replace("/");
        return;
      }

      // --------------------------------
      // GET STAFF DOCUMENT
      // --------------------------------

      const staffReference = doc(
        firebaseDatabase,
        "staffUsers",
        user.uid
      );

      const staffSnapshot =
        await getDoc(staffReference);

      if (!staffSnapshot.exists()) {
        throw new Error(
          "Staff account not found."
        );
      }

      const staffData =
        staffSnapshot.data();

      const currentTuitionId =
        staffData.tuitionId;

      if (!currentTuitionId) {
        throw new Error(
          "Tuition information not found."
        );
      }

      setTuitionId(currentTuitionId);

      // --------------------------------
      // GET STUDENTS
      // --------------------------------

      const studentsReference =
        collection(
          firebaseDatabase,
          "students"
        );

      const studentsSnapshot =
        await getDocs(
          studentsReference
        );

      const studentList: Student[] = [];

      studentsSnapshot.forEach(
        (studentDocument) => {
          const data =
            studentDocument.data();

          // Only show:
          // 1. Students belonging to this tuition
          // 2. Active students
          // 3. Students whose joining date has arrived

          if (
            data.tuitionId ===
              currentTuitionId &&
            data.active !== false &&
            data.joiningDate <= today
          ) {
            studentList.push({
              id: studentDocument.id,
              name: data.name,
              joiningDate:
                data.joiningDate,
              tuitionId:
                data.tuitionId,
              active:
                data.active,
            });
          }
        }
      );

      // Sort students alphabetically

      studentList.sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      setStudents(studentList);

      // --------------------------------
      // LOAD TODAY'S SAVED ATTENDANCE
      // --------------------------------

      const attendanceReference =
        doc(
          firebaseDatabase,
          "attendance",
          `${currentTuitionId}_${today}`
        );

      const attendanceSnapshot =
        await getDoc(
          attendanceReference
        );

      if (
        attendanceSnapshot.exists()
      ) {
        const data =
          attendanceSnapshot.data();

        const savedRecords =
          data.records || {};

        const convertedRecords: Record<
          string,
          AttendanceRecord
        > = {};

        /*
          Supports both:

          OLD FORMAT:

          studentId: "present"

          NEW FORMAT:

          studentId: {
            studentId,
            studentName,
            status
          }
        */

        Object.entries(
          savedRecords
        ).forEach(
          ([studentId, record]) => {

            // --------------------------------
            // OLD FORMAT
            // --------------------------------

            if (
              typeof record ===
              "string"
            ) {
              const student =
                studentList.find(
                  (item) =>
                    item.id ===
                    studentId
                );

              if (student) {
                convertedRecords[
                  studentId
                ] = {
                  studentId:
                    studentId,

                  studentName:
                    student.name,

                  status:
                    record as AttendanceStatus,
                };
              }
            }

            // --------------------------------
            // NEW FORMAT
            // --------------------------------

            else if (
              typeof record ===
                "object" &&
              record !== null
            ) {
              const savedRecord =
                record as {
                  studentId?: string;
                  studentName?: string;
                  status?: AttendanceStatus;
                };

              if (
                savedRecord.status ===
                  "present" ||
                savedRecord.status ===
                  "absent"
              ) {
                convertedRecords[
                  studentId
                ] = {
                  studentId:
                    savedRecord.studentId ||
                    studentId,

                  studentName:
                    savedRecord.studentName ||
                    "Unknown Student",

                  status:
                    savedRecord.status,
                };
              }
            }
          }
        );

        // Put saved attendance into state

        setAttendance(
          convertedRecords
        );

        // Load locked status

        setLocked(
          data.locked === true
        );
      } else {
        // No attendance has been saved for today

        setAttendance({});
        setLocked(false);
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

  // --------------------------------
  // MARK PRESENT / ABSENT
  // --------------------------------

  function markAttendance(
    student: Student,
    status: AttendanceStatus
  ) {
    if (locked) {
      return;
    }

    setAttendance(
      (previous) => ({
        ...previous,

        [student.id]: {
          studentId:
            student.id,

          studentName:
            student.name,

          status: status,
        },
      })
    );
  }

  // --------------------------------
  // SAVE ATTENDANCE
  // --------------------------------

  async function saveAttendance() {
    if (locked) {
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");

      if (!tuitionId) {
        throw new Error(
          "Tuition ID is missing."
        );
      }

      const attendanceReference =
        doc(
          firebaseDatabase,
          "attendance",
          `${tuitionId}_${today}`
        );

      // --------------------------------
      // SAVE TO FIRESTORE
      // --------------------------------

      await setDoc(
        attendanceReference,
        {
          tuitionId:
            tuitionId,

          date: today,

          records:
            attendance,

          locked: false,

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      alert(
        "Attendance saved successfully!"
      );

    } catch (error) {
      console.error(
        "Attendance save error:",
        error
      );

      setErrorMessage(
        "Unable to save attendance. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------
  // MANUAL LOCK ATTENDANCE
  // --------------------------------

  async function lockAttendance() {
    if (locked) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to lock today's attendance? You will not be able to change it."
      );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");

      if (!tuitionId) {
        throw new Error(
          "Tuition ID is missing."
        );
      }

      const attendanceReference =
        doc(
          firebaseDatabase,
          "attendance",
          `${tuitionId}_${today}`
        );

      await setDoc(
        attendanceReference,
        {
          tuitionId:
            tuitionId,

          date: today,

          records:
            attendance,

          locked: true,

          lockedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      setLocked(true);

      alert(
        "Attendance locked successfully!"
      );

    } catch (error) {
      console.error(
        "Lock attendance error:",
        error
      );

      setErrorMessage(
        "Unable to lock attendance."
      );
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------
  // LOADING SCREEN
  // --------------------------------

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">

        <div className="text-center">

          <p className="text-xl font-semibold text-purple-800">
            Loading attendance...
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

      <header className="bg-purple-900 px-6 py-6 text-white">

        <div className="mx-auto max-w-5xl">

          <button
            onClick={() =>
              router.push(
                "/dashboard"
              )
            }
            className="mb-4 text-sm text-purple-200 hover:text-white"
          >
            ← Back to Dashboard
          </button>

          <h1 className="text-3xl font-bold">
            Today's Attendance
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
            {students.length !==
            1
              ? "s"
              : ""}
          </div>

        </div>


        {/* STUDENTS */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b px-6 py-5">

            <h2 className="text-xl font-bold text-gray-900">
              Student Attendance
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Mark each student as present or absent.
            </p>

          </div>


          {students.length ===
          0 ? (

            <div className="p-10 text-center">

              <p className="text-lg font-semibold text-gray-700">
                No students found
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Add students before taking attendance.
              </p>

              <button
                onClick={() =>
                  router.push(
                    "/students/add"
                  )
                }
                className="mt-5 rounded-xl bg-purple-700 px-5 py-3 font-semibold text-white hover:bg-purple-800"
              >
                + Add Student
              </button>

            </div>

          ) : (

            <div className="divide-y">

              {students.map(
                (student) => {

                  const currentRecord =
                    attendance[
                      student.id
                    ];

                  const currentStatus =
                    currentRecord?.status;

                  return (

                    <div
                      key={
                        student.id
                      }
                      className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                    >

                      {/* STUDENT */}

                      <div>

                        <p className="text-lg font-semibold text-gray-900">
                          {
                            student.name
                          }
                        </p>

                        <p className="text-xs text-gray-500">
                          Joined:{" "}
                          {
                            student.joiningDate
                          }
                        </p>

                      </div>


                      {/* PRESENT / ABSENT */}

                      <div className="flex gap-3">

                        <button
                          disabled={
                            locked
                          }
                          onClick={() =>
                            markAttendance(
                              student,
                              "present"
                            )
                          }
                          className={`rounded-xl px-5 py-3 font-semibold transition ${
                            currentStatus ===
                            "present"
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
                          disabled={
                            locked
                          }
                          onClick={() =>
                            markAttendance(
                              student,
                              "absent"
                            )
                          }
                          className={`rounded-xl px-5 py-3 font-semibold transition ${
                            currentStatus ===
                            "absent"
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
                }
              )}

            </div>

          )}

        </div>


        {/* ACTION BUTTONS */}

        {students.length >
          0 && (

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">

            {/* SAVE */}

            <button
              onClick={
                saveAttendance
              }
              disabled={
                saving ||
                locked
              }
              className="rounded-xl bg-purple-700 px-6 py-3 font-semibold text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "💾 Save Attendance"}
            </button>


            {/* LOCK */}

            <button
              onClick={
                lockAttendance
              }
              disabled={
                saving ||
                locked
              }
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