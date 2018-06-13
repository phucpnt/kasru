export const API_HOST =
  process.env.NODE_ENV === "production"
    ? window.location.protocol + "//" + window.location.host
    : "//localhost:3003";
