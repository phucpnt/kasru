export const API_HOST =
  process.env.NODE_ENV === "production"
    ? window.location.protocol + "//" + window.location.host
    : "//localhost:3003";

export const CLIENT_ID = window.GDRIVE_CLIENT_ID ||
  "382172903671-3tiglrm9djuaq74k605d2c44jcjlu36f.apps.googleusercontent.com"
  // "320957995205-qs9qa5ngvrn6jnabkijo6peb8cibbck5.apps.googleusercontent.com" ;
export const API_KEY = window.API_KEY || "AIzaSyB68DXcZB80YMDH3EfdnD2Reoy6S47YdBM" // "AIzaSyD6FnZ52QWuzVvq38pjEltq_FNkhsXCBvw";
export const PROJ_NUMBER = window.PROJ_NUMBER || "382172903671" // "320957995205";
