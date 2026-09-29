"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
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

export default function StudentsPage() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Delete confirmation
  const [studentToDelete, setStudentToDelete] =
    useState<Student | null>(null);

  const [deleting, setDeleting] = useState(false);

  // Load students
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      firebaseAuthentication,
      async (user) => {
        if (!user) {
          router.replace("/");
          return;
        }

        try {
          const staffReference = doc(
            firebaseDatabase,
            "staffUsers",
            user.uid
          );

          const staffSnapshot = await getDoc(
            staffReference
          );

          if (!staffSnapshot.exists()) {
            console.error("Staff account not found.");
            setLoading(false);
            return;
          }

          const staffData = staffSnapshot.data();

          const tuitionId = staffData.tuitionId;

          if (!tuitionId) {
            console.error("Tuition ID not found.");
            setLoading(false);
            return;
          }

          const studentsQuery = query(
            collection(firebaseDatabase, "students"),
            where("tuitionId", "==", tuitionId),
            where("active", "==", true)
          );

          const studentsSnapshot =
            await getDocs(studentsQuery);

          const studentList: Student[] =
            studentsSnapshot.docs.map(
              (studentDocument) => {
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
              }
            );

          // Sort students alphabetically
          studentList.sort((a, b) =>
            a.name.localeCompare(b.name)
          );

          setStudents(studentList);
        } catch (error) {
          console.error(
            "Error loading students:",
            error
          );
        }

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [router]);


  // ============================================
  // DELETE STUDENT
  // ============================================

  async function confirmDeleteStudent() {
    if (!studentToDelete) {
      return;
    }

    try {
      setDeleting(true);

      const studentReference = doc(
        firebaseDatabase,
        "students",
        studentToDelete.id
      );

      // Soft delete
      // We keep the student document and old
      // attendance history.
      await updateDoc(studentReference, {
        active: false,
      });

      // Remove from screen immediately
      setStudents((previousStudents) =>
        previousStudents.filter(
          (student) =>
            student.id !== studentToDelete.id
        )
      );

      // Close confirmation box
      setStudentToDelete(null);

    } catch (error) {
      console.error(
        "Error deleting student:",
        error
      );

      alert(
        "Unable to delete the student. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  }


  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-xl font-semibold text-purple-800">
            Loading students...
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Please wait.
          </p>
        </div>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-gray-100">

      {/* ============================================
          HEADER
      ============================================ */}

      <header className="border-b bg-white px-6 py-4 shadow-sm">

        <div className="mx-auto flex max-w-7xl items-center justify-between">

          <div>
            <h1 className="text-xl font-bold text-purple-900">
              📚 Tuition Attendance
            </h1>

            <p className="text-sm text-gray-500">
              Student Management
            </p>
          </div>

          <button
            onClick={() =>
              router.push("/dashboard")
            }
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            ← Dashboard
          </button>

        </div>

      </header>


      {/* ============================================
          MAIN CONTENT
      ============================================ */}

      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* TITLE */}

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              Students
            </h2>

            <p className="mt-1 text-gray-500">
              Manage students enrolled in your tuition.
            </p>
          </div>

          <button
            onClick={() =>
              router.push("/students/add")
            }
            className="rounded-xl bg-purple-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-purple-800"
          >
            + Add Student
          </button>

        </div>


        {/* ============================================
            STUDENT LIST
        ============================================ */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          {students.length === 0 ? (

            <div className="px-6 py-16 text-center">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-3xl">
                👨‍🎓
              </div>

              <h3 className="mt-4 text-xl font-bold text-gray-900">
                No students yet
              </h3>

              <p className="mt-2 text-gray-500">
                Add your first student to start taking attendance.
              </p>

              <button
                onClick={() =>
                  router.push("/students/add")
                }
                className="mt-6 rounded-xl bg-purple-700 px-5 py-3 font-semibold text-white hover:bg-purple-800"
              >
                + Add First Student
              </button>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full text-left">

                <thead className="border-b bg-gray-50">

                  <tr>

                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                      Student
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                      Parent
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                      Parent Email
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                      Joining Date
                    </th>

                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {students.map((student) => (

                    <tr
                      key={student.id}
                      className="border-b last:border-b-0 hover:bg-gray-50"
                    >

                      {/* STUDENT */}

                      <td className="px-6 py-5">

                        <p className="font-semibold text-gray-900">
                          {student.name}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {student.parentPhone}
                        </p>

                      </td>


                      {/* PARENT */}

                      <td className="px-6 py-5 text-gray-700">
                        {student.parentName}
                      </td>


                      {/* EMAIL */}

                      <td className="px-6 py-5 text-gray-700">
                        {student.parentEmail}
                      </td>


                      {/* JOINING DATE */}

                      <td className="px-6 py-5 text-gray-700">
                        {student.joiningDate}
                      </td>


                      {/* DELETE */}

                      <td className="px-6 py-5 text-right">

                        <button
                          onClick={() =>
                            setStudentToDelete(student)
                          }
                          className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                        >
                          🗑 Delete
                        </button>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </div>


      {/* ============================================
          DELETE CONFIRMATION MODAL
      ============================================ */}

      {studentToDelete && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">

          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">

            {/* WARNING ICON */}

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl">
              ⚠️
            </div>


            {/* TITLE */}

            <h3 className="mt-5 text-xl font-bold text-gray-900">
              Delete Student?
            </h3>


            {/* MESSAGE */}

            <p className="mt-3 text-gray-600">
              Are you sure you want to remove{" "}
              <span className="font-bold text-gray-900">
                {studentToDelete.name}
              </span>
              ?
            </p>

            <p className="mt-2 text-sm text-gray-500">
              This student will no longer appear in
              future attendance sheets. Their previous
              attendance history will be preserved.
            </p>


            {/* BUTTONS */}

            <div className="mt-6 flex gap-3">

              <button
                onClick={() =>
                  setStudentToDelete(null)
                }
                disabled={deleting}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>


              <button
                onClick={confirmDeleteStudent}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting
                  ? "Deleting..."
                  : "Delete Student"}
              </button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}