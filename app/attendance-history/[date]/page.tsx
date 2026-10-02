"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import {
  firebaseAuthentication,
  firebaseDatabase,
} from "@/lib/firebase-configuration";

type Student = {
  id: string;
  name: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  joiningDate: string;
  active: boolean;
};

type AttendanceRecord = {
  status: "present" | "absent";
};

export default function AttendanceDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const date = params.date as string;

  const [students, setStudents] = useState<Student[]>([]);

  const [attendanceRecords, setAttendanceRecords] =
    useState<Record<string, AttendanceRecord>>({});

  const [locked, setLocked] = useState(false);

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

        loadAttendanceDetails();
      }
    );

    return () => unsubscribe();
  }, [router, date]);

  async function loadAttendanceDetails() {
    try {
      setLoading(true);
      setErrorMessage("");

      const user = firebaseAuthentication.currentUser;

      if (!user) {
        router.replace("/");
        return;
      }

      // ----------------------------------------
      // GET STAFF INFORMATION
      // ----------------------------------------

      const staffReference = doc(
        firebaseDatabase,
        "staffUsers",
        user.uid
      );

      const staffSnapshot = await getDoc(
        staffReference
      );

      if (!staffSnapshot.exists()) {
        throw new Error("Staff account not found.");
      }

      const staffData = staffSnapshot.data();

      const tuitionId = staffData.tuitionId;

      if (!tuitionId) {
        throw new Error("Tuition ID not found.");
      }

      // ----------------------------------------
      // GET ATTENDANCE FOR THIS DATE
      // ----------------------------------------

      const attendanceReference = collection(
        firebaseDatabase,
        "attendance"
      );

      const attendanceQuery = query(
        attendanceReference,
        where("tuitionId", "==", tuitionId),
        where("date", "==", date)
      );

      const attendanceSnapshot = await getDocs(
        attendanceQuery
      );

      if (attendanceSnapshot.empty) {
        setErrorMessage(
          "No attendance record was found for this date."
        );

        setLoading(false);
        return;
      }

      const attendanceDocument =
        attendanceSnapshot.docs[0];

      const attendanceData =
        attendanceDocument.data();

      setLocked(
        attendanceData.locked === true
      );

      setAttendanceRecords(
        attendanceData.records || {}
      );

      // ----------------------------------------
      // GET STUDENTS
      // ----------------------------------------

      const studentsQuery = query(
        collection(firebaseDatabase, "students"),
        where("tuitionId", "==", tuitionId)
      );

      const studentsSnapshot =
        await getDocs(studentsQuery);

      const studentList: Student[] =
        studentsSnapshot.docs
          .map((studentDocument) => {
            const data =
              studentDocument.data();

            return {
              id: studentDocument.id,

              name: data.name || "",

              parentName:
                data.parentName || "",

              parentEmail:
                data.parentEmail || "",

              parentPhone:
                data.parentPhone || "",

              joiningDate:
                data.joiningDate || "",

              active:
                data.active !== false,
            };
          })
          .filter(
            (student) =>
              student.joiningDate <= date
          );

      studentList.sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      setStudents(studentList);

    } catch (error) {
      console.error(
        "Error loading attendance:",
        error
      );

      setErrorMessage(
        "Unable to load attendance details."
      );
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------
  // COUNT PRESENT
  // ----------------------------------------

  const presentCount = students.filter(
    (student) =>
      attendanceRecords[student.id]?.status ===
      "present"
  ).length;

  // ----------------------------------------
  // COUNT ABSENT
  // ----------------------------------------

  const absentCount = students.filter(
    (student) =>
      attendanceRecords[student.id]?.status ===
      "absent"
  ).length;

  // ----------------------------------------
  // LOADING
  // ----------------------------------------

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">

        <div className="text-center">

          <p className="text-xl font-semibold text-purple-800">
            Loading attendance...
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Please wait.
          </p>

        </div>

      </main>
    );
  }

  // ----------------------------------------
  // PAGE
  // ----------------------------------------

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
              Attendance Details
            </p>

          </div>

          <button
            onClick={() =>
              router.push("/attendance-history")
            }
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            ← History
          </button>

        </div>

      </header>


      {/* CONTENT */}

      <div className="mx-auto max-w-5xl px-6 py-8">

        {/* TITLE */}

        <div className="mb-8">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-3xl font-bold text-gray-900">
                Attendance
              </h2>

              <p className="mt-1 text-gray-500">
                {date}
              </p>

            </div>

            {locked ? (

              <div className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">
                🔒 Attendance Locked
              </div>

            ) : (

              <div className="rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                ● Attendance Editable
              </div>

            )}

          </div>

        </div>


        {/* ERROR */}

        {errorMessage && (

          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>

        )}


        {/* SUMMARY */}

        <div className="mb-6 grid gap-4 sm:grid-cols-2">

          <div className="rounded-2xl bg-green-50 p-6">

            <p className="text-sm font-medium text-green-700">
              Present
            </p>

            <p className="mt-2 text-4xl font-bold text-green-700">
              {presentCount}
            </p>

          </div>


          <div className="rounded-2xl bg-red-50 p-6">

            <p className="text-sm font-medium text-red-700">
              Absent
            </p>

            <p className="mt-2 text-4xl font-bold text-red-700">
              {absentCount}
            </p>

          </div>

        </div>


        {/* STUDENT LIST */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b px-6 py-5">

            <h3 className="text-xl font-bold text-gray-900">
              Student Attendance
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Attendance recorded for {date}
            </p>

          </div>


          {students.length === 0 ? (

            <div className="px-6 py-12 text-center">

              <p className="text-gray-500">
                No students found for this date.
              </p>

            </div>

          ) : (

            <div className="divide-y">

              {students.map((student) => {

                const status =
                  attendanceRecords[student.id]
                    ?.status;

                return (

                  <div
                    key={student.id}
                    className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                  >

                    {/* STUDENT */}

                    <div>

                      <p className="font-semibold text-gray-900">
                        {student.name}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Parent: {student.parentName}
                      </p>

                    </div>


                    {/* STATUS */}

                    <div>

                      {status === "present" && (

                        <span className="inline-flex rounded-xl bg-green-100 px-5 py-2 font-semibold text-green-700">
                          ✓ Present
                        </span>

                      )}

                      {status === "absent" && (

                        <span className="inline-flex rounded-xl bg-red-100 px-5 py-2 font-semibold text-red-700">
                          ✕ Absent
                        </span>

                      )}

                      {!status && (

                        <span className="inline-flex rounded-xl bg-gray-100 px-5 py-2 font-semibold text-gray-600">
                          Not Marked
                        </span>

                      )}

                    </div>

                  </div>

                );
              })}

            </div>

          )}

        </div>


        {/* BACK BUTTON */}

        <div className="mt-6">

          <button
            onClick={() =>
              router.push("/attendance-history")
            }
            className="rounded-xl bg-purple-700 px-5 py-3 font-semibold text-white hover:bg-purple-800"
          >
            ← Back to Attendance History
          </button>

        </div>

      </div>

    </main>
  );
}