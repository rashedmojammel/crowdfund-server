import { requireCreator, verifyRequest, withAuthErrors } from "@/lib/auth";
import { connectDb, runInTransaction } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { Withdrawal, type WithdrawalDoc } from "@/lib/models/Withdrawal";
import { paginate } from "@/lib/pagination";
import {
  createWithdrawalSchema,
  listWithdrawalsQuerySchema,
} from "@/lib/validators/withdrawal";
import { getAvailableWithdrawalCredits } from "@/lib/withdrawals";
import { CREDITS_PER_USD_WITHDRAW } from "@/types";

// GET — ?mine=true: the requesting creator's own withdrawal history,
// scoped strictly to their JWT email and paginated.
export const GET = withAuthErrors(async (req) => {
  const user = await verifyRequest(req);
  const query = listWithdrawalsQuerySchema.parse(
    Object.fromEntries(new URL(req.url).searchParams)
  );
  await connectDb();

  if (query.mine) {
    if (user.role !== "creator") {
      throw new ApiError(403, "Forbidden for your role");
    }
    const { items, total } = await paginate<WithdrawalDoc>(
      Withdrawal,
      { creatorEmail: user.email },
      { createdAt: -1 },
      query.page,
      query.limit
    );
    return Response.json({
      items,
      total,
      page: query.page,
      limit: query.limit,
    });
  }

  // Default (no ?mine) — admin-only pending queue for the payout dashboard.
  if (user.role !== "admin") {
    throw new ApiError(403, "Forbidden for your role");
  }
  const { items, total } = await paginate<WithdrawalDoc>(
    Withdrawal,
    { status: "pending" },
    { createdAt: 1 },
    query.page,
    query.limit
  );
  return Response.json({ items, total, page: query.page, limit: query.limit });
});

// POST — creator requests a withdrawal. creatorEmail comes from the JWT,
// never the body. The availability check (approved contributions minus
// prior pending/approved withdrawals) and the insert run in one transaction,
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
