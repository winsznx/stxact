;; dispute-resolver.clar
;; Dispute Resolution and Refund Execution
;;
;; Manages dispute creation, resolution, and refund authorization execution.
;; PRD Reference: Section 11 - Disputes + Refund Rails

;; Error codes
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-CONFLICT (err u409))
(define-constant ERR-INVALID-SIGNATURE (err u401))
(define-constant ERR-UNAUTHORIZED (err u403))
(define-constant ERR-TIMESTAMP-TOO-OLD (err u408))
(define-constant ERR-INVALID-STATUS (err u409))
(define-constant ERR-EXPIRED (err u410))
(define-constant ERR-TRANSFER-FAILED (err u500))

;; Dispute window: 144 blocks (~24 hours on Stacks)
(define-constant DISPUTE-WINDOW-BLOCKS u144)

;; Resolution window: 1008 blocks (~7 days on Stacks)
(define-constant RESOLUTION-WINDOW-BLOCKS u1008)

;; Refund authorization timeout: 144 blocks (~24 hours)
(define-constant REFUND-AUTH-TIMEOUT-BLOCKS u144)

;; Disputes map
;; PRD Reference: Section 12 (lines 1884-1898)
(define-map disputes
  (buff 36)  ;; dispute-id (UUID as bytes)
  {
    receipt-id: (buff 36),
    buyer: principal,
    seller: principal,
    reason: (string-ascii 50),
    status: (string-ascii 20),
    created-at: uint,
    resolved-at: (optional uint),
    refund-amount: (optional uint),
    evidence-hash: (optional (buff 32))
  }
)

;; Read-only: Get dispute by ID
(define-read-only (get-dispute (dispute-id (buff 36)))
  (ok (map-get? disputes dispute-id))
)

;; Read-only: Get disputes for seller
(define-read-only (get-disputes-for-seller (seller principal))
  ;; Note: This would require an index map in production
  ;; For now, clients must query off-chain and verify on-chain
  (ok true)
)

;; Public: Create dispute
;; PRD Reference: Section 11 (lines 1554-1563)
;;
;; CRITICAL: This function is called by the trusted stxact proxy
;; The proxy verifies the buyer signature off-chain before calling this function
(define-public (create-dispute
    (dispute-id (buff 36))
    (receipt-id (buff 36))
    (buyer principal)
    (seller principal)
    (reason (string-ascii 50))
    (evidence-hash (optional (buff 32)))
    (receipt-timestamp uint))
  (begin
    ;; Verify no existing dispute for this receipt
    ;; Note: In production, we'd need a receipt-id -> dispute-id index
    (asserts! (is-none (map-get? disputes dispute-id)) ERR-CONFLICT)

    ;; Verify within dispute window (24 hours from receipt timestamp)
    ;; Note: receipt-timestamp is passed in, verified by proxy
    (asserts! (< (- block-height receipt-timestamp) DISPUTE-WINDOW-BLOCKS) ERR-EXPIRED)

    ;; Store dispute
    (map-set disputes dispute-id {
      receipt-id: receipt-id,
      buyer: buyer,
      seller: seller,
      reason: reason,
      status: "open",
      created-at: block-height,
      resolved-at: none,
      refund-amount: none,
      evidence-hash: evidence-hash
    })

    (ok dispute-id)
  )
)

;; Public: Execute refund
;; PRD Reference: Section 11 (lines 1596-1649)
;;
;; IMPLEMENTATION NOTE: This function uses Clarity's native tx-sender verification.
;; The seller calls this function directly via a blockchain transaction.
;; The blockchain itself verifies the seller's identity via transaction signature.
;; This is more secure than attempting to verify explicit ECDSA signatures on-chain,
;; which would require complex ASCII string formatting unavailable in Clarity.
;;
;; Off-chain refund authorization flow (for audit/compliance):
;; 1. Seller signs refund authorization message in TypeScript
;;    Canonical message: STXACT-REFUND:${dispute_id}:${receipt_id}:${refund_amount}:${buyer}:${seller}:${timestamp}
;; 2. Seller submits signed authorization to stxact API for logging/audit
;; 3. Seller calls this Clarity function directly (tx-sender = seller)
;; 4. Contract verifies tx-sender matches dispute's seller principal
(define-public (execute-refund
    (dispute-id (buff 36))
    (refund-amount uint)
    (buyer principal))
  (let (
    (dispute (unwrap! (map-get? disputes dispute-id) ERR-NOT-FOUND))
    (seller (get seller dispute))
    (buyer-balance-before (stx-get-balance buyer))
  )
    ;; Verify caller is the seller (blockchain signature verification via tx-sender)
    (asserts! (is-eq tx-sender seller) ERR-UNAUTHORIZED)

    ;; Verify dispute is open or acknowledged
    (asserts! (or (is-eq (get status dispute) "open")
                  (is-eq (get status dispute) "acknowledged"))
              ERR-INVALID-STATUS)

    ;; Verify buyer principal matches dispute
    (asserts! (is-eq buyer (get buyer dispute)) ERR-UNAUTHORIZED)

    ;; Verify refund amount is positive and reasonable
    (asserts! (> refund-amount u0) ERR-INVALID-SIGNATURE)

    ;; Execute token transfer: seller to buyer
    ;; Note: For STX, we use stx-transfer?
    ;; For SIP-010 tokens, caller must use contract-call? to token contract
    ;; with post-conditions for atomic verification
    (try! (stx-transfer? refund-amount seller buyer))

    ;; Post-condition: verify buyer balance increased by exact refund amount
    (asserts! (is-eq (stx-get-balance buyer) (+ buyer-balance-before refund-amount))
              ERR-TRANSFER-FAILED)

    ;; Update dispute state
    (map-set disputes dispute-id (merge dispute {
      status: "resolved",
      refund-amount: (some refund-amount),
      resolved-at: (some block-height)
    }))

    (ok true)
  )
)

;; Public: Mark dispute as acknowledged (seller viewed it)
(define-public (acknowledge-dispute (dispute-id (buff 36)))
  (let (
    (dispute (unwrap! (map-get? disputes dispute-id) ERR-NOT-FOUND))
    (caller tx-sender)
  )
    ;; Verify caller is the seller
    (asserts! (is-eq caller (get seller dispute)) ERR-UNAUTHORIZED)

    ;; Verify dispute is open
    (asserts! (is-eq (get status dispute) "open") ERR-INVALID-STATUS)

    ;; Update status
    (map-set disputes dispute-id (merge dispute {
      status: "acknowledged"
    }))

    (ok true)
  )
)

;; Public: Reject dispute with counter-proof
(define-public (reject-dispute
    (dispute-id (buff 36))
    (counter-proof-hash (buff 32)))
  (let (
    (dispute (unwrap! (map-get? disputes dispute-id) ERR-NOT-FOUND))
    (caller tx-sender)
  )
    ;; Verify caller is the seller
    (asserts! (is-eq caller (get seller dispute)) ERR-UNAUTHORIZED)

    ;; Verify dispute is open or acknowledged
    (asserts! (or (is-eq (get status dispute) "open")
                  (is-eq (get status dispute) "acknowledged"))
              ERR-INVALID-STATUS)

    ;; Update status and store counter-proof
    (map-set disputes dispute-id (merge dispute {
      status: "rejected",
      evidence-hash: (some counter-proof-hash),
      resolved-at: (some block-height)
    }))

    (ok true)
  )
)

;; Public: Mark dispute as expired (resolution window elapsed)
;; This is an off-chain advisory function; expiry enforcement is optional
(define-public (mark-dispute-expired (dispute-id (buff 36)))
  (let (
    (dispute (unwrap! (map-get? disputes dispute-id) ERR-NOT-FOUND))
    (created-at (get created-at dispute))
  )
    ;; Verify resolution window has elapsed
    (asserts! (> (- block-height created-at) RESOLUTION-WINDOW-BLOCKS) ERR-INVALID-STATUS)

    ;; Verify dispute is still open or acknowledged
    (asserts! (or (is-eq (get status dispute) "open")
                  (is-eq (get status dispute) "acknowledged"))
              ERR-INVALID-STATUS)

    ;; Update status
    (map-set disputes dispute-id (merge dispute {
      status: "expired",
      resolved-at: (some block-height)
    }))

    (ok true)
  )
)
