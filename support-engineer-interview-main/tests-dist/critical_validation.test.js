"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// tests/critical_validation.test.ts
var import_node_assert = __toESM(require("node:assert"));

// lib/validation/phone.ts
var INTERNATIONAL_PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;
var validateInternationalPhone = (value) => {
  if (!value || !value.trim()) {
    return "Phone number is required";
  }
  const normalized = value.replace(/\s+/g, "");
  if (!INTERNATIONAL_PHONE_REGEX.test(normalized)) {
    return "Enter a valid international phone number";
  }
  return "";
};

// tests/critical_validation.test.ts
var validPhoneNumbers = [
  "+14155552671",
  "447911123456",
  "+918888888888"
];
var invalidPhoneNumbers = [
  "",
  "00000000",
  "123",
  "+0123456789",
  "++1415",
  "+14155552671999999"
];
for (const phone of validPhoneNumbers) {
  const result = validateInternationalPhone(phone);
  import_node_assert.default.strictEqual(result, "", `Expected ${phone} to be considered valid, got "${result}"`);
}
for (const phone of invalidPhoneNumbers) {
  const result = validateInternationalPhone(phone);
  import_node_assert.default.notStrictEqual(result, "", `Expected ${phone} to be rejected`);
}
console.log("Critical phone validation tests passed");
