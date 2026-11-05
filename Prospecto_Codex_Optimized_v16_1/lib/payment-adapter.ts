import 'server-only';
// A merchant adapter must verify signature, merchant identity, order/amount/currency,
// and authoritative settlement status before invoking apply_verified_settlement.
export type VerifiedSettlement={provider:string;eventId:string;paymentId:string;workspaceId:string;priceId:string;amountIdr:number;paidAt:string;cycleStart?:string;cycleEnd?:string;subscriptionId?:string};
export interface PaymentAdapter{
 createCheckout(input:{workspaceId:string;priceId:string;idempotencyKey:string}):Promise<{url:string;orderId:string}>;
 verifySettlement(request:Request):Promise<VerifiedSettlement>;
 requestPeriodEndCancellation(input:{workspaceId:string;subscriptionId:string;idempotencyKey:string}):Promise<{requestId:string}>;
}
// No credential or adapter is configured. Do not infer readiness from environment names.
export const paymentAdapter:PaymentAdapter|null=null;
