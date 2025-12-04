import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../trpc";
import { db } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getPasswordComplexityError, isCommonPassword } from "@/lib/validation/password";
import { getEmailValidationError } from "@/lib/validation/email";
import { encryptSSN } from "@/lib/security/ssn";
import { getStateValidationError } from "@/lib/validation/state";
import { validateInternationalPhone } from "@/lib/validation/phone";

const MINIMUM_SIGNUP_AGE = 18;

const calculateAge = (dob: Date, today: Date) => {
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
};

const emailSchema = z
  .string()
  .superRefine((value, ctx) => {
    const emailError = getEmailValidationError(value);
    if (emailError) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: emailError,
      });
    }
  })
  .transform((value) => value.trim().toLowerCase());

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .superRefine((value, ctx) => {
    if (isCommonPassword(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password is too common",
      });
    }

    const complexityError = getPasswordComplexityError(value);
    if (complexityError) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: complexityError,
      });
    }
  });

const dateOfBirthSchema = z.string().superRefine((value, ctx) => {
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Date of birth must be a valid date",
    });
    return;
  }

  const today = new Date();
  if (dob > today) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Date of birth cannot be in the future",
    });
  }

  if (calculateAge(dob, today) < MINIMUM_SIGNUP_AGE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "You must be at least 18 years old to sign up",
    });
  }
});

export const authRouter = router({
  signup: publicProcedure
    .input(
      z.object({
        email: emailSchema,
        password: passwordSchema,
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phoneNumber: z
          .string()
          .superRefine((value, ctx) => {
            const error = validateInternationalPhone(value);
            if (error) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: error,
              });
            }
          })
          .transform((value) => value.replace(/\s+/g, "")),
        dateOfBirth: dateOfBirthSchema,
        ssn: z.string().regex(/^\d{9}$/),
        address: z.string().min(1),
        city: z.string().min(1),
        state: z
          .string()
          .superRefine((value, ctx) => {
            const error = getStateValidationError(value);
            if (error) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: error,
              });
            }
          })
          .transform((value) => value.trim().toUpperCase()),
        zipCode: z.string().regex(/^\d{5}$/),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existingUser = await db.select().from(users).where(eq(users.email, input.email)).get();

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      await db.insert(users).values({
        ...input,
        password: hashedPassword,
        ssn: encryptSSN(input.ssn),
      });

      // Fetch the created user
      const user = await db.select().from(users).where(eq(users.email, input.email)).get();

      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user",
        });
      }

      // Create session
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "temporary-secret-for-interview", {
        expiresIn: "7d",
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.delete(sessions).where(eq(sessions.userId, user.id));

      const expiresBufferMinutes = Number(process.env.SESSION_BUFFER_MINUTES || "5");
      const bufferedExpiresAt = new Date(expiresAt);
      bufferedExpiresAt.setMinutes(bufferedExpiresAt.getMinutes() - expiresBufferMinutes);

      await db.insert(sessions).values({
        userId: user.id,
        token,
        expiresAt: bufferedExpiresAt.toISOString(),
      });

      // Set cookie
      if ("setHeader" in ctx.res) {
        ctx.res.setHeader("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      } else {
        (ctx.res as Headers).set("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      }

      const { password: _password, ssn: _ssn, ...safeUser } = user;

      return { user: safeUser, token };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: emailSchema,
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await db.select().from(users).where(eq(users.email, input.email)).get();

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      const validPassword = await bcrypt.compare(input.password, user.password);

      if (!validPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "temporary-secret-for-interview", {
        expiresIn: "7d",
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.delete(sessions).where(eq(sessions.userId, user.id));

      const expiresBufferMinutes = Number(process.env.SESSION_BUFFER_MINUTES || "5");
      const bufferedExpiresAt = new Date(expiresAt);
      bufferedExpiresAt.setMinutes(bufferedExpiresAt.getMinutes() - expiresBufferMinutes);

      await db.insert(sessions).values({
        userId: user.id,
        token,
        expiresAt: bufferedExpiresAt.toISOString(),
      });

      if ("setHeader" in ctx.res) {
        ctx.res.setHeader("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      } else {
        (ctx.res as Headers).set("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      }

      const { password: _password, ssn: _ssn, ...safeUser } = user;

      return { user: safeUser, token };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    const getSessionToken = () => {
      if ("cookies" in ctx.req) {
        return (ctx.req as any).cookies.session;
      }
      const cookieHeader = ctx.req.headers.get?.("cookie") || (ctx.req.headers as any).cookie;
      return cookieHeader
        ?.split("; ")
        .find((c: string) => c.startsWith("session="))
        ?.split("=")[1];
    };

    const token = getSessionToken();
    let deletedSession = false;

    if (token) {
      const deleted = await db
        .delete(sessions)
        .where(eq(sessions.token, token))
        .returning({ token: sessions.token });
      deletedSession = deleted.length > 0;
    }

    if ("setHeader" in ctx.res) {
      ctx.res.setHeader("Set-Cookie", `session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
    } else {
      (ctx.res as Headers).set("Set-Cookie", `session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
    }

    return {
      success: deletedSession,
      message: deletedSession ? "Logged out successfully" : "No active session to log out",
    };
  }),
});
