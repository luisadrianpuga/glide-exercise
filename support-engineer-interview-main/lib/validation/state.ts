const STATE_CODES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

export const isValidStateCode = (value: string) => STATE_CODES.includes(value.toUpperCase());

export const getStateValidationError = (value: string) => {
  if (!value) {
    return "State is required";
  }

  const normalized = value.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalized)) {
    return "Use 2-letter state code";
  }

  if (!isValidStateCode(normalized)) {
    return "Enter a valid U.S. state code";
  }

  return "";
};
