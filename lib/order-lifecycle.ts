export const sellerStatuses=["awaiting_meetup","gold_received","verification","payout_pending","payout_completed","rejected"] as const;
export type SellerStatus=typeof sellerStatuses[number];
export function sellerTransitionError(previous:SellerStatus,next:SellerStatus,adminRole?:string|null){
  if(adminRole==="fulfillment"&&!(["awaiting_meetup","gold_received","verification"] as SellerStatus[]).includes(next))return"Fulfillment staff cannot authorize seller payouts or financial exceptions.";
  const previousIndex=sellerStatuses.indexOf(previous),nextIndex=sellerStatuses.indexOf(next);
  if(next==="rejected"&&previousIndex>=sellerStatuses.indexOf("gold_received"))return"A sell order cannot be rejected after customer gold is recorded as received.";
  if(next!=="rejected"&&nextIndex<previousIndex)return"Seller payout status cannot move backward.";
  return null;
}
