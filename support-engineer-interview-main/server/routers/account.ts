import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";
import { db } from "@/lib/db";
import { accounts, transactions } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

function generateAccountNumber(): string {
  return Math.floor(Math.random() * 1000000000)
    .toString()
    .padStart(10, "0");
}

const CARD_PATTERNS = [
  { name: "visa", regex: /^4\d{12}(\d{3})?(\d{3})?$/ },
  { name: "mastercard", regex: /^(5[1-5]\d{14}|2(2[2-9]\d{13}|[3-7]\d{14}))$/ },
  { name: "amex", regex: /^3[47]\d{13}$/ },
  { name: "discover", regex: /^6(?:011|5\d{2})\d{12}$/ },
  { name: "diners", regex: /^3(?:0[0-5]|[68]\d)\d{11}$/ },
  { name: "jcb", regex: /^(?:2131|1800|35\d{3})\d{11}$/ },
  { name: "unionpay", regex: /^62\d{14,17}$/ },
];

const passesLuhnCheck = (value: string) => {
  let sum = 0;
  let shouldDouble = false;

  for (let i = value.length - 1; i >= 0; i--) {
    let digit = parseInt(value[i], 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
};

const cardNumberSchema = z
  .string()
  .regex(/^\d{13,19}$/, "Card number must be 13-19 digits")
  .refine((value) => CARD_PATTERNS.some((pattern) => pattern.regex.test(value)), {
    message: "Unsupported card type",
  })
  .refine((value) => passesLuhnCheck(value), {
    message: "Invalid card number",
  });

const fundingSourceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("card"),
    accountNumber: cardNumberSchema,
    routingNumber: z.undefined().optional(),
  }),
  z.object({
    type: z.literal("bank"),
    accountNumber: z.string().regex(/^\d+$/, "Account number must contain only digits"),
    routingNumber: z
      .string()
      .transform((value) => value.trim())
      .regex(/^\d{9}$/, "Routing number must be 9 digits"),
  }),
]);

export const accountRouter = router({
  createAccount: protectedProcedure
    .input(
      z.object({
        accountType: z.enum(["checking", "savings"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user already has an account of this type
      const existingAccount = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.userId, ctx.user.id), eq(accounts.accountType, input.accountType)))
        .get();

      if (existingAccount) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `You already have a ${input.accountType} account`,
        });
      }

      let accountNumber;
      let isUnique = false;

      // Generate unique account number
      while (!isUnique) {
        accountNumber = generateAccountNumber();
        const existing = await db.select().from(accounts).where(eq(accounts.accountNumber, accountNumber)).get();
        isUnique = !existing;
      }

      await db.insert(accounts).values({
        userId: ctx.user.id,
        accountNumber: accountNumber!,
        accountType: input.accountType,
        balance: 0,
        status: "active",
      });

      const account = await db.select().from(accounts).where(eq(accounts.accountNumber, accountNumber!)).get();

      if (!account) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create account",
        });
      }

      return account;
    }),

  getAccounts: protectedProcedure.query(async ({ ctx }) => {
    const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, ctx.user.id));

    return userAccounts;
  }),

  fundAccount: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
        amount: z.number().gt(0, "Amount must be greater than zero"),
        fundingSource: fundingSourceSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const amount = parseFloat(input.amount.toString());

      // Verify account belongs to user
      const account = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, input.accountId), eq(accounts.userId, ctx.user.id)))
        .get();

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      if (account.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Account is not active",
        });
      }

      // Create transaction
      await db.insert(transactions).values({
        accountId: input.accountId,
        type: "deposit",
        amount,
        description: `Funding from ${input.fundingSource.type}`,
        status: "completed",
        processedAt: new Date().toISOString(),
      });

      const transaction = await db
        .select()
        .from(transactions)
        .where(eq(transactions.accountId, input.accountId))
        .orderBy(desc(transactions.createdAt))
        .limit(1)
        .get();

      if (!transaction) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to record transaction",
        });
      }

      // Update account balance
      const updatedAccount = await db
        .update(accounts)
        .set({
          balance: account.balance + amount,
        })
        .where(eq(accounts.id, input.accountId))
        .returning()
        .get();

      if (!updatedAccount) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update account balance",
        });
      }

      return {
        transaction,
        newBalance: updatedAccount.balance,
      };
    }),

  getTransactions: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Verify account belongs to user
      const account = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, input.accountId), eq(accounts.userId, ctx.user.id)))
        .get();

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      const accountTransactions = await db
        .select()
        .from(transactions)
        .where(eq(transactions.accountId, input.accountId))
        .orderBy(desc(transactions.createdAt));

      const enrichedTransactions = [];
      for (const transaction of accountTransactions) {
        const accountDetails = await db.select().from(accounts).where(eq(accounts.id, transaction.accountId)).get();

        enrichedTransactions.push({
          ...transaction,
          accountType: accountDetails?.accountType,
        });
      }

      return enrichedTransactions;
    }),
});
