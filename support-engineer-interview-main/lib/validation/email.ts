const BASIC_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_SEGMENT_REGEX = /^[A-Za-z0-9-]+$/;

export const getEmailValidationError = (value: string) => {
  const email = value.trim();

  if (!BASIC_EMAIL_REGEX.test(email)) {
    return "Enter a valid email address";
  }

  if (email.includes("..")) {
    return "Email cannot contain consecutive dots";
  }

  const [localPart, domainPart] = email.split("@");

  if (!localPart || !domainPart) {
    return "Email must include a domain";
  }

  if (localPart.startsWith(".") || localPart.endsWith(".")) {
    return "Email local part cannot start or end with a dot";
  }

  const domainSegments = domainPart.split(".");
  if (domainSegments.length < 2) {
    return "Email domain must include a valid TLD";
  }

  for (const segment of domainSegments) {
    if (!DOMAIN_SEGMENT_REGEX.test(segment)) {
      return "Email domain contains invalid characters";
    }
    if (segment.startsWith("-") || segment.endsWith("-")) {
      return "Email domain segments cannot start or end with a hyphen";
    }
  }

  const tld = domainSegments[domainSegments.length - 1];
  if (!/^[A-Za-z]{2,}$/.test(tld)) {
    return "Email domain must end with a valid TLD";
  }

  if (domainPart.toLowerCase().endsWith(".con")) {
    return "Email domain seems misspelled (.con). Please correct it.";
  }

  return "";
};

export const isValidEmail = (value: string) => getEmailValidationError(value) === "";
