const COMMON_PASSWORDS = ["password", "12345678", "qwerty", "letmein", "welcome", "admin", "iloveyou"];

const hasUppercase = (value: string) => /[A-Z]/.test(value);
const hasLowercase = (value: string) => /[a-z]/.test(value);
const hasNumber = (value: string) => /\d/.test(value);
const hasSpecialChar = (value: string) => /[^A-Za-z0-9]/.test(value);

export const isCommonPassword = (value: string) => COMMON_PASSWORDS.includes(value.toLowerCase());

export const getPasswordComplexityError = (value: string) => {
  if (!hasUppercase(value)) {
    return "Password must contain at least one uppercase letter";
  }
  if (!hasLowercase(value)) {
    return "Password must contain at least one lowercase letter";
  }
  if (!hasNumber(value)) {
    return "Password must contain at least one number";
  }
  if (!hasSpecialChar(value)) {
    return "Password must contain at least one special character";
  }

  return "";
};
