import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, set, onValue, off, remove, get, update } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCLWDil-42mV0kmIIfn6SdFk4etp8FIrZQ",
  authDomain: "trab-sidney-5a02f.firebaseapp.com",
  databaseURL: "https://trab-sidney-5a02f-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "trab-sidney-5a02f",
  storageBucket: "trab-sidney-5a02f.appspot.com",
  messagingSenderId: "684833988242",
  appId: "1:684833988242:web:17319b9c5b69191289904b",
  measurementId: "G-WSPW1GHQTF"
};

const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);

export { ref, push, set, onValue, off, remove, get, update };

export default app;


