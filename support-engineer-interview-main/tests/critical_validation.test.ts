import assert from "node:assert";
import { validateInternationalPhone } from "../lib/validation/phone";

const validPhoneNumbers = [
  "+14155552671",
  "447911123456",
  "+918888888888",
];

const invalidPhoneNumbers = [
  "",
  "00000000",
  "123",
  "+0123456789",
  "++1415",
  "+14155552671999999",
];

for (const phone of validPhoneNumbers) {
  const result = validateInternationalPhone(phone);
  assert.strictEqual(result, "", `Expected ${phone} to be considered valid, got "${result}"`);
}

for (const phone of invalidPhoneNumbers) {
  const result = validateInternationalPhone(phone);
  assert.notStrictEqual(result, "", `Expected ${phone} to be rejected`);
}

console.log("Critical phone validation tests passed");
