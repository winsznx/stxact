;; receipt-anchor.clar
;; Optional Receipt Anchoring for Institutional-Grade Trust
;;
;; Provides on-chain proof that a receipt existed at a specific block height.
;; Enables third-party verification without trusting the proxy operator.
;; PRD Reference: Section 12 - Optional Receipt Anchoring

;; Error codes
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-CONFLICT (err u409))
(define-constant ERR-INSUFFICIENT-FEE (err u422))
(define-constant ERR-RATE-LIMIT (err u429))

;; Anchoring fee: 0.01 STX = 10,000 microSTX (to prevent spam)
(define-constant ANCHORING-FEE u10000)

;; Rate limit: max 100 anchors per principal per 1000 blocks (~7 days)
(define-constant RATE-LIMIT-WINDOW u1000)
(define-constant RATE-LIMIT-MAX u100)

;; Receipt anchors map
;; PRD Reference: Section 12 (lines 1902-1911)
(define-map receipt-anchors
  (buff 32)  ;; receipt-hash
  {
    receipt-id: (buff 36),
    seller: principal,
    anchored-at: uint,
    payment-txid: (buff 64)
  }
)

;; Rate limiting map: tracks anchoring activity per principal
(define-map anchor-rate-limits
  principal
  {
    window-start: uint,
    anchor-count: uint
  }
)

;; Treasury principal (receives anchoring fees)
(define-data-var treasury principal tx-sender)

;; Read-only: Get anchor by receipt hash
(define-read-only (get-anchor (receipt-hash (buff 32)))
  (ok (map-get? receipt-anchors receipt-hash))
)

;; Read-only: Check if receipt is anchored
(define-read-only (is-receipt-anchored (receipt-hash (buff 32)))
  (ok (is-some (map-get? receipt-anchors receipt-hash)))
)

;; Read-only: Get rate limit status for principal
(define-read-only (get-rate-limit-status (service-principal principal))
  (ok (map-get? anchor-rate-limits service-principal))
)

;; Helper: Check and update rate limit
(define-private (check-rate-limit (service-principal principal))
  (let (
    (current-limit (default-to
      { window-start: block-height, anchor-count: u0 }
      (map-get? anchor-rate-limits service-principal)))
    (window-start (get window-start current-limit))
    (anchor-count (get anchor-count current-limit))
  )
    ;; Check if we're in a new window
    (if (>= (- block-height window-start) RATE-LIMIT-WINDOW)
      ;; New window: reset counter
      (begin
        (map-set anchor-rate-limits service-principal {
          window-start: block-height,
          anchor-count: u1
        })
        true)
      ;; Same window: check if limit exceeded
      (if (< anchor-count RATE-LIMIT-MAX)
        ;; Within limit: increment counter
        (begin
          (map-set anchor-rate-limits service-principal {
            window-start: window-start,
            anchor-count: (+ anchor-count u1)
          })
          true)
        ;; Limit exceeded
        false))
  )
)

;; Public: Anchor a receipt hash on-chain
;; Requires small fee to prevent spam
(define-public (anchor-receipt
    (receipt-hash (buff 32))
    (receipt-id (buff 36))
    (seller principal)
    (payment-txid (buff 64)))
  (let (
    (caller tx-sender)
  )
    ;; Verify caller is the seller
    (asserts! (is-eq caller seller) (err u403))

    ;; Verify receipt not already anchored
    (asserts! (is-none (map-get? receipt-anchors receipt-hash)) ERR-CONFLICT)

    ;; Check rate limit
    (asserts! (check-rate-limit seller) ERR-RATE-LIMIT)

    ;; Collect anchoring fee
    (try! (stx-transfer? ANCHORING-FEE seller (var-get treasury)))

    ;; Store anchor
    (map-set receipt-anchors receipt-hash {
      receipt-id: receipt-id,
      seller: seller,
      anchored-at: block-height,
      payment-txid: payment-txid
    })

    (ok receipt-hash)
  )
)

;; Public: Update treasury principal (admin only)
(define-public (set-treasury (new-treasury principal))
  (begin
    ;; Only contract deployer can change treasury
    (asserts! (is-eq tx-sender contract-caller) (err u403))

    (var-set treasury new-treasury)

    (ok true)
  )
)

;; Read-only: Get current treasury
(define-read-only (get-treasury)
  (ok (var-get treasury))
)

;; Read-only: Verify receipt anchor matches expected data
(define-read-only (verify-anchor
    (receipt-hash (buff 32))
    (expected-seller principal)
    (expected-payment-txid (buff 64)))
  (match (map-get? receipt-anchors receipt-hash)
    anchor (ok (and
      (is-eq (get seller anchor) expected-seller)
      (is-eq (get payment-txid anchor) expected-payment-txid)))
    (ok false))
)
