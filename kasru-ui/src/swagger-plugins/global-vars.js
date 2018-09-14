export const API_HOST =
  process.env.NODE_ENV === "production"
    ? window.location.protocol + "//" + window.location.host
    : "//localhost:3003";

export const CLIENT_ID = window.GDRIVE_CLIENT_ID || '320957995205-qs9qa5ngvrn6jnabkijo6peb8cibbck5.apps.googleusercontent.com';
export const API_KEY = window.API_KEY || 'AIzaSyD6FnZ52QWuzVvq38pjEltq_FNkhsXCBvw';
export const PROJ_NUMBER = window.PROJ_NUMBER || '320957995205';

