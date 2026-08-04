import React, { memo } from "react";

function CourtPin() {
  return (
    <svg
      width="26"
      height="34"
      viewBox="0 0 26 34"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ display: "block" }}
    >
      <path
        d="M13 0.5C6.4 0.5 1 5.9 1 12.5c0 8.8 12 20.7 12 20.7s12-11.9 12-20.7C25 5.9 19.6 0.5 13 0.5z"
        fill="#0099f0"
        stroke="#ffffff"
        strokeWidth="2"
      />
      <circle cx="13" cy="12.4" r="4.4" fill="#ffffff" />
    </svg>
  );
}

export default memo(CourtPin);
