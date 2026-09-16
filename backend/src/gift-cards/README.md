# Gift cards — parent integration contract

No outbound calls, email, maintenance job, schema generation or database writes on default GET.
Parent registers `GiftCardsModule`; modules needing checkout helpers import it. Own stateless
`IntegrationSecretsService` provider avoids coupling financial helpers to SystemSettingsModule.

## Secrets

Issue/reveal require explicitly configured `INTEGRATION_ENCRYPTION_KEY` (preferred) or `JWT_SECRET`
of at least 32 non-whitespace characters; the helper's primary-key precedence is preserved.
Missing/weak key, invalid ciphertext or hash mismatch => HTTP 503, never an empty code.
Back up and preserve the encryption key with the database. Changing JWT_SECRET invalidates encrypted
cards if a dedicated integration key was not configured. No ciphertext/hash/code in list/audit/log payloads.
32 hex digits are generated with `crypto.randomBytes(16)` (128 bits), displayed in four groups of eight.
`normalizeGiftCode` trims OUTER whitespace, rejects non-hex characters/interior whitespace, removes
hyphens, uppercases; `giftCodeHash` SHA-256 hashes that canonical representation. Manual codes must
have the same shape. Admin is responsible for entropy of explicitly supplied custom codes.

## Transaction helpers (Volta / Beauvoir)

All `tx` parameters are `Prisma.TransactionClient` supplied by parent. Order → GiftCard lock ordering.
No helper commits an outer transaction. Parent must not swallow errors inside the transaction.

- `preview(code: string, tx?: TransactionClient): Promise<{cardId: string, availableMinor: number,
  expiresAt: Date, maskedCode: string}>`: read-only, active/unexpired RUB card, available = balance − reserved.
  Must remain server-internal or map to a public masked preview; never return internal cardId to anonymous clients.
- `reserve(tx, orderId: string, code: string, amountMinor: number): Promise<{cardId, amountMinor, status}>`:
  positive integer kopecks, Order then GiftCard FOR UPDATE, reread available, increment reserved,
  create unique order redemption. Same order/card/amount already RESERVED/APPLIED returns unchanged;
  changed code/amount or RELEASED redemption => 409. One card per order.
- `release(tx, orderId)` / `apply(tx, orderId)`: same return or `null` if no redemption. Status CAS plus
  atomic decrement reserved; apply additionally decrements balance. Exact repetition no mutation;
  conflicting terminal status => 409. Applied value cannot be refunded by release. Parent needs a separate
  explicit financial refund workflow if refunding an already applied gift payment later.
  Existing valid reserved payment may settle after card expiry/deactivation; cannot create NEW reserves then.
- `issueForPaidOrder(tx, order): Promise<MaskedCard[]>`: INTERNAL trusted settlement only. Caller passes
  `{id, paymentStatus:'SUCCEEDED', currency:'RUB', items:[...]}` after persistent payment confirmation in the same TX.
  Helper locks/reloads Order with items/payments; actual DB paymentStatus must also be SUCCEEDED.
  Requires source WEB, snapshot digitalDelivery=true, exclusively gift items, zero discounts/bonus/gift
  payment/shipping, no promoCode, totalAmount=finalAmount=sum(face values), and an existing YOOKASSA
  Payment with status SUCCEEDED, transactionId, exact orderId/RUB amount. No manual/imported status issuance.
  Reads immutable
  `OrderItem.productType === 'GIFT_CARD'`, `giftCardValidityDays`, `price`, `total`, `quantity`, `id` only.
  Requires quantity 1–99, whole-RUB price 1–1,000,000, total = price × quantity, snapshot TTL 1–3650.
  Generates one card per `(sourceItemId, ordinal)`; repeat settlement reuses prior issued cards.
  Caller-mutated prices and live variant options are ignored. No raw codes in result. Root account id
  is stored only as opaque purchaserUserId scalar, no duplicate user relation.
- `revealForOrder(tx, orderId: string): Promise<Array<{id, code, maskedCode, faceValue, balance,
  expiresAt: Date, isActive: boolean}>>`: INTERNAL ONLY; parent FIRST authorizes exact order owner or
  valid guest access, then calls within its TX. Money strings have two decimals. No customer-facing
  route exists in this module. Parent should audit authorized reveal without including codes.

All money arguments ending Minor are kopecks; UI monetary fields are RUB strings with two decimals.
`giftCodeHash`, `normalizeGiftCode`, `giftMoneyMinor` exported from helpers for uniform checkout hashing.

## Admin API (Leibniz / Feynman)

JWT and current-role guard on every route. Financial routes: ADMIN, MANAGER_SALES, SUPERVISOR.
Product GET/PUT additionally permits CONTENT_MANAGER. No DELETE, no amount edits after issue.

- GET `/gift-cards/product`: `{id:null|uuid, slug:'gift-card', productType:'GIFT_CARD', nameRu,
  descriptionRu, denominations:number[], validityDays:number, isActive:boolean, imageUrl:string|null,
  variants:[{id,name,sku,price,options,isActive}]}`. Missing product returns inactive draft with
  [1000,3000,5000], TTL 365, NO DB write.
- PUT `/gift-cards/product`: `{nameRu, descriptionRu, denominations:number[], validityDays?:number,
  isActive:boolean, imageUrl?:string|null}`; denomination integers 1–1,000,000, 1–30 unique entries,
  default TTL 365 (range 1–3650). imageUrl HTTPS or root-relative; omission preserves it, null clears main image.
  Returns GET shape. Serializes product save with transaction advisory lock + existing product row lock.
  Single slug/SKU gift-card/GIFT-CARD; unrelated occupant => 409, never overwrite physical product.
  Variants options `{giftCard:true, nominal:number, validityDays:number}`; removed denominations deactivate
  existing variants, never delete historical variants. Digital stock remains 0, not artificial warehouse stock.
  Parent snapshots productType and TTL into OrderItem when creating order, excluding gift variants from
  physical stock/warehouse/1C/shipping, promo/loyalty eligibility as appropriate. A card cannot fund buying
  more gift cards unless parent explicitly accepts and secures that financial policy.
- GET `/gift-cards?page=1&limit=30&status=all|active|inactive|expired&search=...`:
  `{items:MaskedCard[], total, page, limit}`. Search ONLY maskedCode/label, case-insensitive, max 160 chars.
  No lookup/hash of plaintext search. MaskedCard contains id, maskedCode, faceValue/balance/reserved,
  currency, validityDays, issuedAt, expiresAt, isActive, revision, sourceOrderId, sourceItemId,
  ordinal, label, reason, createdAt. No codeHash, encryptedCode or purchaserUserId.
- POST `/gift-cards/generate`: `{code:string}`, stateless, no persistence until issue. No body required.
- `GiftCardsService.detail(id)` returns MaskedCard plus `redemptions:[{id,orderId,orderNumber,amount,status,
  createdAt,appliedAt,releasedAt}]`, latest first, money strings; no buyer/user PII or secrets. Separate
  history HTTP controller/route is owned by Beauvoir and wired by parent, NOT registered by core controller.
- POST `/gift-cards`: `{nominal:number, validityDays?:number, code?:string, label?:string|null,
  reason:string}`. Same nominal/TTL constraints; nonempty reason required, <=500. Returns MaskedCard,
  explicit admin reveal needed to see generated code. Duplicate normalized code => 409.
- PATCH `/gift-cards/:id`: `{revision:number, isActive?:boolean, expiresAt?:ISO_timestamp,
  label?:string|null}`. Row lock and revision CAS; stale => 409. ISO expiry with timezone, later than
  issuance. Cannot activate expired card; deactivating an expired card allowed.
- POST `/gift-cards/:id/reveal`: `{id, code, maskedCode}`. Requires working persistent key and durable
  audit before response; expiry/spent state does not prevent authorized admin reveal.

Manual issue, product save, financial update and admin reveal create safe audit records in the SAME TX.
Audit contains actor id and operation metadata, NOT freeform reason/label, plaintext, hashes or ciphertext.
Reveal endpoint responses must not be cached or sent to analytics by parent/UI. Never email plaintext
without encrypted durable MailOutbox payload and explicit parent workflow.

## Handoff checks

Only additive migration `20260916140000_gift_cards`; parent applies it and runs Prisma generate.
Tests use mocks only: exact money, normalization, key fail-closed, status idempotency, locked available
recheck, snapshot issuance, historical variant preservation, masked listings, admin permissions/audits.
No real cards/customer changes, no live integrations, no server/build/browser started by this worker.
