const INTERNATIONAL_PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

export const validateInternationalPhone = (value: string) => {
  if (!value || !value.trim()) {
    return "Phone number is required";
  }

  const normalized = value.replace(/\s+/g, "");

  if (!INTERNATIONAL_PHONE_REGEX.test(normalized)) {
    return "Enter a valid international phone number";
  }

  return "";
};
