import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import {
  firebaseAuthentication,
  firebaseDatabase,
} from "./firebase-configuration";


// ======================================================
// CREATE NEW TUITION ACCOUNT
// ======================================================

export async function createTuitionAccount(data: {
  tuitionName: string;
  staffName: string;
  email: string;
  password: string;
}) {
  const {
    tuitionName,
    staffName,
    email,
    password,
  } = data;

  // Check whether this tuition name already exists
  const tuitionQuery = query(
    collection(firebaseDatabase, "tuitionCenters"),
    where("name", "==", tuitionName)
  );

  const existingTuition = await getDocs(tuitionQuery);

  if (!existingTuition.empty) {
    throw new Error("TUITION_ALREADY_EXISTS");
  }

  // Create the user's Firebase Authentication account
  const userCredential =
    await createUserWithEmailAndPassword(
      firebaseAuthentication,
      email,
      password
    );

  const user = userCredential.user;

  // Create a new tuition document
  const tuitionReference = doc(
    collection(firebaseDatabase, "tuitionCenters")
  );

  await setDoc(tuitionReference, {
    name: tuitionName,
    active: true,
    createdAt: serverTimestamp(),
  });

  // Create staff document using Firebase UID
  const staffReference = doc(
    firebaseDatabase,
    "staffUsers",
    user.uid
  );

  await setDoc(staffReference, {
    name: staffName,
    email: email,
    tuitionId: tuitionReference.id,
    role: "admin",
    active: true,
    createdAt: serverTimestamp(),
  });

  return {
    user,
    tuitionId: tuitionReference.id,
  };
}


// ======================================================
// LOGIN EXISTING USER
// ======================================================

export async function loginStaff(
  email: string,
  password: string
) {
  const userCredential =
    await signInWithEmailAndPassword(
      firebaseAuthentication,
      email,
      password
    );

  return userCredential.user;
}