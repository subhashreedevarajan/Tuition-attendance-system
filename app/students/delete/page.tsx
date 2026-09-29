"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
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
};

export default function DeleteStudentPage() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

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

          const staffSnapshot =
            await getDoc(staffReference);

          if (!staffSnapshot.exists()) {
            throw new Error("STAFF_NOT_FOUND");
          }

          const staffData = staffSnapshot.data();
          const tuitionId = staffData.tuitionId;

          const studentsQuery = query(
            collection(firebaseDatabase, "students"),
            where("tuitionId", "==", tuitionId),
            where("active", "==", true)
          );

          const studentsSnapshot =
            await getDocs(studentsQuery);

          const studentList: Student[] =
            studentsSnapshot.docs.map((studentDocument) => {
              const data = studentDocument.data();

              return {
                id: studentDocument.id,
                name: data.name || "",
                parentName: data.parentName || "",
                parentEmail: data.parentEmail || "",
              };
            });

          studentList.sort((a, b) =>
            a.name.localeCompare(b.name)
          );

          setStudents(studentList);
        } catch (error) {
          console.error(error);
        }

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [router]);

  async function handleDeleteStudent(
    student: Student
  ) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${student.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);

      const studentReference = doc(
        firebaseDatabase,
        "students",
        student.id
      );

      /*
       * We use a soft delete.
       * This keeps the student's old attendance records.
       */
      await updateDoc(studentReference, {
        active: false,
      });

      setStudents((currentStudents) =>
        currentStudents.filter(
          (item) => item.id !== student.id
        )
      );

      alert(
        `${student.name} has been removed successfully.`
      );
    } catch (error) {
      console.error(error);

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
        <p className="text-gray-500">
          Loading students...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">

      {/* HEADER */}

      <header className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">

          <div>
            <h1 className="text-xl font-bold text-purple-900">
              📚 Tuition Attendance
            </h1>

            <p className="text-sm text-gray-500">
              Delete Student
            </p>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            ← Dashboard
          </button>

        </div>
      </header>


      {/* MAIN CONTENT */}

      <div className="mx-auto max-w-5xl px-6 py-8">

        <div className="rounded-2xl bg-white p-6 shadow-sm">

          <div className="mb-6">

            <h2 className="text-2xl font-bold text-gray-900">
              Delete Student
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Select a student to remove them from
              your active student list.
            </p>

          </div>


          {students.length === 0 ? (

            <div className="rounded-xl bg-gray-50 p-10 text-center">

              <p className="text-lg font-semibold text-gray-700">
                No active students
              </p>

              <p className="mt-2 text-sm text-gray-500">
                There are currently no students available
                to delete.
              </p>

            </div>

          ) : (

            <div className="space-y-3">

              {students.map((student) => (

                <div
                  key={student.id}
                  className="flex flex-col gap-4 rounded-xl border border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between"
                >

                  <div>

                    <h3 className="font-bold text-gray-900">
                      {student.name}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Parent: {student.parentName}
                    </p>

                    <p className="text-sm text-gray-500">
                      {student.parentEmail}
                    </p>

                  </div>

                  <button
                    onClick={() =>
                      handleDeleteStudent(student)
                    }
                    disabled={deleting}
                    className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    🗑️ Delete Student
                  </button>

                </div>

              ))}

            </div>

          )}

        </div>

      </div>

    </main>
  );
}