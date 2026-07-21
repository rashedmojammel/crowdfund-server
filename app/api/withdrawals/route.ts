import { requireCreator, withAuthErrors } from "@/lib/auth";
import { connectDb, runInTransaction } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { Withdrawal } from "@/lib/models/Withdrawal";
import { createWithdrawalSchema } from "@/lib/validators/withdrawal";
import { getAvailableWithdrawalCredits } from "@/lib/withdrawals";
import { CREDITS_PER_USD_WITHDRAW } from "@/types";

// POST — creator requests a withdrawal. creatorEmail comes from the JWT,
// never the body. The availability check (approved contributions minus
// prior pending/paid withdrawals) and the insert run in one transaction,
// so two concurrent requests can't both book the same credits.
export const POST = withAuthErrors(async (req) => {
  const { email } = await requireCreator(req);
  const { credits, paymentSystem, accountNumber } =
    createWithdrawalSchema.parse(await readJsonBody(req));
  await connectDb();

  const withdrawal = await runInTransaction(async (session) => {
    const available = await getAvailableWithdrawalCredits(email, session);
    if (credits > available) {
      throw new ApiError(
        409,
        `Insufficient available credits: requested ${credits}, available ${available}`
      );
    }

    // USD amount is always derived server-side — never trust a body value.
    const amount = Math.round((credits / CREDITS_PER_USD_WITHDRAW) * 100) / 100;

    const [created] = await Withdrawal.create(
      [
        {
          creatorEmail: email,
          credits,
          amount,
          paymentSystem,
          accountNumber,
          status: "pending",
        },
      ],
      { session }
    );
    return created;
  });

  return Response.json({ withdrawal }, { status: 201 });
});
