"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
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
  tuitionId: string;
  joiningDate: string;
  active: boolean;
  parentEmail: string;
};

type AttendanceRecord = {
  id: string;
  date: string;
  studentId: string;
  studentName: string;
  status: "present" | "absent";
  tuitionId: string;
};

export default function ReportsPage() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);

  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);

  const [selectedStudent, setSelectedStudent] = useState("");

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();

    return `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}`;
  });

  const [loading, setLoading] = useState(true);

  const [sendingReport, setSendingReport] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  // =====================================================
  // LOAD DATA
  // =====================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      firebaseAuthentication,
      async (user) => {
        if (!user) {
          router.replace("/");
          return;
        }

        try {
          setLoading(true);
          setErrorMessage("");

          // =================================================
          // GET STAFF INFORMATION
          // =================================================

          const staffQuery = query(
            collection(
              firebaseDatabase,
              "staffUsers"
            ),
            where(
              "__name__",
              "==",
              user.uid
            )
          );

          const staffSnapshot =
            await getDocs(staffQuery);

          if (staffSnapshot.empty) {
            throw new Error(
              "Staff information not found."
            );
          }

          const staffData =
            staffSnapshot.docs[0].data();

          const tuitionId =
            staffData.tuitionId;

          if (!tuitionId) {
            throw new Error(
              "Tuition ID not found."
            );
          }

          // =================================================
          // LOAD ACTIVE STUDENTS
          // =================================================

          const studentsQuery = query(
            collection(
              firebaseDatabase,
              "students"
            ),
            where(
              "tuitionId",
              "==",
              tuitionId
            ),
            where(
              "active",
              "==",
              true
            )
          );

          const studentsSnapshot =
            await getDocs(
              studentsQuery
            );

          const studentList: Student[] =
            studentsSnapshot.docs.map(
              (studentDoc) => {
                const data =
                  studentDoc.data();

                return {
                  id: studentDoc.id,

                  name:
                    data.name || "",

                  tuitionId:
                    data.tuitionId || "",

                  joiningDate:
                    data.joiningDate || "",

                  active:
                    data.active === true,

                  parentEmail:
                    data.parentEmail || "",
                };
              }
            );

          studentList.sort((a, b) =>
            a.name.localeCompare(b.name)
          );

          setStudents(studentList);

          // =================================================
          // LOAD ATTENDANCE
          // =================================================
          //
          // IMPORTANT:
          //
          // Your Firebase structure is:
          //
          // attendance
          //    └── tuitionId_date
          //          ├── tuitionId
          //          ├── date
          //          ├── locked
          //          └── records
          //                 ├── studentId
          //                 │      ├── studentId
          //                 │      ├── studentName
          //                 │      └── status
          //                 │
          //                 └── studentId
          //
          // We must read the records object.
          // =================================================

          const attendanceQuery =
            query(
              collection(
                firebaseDatabase,
                "attendance"
              ),
              where(
                "tuitionId",
                "==",
                tuitionId
              )
            );

          const attendanceSnapshot =
            await getDocs(
              attendanceQuery
            );

          const attendanceList: AttendanceRecord[] =
            [];

          attendanceSnapshot.docs.forEach(
            (attendanceDoc) => {
              const data =
                attendanceDoc.data();

              const date =
                data.date || "";

              const records =
                data.records || {};

              // ---------------------------------------------
              // READ EACH STUDENT'S RECORD
              // ---------------------------------------------

              Object.entries(records).forEach(
                ([studentId, recordData]) => {

                  // -----------------------------------------
                  // OLD FORMAT
                  //
                  // studentId: "present"
                  // -----------------------------------------

                  if (
                    typeof recordData ===
                    "string"
                  ) {
                    if (
                      recordData !==
                        "present" &&
                      recordData !==
                        "absent"
                    ) {
                      return;
                    }

                    const student =
                      studentList.find(
                        (item) =>
                          item.id ===
                          studentId
                      );

                    attendanceList.push({
                      id: `${attendanceDoc.id}_${studentId}`,

                      date: date,

                      studentId:
                        studentId,

                      studentName:
                        student?.name ||
                        "",

                      status:
                        recordData as
                          | "present"
                          | "absent",

                      tuitionId:
                        tuitionId,
                    });

                    return;
                  }

                  // -----------------------------------------
                  // NEW FORMAT
                  //
                  // studentId: {
                  //   studentId,
                  //   studentName,
                  //   status
                  // }
                  // -----------------------------------------

                  if (
                    typeof recordData ===
                      "object" &&
                    recordData !== null
                  ) {
                    const record =
                      recordData as {
                        studentId?: string;
                        studentName?: string;
                        status?: string;
                      };

                    if (
                      record.status !==
                        "present" &&
                      record.status !==
                        "absent"
                    ) {
                      return;
                    }

                    const student =
                      studentList.find(
                        (item) =>
                          item.id ===
                          studentId
                      );

                    attendanceList.push({
                      id: `${attendanceDoc.id}_${studentId}`,

                      date: date,

                      studentId:
                        record.studentId ||
                        studentId,

                      studentName:
                        record.studentName ||
                        student?.name ||
                        "",

                      status:
                        record.status as
                          | "present"
                          | "absent",

                      tuitionId:
                        tuitionId,
                    });
                  }
                }
              );
            }
          );

          setAttendanceRecords(
            attendanceList
          );

          console.log(
            "Attendance loaded:",
            attendanceList
          );

        } catch (error) {
          console.error(error);

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load attendance reports."
          );
        } finally {
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [router]);

  // =====================================================
  // SELECTED STUDENT
  // =====================================================

  const student = students.find(
    (item) =>
      item.id === selectedStudent
  );

  // =====================================================
  // FILTER ATTENDANCE
  // =====================================================

  const filteredAttendance =
    attendanceRecords.filter(
      (record) => {

        if (!selectedStudent) {
          return false;
        }

        if (
          record.studentId !==
          selectedStudent
        ) {
          return false;
        }

        if (
          !record.date.startsWith(
            selectedMonth
          )
        ) {
          return false;
        }

        return true;
      }
    );

  // =====================================================
  // STATISTICS
  // =====================================================

  const totalClasses =
    filteredAttendance.length;

  const presentCount =
    filteredAttendance.filter(
      (record) =>
        record.status === "present"
    ).length;

  const absentCount =
    filteredAttendance.filter(
      (record) =>
        record.status === "absent"
    ).length;

  const attendancePercentage =
    totalClasses > 0
      ? Math.round(
          (presentCount /
            totalClasses) *
            100
        )
      : 0;

  // =====================================================
  // SEND MONTHLY REPORT
  // =====================================================

  async function sendMonthlyReport() {
    if (!student) {
      setErrorMessage(
        "Please select a student."
      );

      return;
    }

    if (!student.parentEmail) {
      setErrorMessage(
        "Parent email is not available for this student."
      );

      return;
    }

    try {
      setSendingReport(true);

      setErrorMessage("");
      setSuccessMessage("");

      // =================================================
      // CALL EXISTING RESEND API
      // =================================================

      const response = await fetch(
        "/api/send-attendance-email",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            type: "monthly-report",

            parentEmail:
              student.parentEmail,

            studentName:
              student.name,

            month:
              selectedMonth,

            totalClasses:
              totalClasses,

            presentCount:
              presentCount,

            absentCount:
              absentCount,

            attendancePercentage:
              attendancePercentage,

            attendanceDetails:
              filteredAttendance
                .slice()
                .sort((a, b) =>
                  a.date.localeCompare(
                    b.date
                  )
                )
                .map((record) => ({
                  date:
                    record.date,

                  status:
                    record.status,
                })),
          }),
        }
      );

      // =================================================
      // READ RESPONSE SAFELY
      // =================================================

      const responseText =
        await response.text();

      let result: {
        success?: boolean;
        message?: string;
      } = {};

      try {
        result = responseText
          ? JSON.parse(
              responseText
            )
          : {};
      } catch {
        console.error(
          "Invalid API response:",
          responseText
        );

        throw new Error(
          "The email server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Unable to send monthly report."
        );
      }

      if (!result.success) {
        throw new Error(
          result.message ||
            "Unable to send monthly report."
        );
      }

      // =================================================
      // SUCCESS
      // =================================================

      setSuccessMessage(
        `Monthly attendance report sent successfully to ${student.parentEmail}.`
      );

    } catch (error) {
      console.error(
        "Monthly report error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to send monthly attendance report."
      );

    } finally {
      setSendingReport(false);
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">

        <p className="text-gray-500">
          Loading attendance reports...
        </p>

      </main>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <main className="min-h-screen bg-gray-100">

      {/* HEADER */}

      <header className="border-b bg-white px-6 py-4 shadow-sm">

        <div className="mx-auto flex max-w-6xl items-center justify-between">

          <div>

            <h1 className="text-xl font-bold text-purple-900">
              📚 Tuition Attendance
            </h1>

            <p className="text-sm text-gray-500">
              Attendance Reports
            </p>

          </div>

          <button
            onClick={() =>
              router.push(
                "/dashboard"
              )
            }
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            ← Dashboard
          </button>

        </div>

      </header>

      {/* MAIN */}

      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* TITLE */}

        <div className="mb-8">

          <h2 className="text-3xl font-bold text-gray-900">
            Attendance Reports 📊
          </h2>

          <p className="mt-1 text-gray-500">
            View student attendance
            statistics by month.
          </p>

        </div>

        {/* ERROR */}

        {errorMessage && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {/* SUCCESS */}

        {successMessage && (
          <div className="mb-6 rounded-xl bg-green-50 p-4 text-sm text-green-700">
            ✓ {successMessage}
          </div>
        )}

        {/* FILTERS */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <h3 className="text-lg font-bold text-gray-900">
            Report Filters
          </h3>

          <div className="mt-5 grid gap-5 md:grid-cols-2">

            {/* STUDENT */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Select Student
              </label>

              <select
                value={
                  selectedStudent
                }
                onChange={(event) => {

                  setSelectedStudent(
                    event.target.value
                  );

                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
              >

                <option value="">
                  Select a student
                </option>

                {students.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* MONTH */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Select Month
              </label>

              <input
                type="month"
                value={
                  selectedMonth
                }
                onChange={(event) => {

                  setSelectedMonth(
                    event.target.value
                  );

                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
              />

            </div>

          </div>

        </section>

        {/* NO STUDENT */}

        {!selectedStudent && (
          <section className="mt-6 rounded-2xl bg-white p-10 text-center shadow-sm">

            <div className="text-5xl">
              👨‍🎓
            </div>

            <h3 className="mt-4 text-xl font-bold text-gray-900">
              Select a student
            </h3>

            <p className="mt-2 text-gray-500">
              Choose a student above
              to view their attendance
              report.
            </p>

          </section>
        )}

        {/* REPORT */}

        {selectedStudent && (
          <>

            {/* STUDENT INFO + CIRCLE */}

            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">

              <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">

                {/* STUDENT INFORMATION */}

                <div>

                  <p className="text-sm text-gray-500">
                    Attendance Report
                  </p>

                  <h3 className="mt-1 text-2xl font-bold text-gray-900">
                    {student?.name}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    {selectedMonth}
                  </p>

                  {student?.parentEmail && (
                    <p className="mt-2 text-sm text-gray-500">
                      Parent Email:{" "}
                      {student.parentEmail}
                    </p>
                  )}

                </div>

                {/* CIRCULAR ATTENDANCE */}

                <div className="flex items-center justify-center">

                  <div className="relative h-36 w-36">

                    <svg
                      className="h-36 w-36 -rotate-90"
                      viewBox="0 0 120 120"
                    >

                      {/* BACKGROUND CIRCLE */}

                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="12"
                      />

                      {/* PROGRESS CIRCLE */}

                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="#7e22ce"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={
                          2 *
                          Math.PI *
                          50
                        }
                        strokeDashoffset={
                          2 *
                          Math.PI *
                          50 *
                          (1 -
                            attendancePercentage /
                              100)
                        }
                      />

                    </svg>

                    {/* PERCENTAGE */}

                    <div className="absolute inset-0 flex flex-col items-center justify-center">

                      <span className="text-3xl font-bold text-purple-800">
                        {
                          attendancePercentage
                        }%
                      </span>

                      <span className="text-xs text-gray-500">
                        Attendance
                      </span>

                    </div>

                  </div>

                </div>

              </div>

            </section>

            {/* STATISTICS */}

            <section className="mt-6 grid gap-5 sm:grid-cols-3">

              {/* TOTAL */}

              <div className="rounded-2xl bg-white p-6 shadow-sm">

                <p className="text-sm font-medium text-gray-500">
                  Total Classes
                </p>

                <p className="mt-3 text-4xl font-bold text-gray-900">
                  {totalClasses}
                </p>

              </div>

              {/* PRESENT */}

              <div className="rounded-2xl bg-white p-6 shadow-sm">

                <p className="text-sm font-medium text-gray-500">
                  Present
                </p>

                <p className="mt-3 text-4xl font-bold text-green-600">
                  {presentCount}
                </p>

              </div>

              {/* ABSENT */}

              <div className="rounded-2xl bg-white p-6 shadow-sm">

                <p className="text-sm font-medium text-gray-500">
                  Absent
                </p>

                <p className="mt-3 text-4xl font-bold text-red-600">
                  {absentCount}
                </p>

              </div>

            </section>

            {/* SEND MONTHLY REPORT */}

            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">

              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                <div>

                  <h3 className="text-xl font-bold text-gray-900">
                    Monthly Report
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Send this student's
                    attendance report to
                    the parent by email.
                  </p>

                  {!student?.parentEmail && (
                    <p className="mt-2 text-sm font-semibold text-red-600">
                      ⚠ Parent email is
                      not available.
                    </p>
                  )}

                </div>

                <button
                  onClick={
                    sendMonthlyReport
                  }
                  disabled={
                    sendingReport ||
                    !student?.parentEmail
                  }
                  className="rounded-xl bg-purple-700 px-6 py-3 font-semibold text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {sendingReport
                    ? "📧 Sending..."
                    : "📧 Send Monthly Report"}

                </button>

              </div>

            </section>

            {/* ATTENDANCE DETAILS */}

            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">

              <h3 className="text-xl font-bold text-gray-900">
                Attendance Details
              </h3>

              {filteredAttendance.length ===
              0 ? (

                <div className="py-10 text-center">

                  <p className="text-gray-500">
                    No attendance records
                    found for this month.
                  </p>

                </div>

              ) : (

                <div className="mt-5 space-y-3">

                  {filteredAttendance
                    .slice()
                    .sort((a, b) =>
                      a.date.localeCompare(
                        b.date
                      )
                    )
                    .map((record) => (

                      <div
                        key={record.id}
                        className="flex items-center justify-between rounded-xl border border-gray-200 p-4"
                      >

                        <div>

                          <p className="font-semibold text-gray-900">
                            {record.date}
                          </p>

                        </div>

                        {record.status ===
                        "present" ? (

                          <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                            ✓ Present
                          </span>

                        ) : (

                          <span className="rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700">
                            ✕ Absent
                          </span>

                        )}

                      </div>

                    ))}

                </div>

              )}

            </section>

          </>
        )}

      </div>

    </main>
  );
}