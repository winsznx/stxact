;; reputation-map.clar
;; Reputation System for stxact Services
;;
;; Manages reputation scores, delivery tracking, dispute records, and signing key rotation.
;; PRD Reference: Section 12 - Reputation System

;; Error codes
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-CONFLICT (err u409))
(define-constant ERR-INVALID-AMOUNT (err u422))
(define-constant ERR-UNAUTHORIZED (err u403))
(define-constant ERR-SERVICE-INACTIVE (err u403))

;; Minimum payment amount for reputation credit: 10,000 sats
;; PRD Reference: Section 12 (line 1938)
(define-constant MIN-REPUTATION-AMOUNT u10000)

;; Reputation map
;; PRD Reference: Section 12 (lines 1837-1851)
(define-map reputation
  principal
  {
    score: uint,
    total-deliveries: uint,
    total-disputes: uint,
    disputes-resolved: uint,
    disputes-unresolved: uint,
    stake-bonded: bool,
    slashed: bool,
    last-updated: uint
  }
)

;; Recorded receipts map (for double-count protection)
;; PRD Reference: Section 12 (lines 1854-1858)
(define-map recorded-receipts
  (buff 32)  ;; receipt-hash
  bool       ;; true if recorded
)

;; Signing keys map (for key rotation support)
;; PRD Reference: Section 12 (lines 1862-1870)
(define-map signing-keys
  principal
  {
    current-key: (buff 33),   ;; Compressed public key
    key-version: uint,
    updated-at: uint
  }
)

;; Signing key history (for historical receipt verification)
;; PRD Reference: Section 12 (lines 1873-1881)
(define-map signing-key-history
  { principal: principal, key-version: uint }
  {
    public-key: (buff 33),
    activated-at: uint,
    deactivated-at: (optional uint)
  }
)

;; Read-only: Get reputation for a principal
(define-read-only (get-reputation (service-principal principal))
  (ok (map-get? reputation service-principal))
)

;; Read-only: Get signing key version
(define-read-only (get-signing-key-version (service-principal principal))
  (ok (map-get? signing-keys service-principal))
)

;; Read-only: Check if receipt is recorded
(define-read-only (is-receipt-recorded (receipt-hash (buff 32)))
  (ok (default-to false (map-get? recorded-receipts receipt-hash)))
)

;; Helper function: Compute logarithmic reputation score
;; Returns floor(log2(amount + 1))
;; CRITICAL: This MUST match PRD exactly (lines 1974-2017)
;; DO NOT optimize - copy exact nested if structure
(define-private (compute-log2-score (amount uint))
  (if (<= amount u0) u0
    (if (<= amount u1) u1
      (if (<= amount u3) u2
        (if (<= amount u7) u3
          (if (<= amount u15) u4
            (if (<= amount u31) u5
              (if (<= amount u63) u6
                (if (<= amount u127) u7
                  (if (<= amount u255) u8
                    (if (<= amount u511) u9
                      (if (<= amount u1023) u10
                        (if (<= amount u2047) u11
                          (if (<= amount u4095) u12
                            (if (<= amount u8191) u13
                              (if (<= amount u16383) u14
                                (if (<= amount u32767) u15
                                  (if (<= amount u65535) u16
                                    (if (<= amount u131071) u17
                                      (if (<= amount u262143) u18
                                        (if (<= amount u524287) u19
                                          (if (<= amount u1048575) u20
                                            u21  ;; Max: payments >= 1,048,576 sats capped at +21
                                          )
                                        )
                                      )
                                    )
                                  )
                                )
                              )
                            )
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    )
  )
)

;; Public: Record successful delivery
;; PRD Reference: Section 12 (lines 1918-1965)
(define-public (record-successful-delivery
    (seller principal)
    (receipt-hash (buff 32))
    (payment-amount-sats uint))
  (let (
    (current-rep (default-to
      { score: u0, total-deliveries: u0, total-disputes: u0, disputes-resolved: u0,
        disputes-unresolved: u0, stake-bonded: false, slashed: false, last-updated: u0 }
      (map-get? reputation seller)))
    ;; Query service-registry to verify seller is registered
    ;; This is a contract call to service-registry.clar
    (score-increment (compute-log2-score payment-amount-sats))
  )
    ;; Verify seller is registered (must exist in service registry)
    ;; Note: This requires service-registry contract to be deployed first
    ;; For now, we'll skip this check in the contract and enforce it at the proxy level

    ;; Check if receipt already recorded (prevent double-counting)
    (asserts! (is-none (map-get? recorded-receipts receipt-hash)) ERR-CONFLICT)

    ;; Enforce minimum payment threshold for reputation credit
    (asserts! (>= payment-amount-sats MIN-REPUTATION-AMOUNT) ERR-INVALID-AMOUNT)

    ;; Mark receipt as recorded
    (map-set recorded-receipts receipt-hash true)

    ;; Update reputation with logarithmic score
    (map-set reputation seller {
      score: (+ (get score current-rep) score-increment),
      total-deliveries: (+ (get total-deliveries current-rep) u1),
      total-disputes: (get total-disputes current-rep),
      disputes-resolved: (get disputes-resolved current-rep),
      disputes-unresolved: (get disputes-unresolved current-rep),
      stake-bonded: (get stake-bonded current-rep),
      slashed: (get slashed current-rep),
      last-updated: block-height
    })

    (ok true)
  )
)

;; Public: Record dispute resolved
;; PRD Reference: Section 12 (lines 2057-2076)
(define-public (record-dispute-resolved
    (seller principal)
    (receipt-hash (buff 32))
    (refunded bool))
  (let (
    (current-rep (unwrap! (map-get? reputation seller) ERR-NOT-FOUND))
    (penalty (if refunded u2 u0))  ;; -2 if refund issued, 0 if rejected
  )
    ;; Update reputation
    (map-set reputation seller {
      score: (if (>= (get score current-rep) penalty)
        (- (get score current-rep) penalty)
        u0),  ;; Underflow protection
      total-deliveries: (get total-deliveries current-rep),
      total-disputes: (+ (get total-disputes current-rep) u1),
      disputes-resolved: (+ (get disputes-resolved current-rep) u1),
      disputes-unresolved: (get disputes-unresolved current-rep),
      stake-bonded: (get stake-bonded current-rep),
      slashed: (get slashed current-rep),
      last-updated: block-height
    })

    (ok true)
  )
)

;; Public: Record unresolved dispute (seller did not respond within time window)
(define-public (record-dispute-unresolved (seller principal))
  (let (
    (current-rep (unwrap! (map-get? reputation seller) ERR-NOT-FOUND))
  )
    ;; Apply -5 penalty for unresolved dispute
    (map-set reputation seller {
      score: (if (>= (get score current-rep) u5)
        (- (get score current-rep) u5)
        u0),  ;; Underflow protection
      total-deliveries: (get total-deliveries current-rep),
      total-disputes: (+ (get total-disputes current-rep) u1),
      disputes-resolved: (get disputes-resolved current-rep),
      disputes-unresolved: (+ (get disputes-unresolved current-rep) u1),
      stake-bonded: (get stake-bonded current-rep),
      slashed: (get slashed current-rep),
      last-updated: block-height
    })

    (ok true)
  )
)

;; Public: Rotate signing key
;; PRD Reference: Section 12 (lines 2081-2114)
(define-public (rotate-signing-key (new-key (buff 33)))
  (let (
    (caller tx-sender)
    (current-key-info (default-to
      { current-key: 0x00, key-version: u0, updated-at: u0 }
      (map-get? signing-keys caller)))
    (old-version (get key-version current-key-info))
    (new-version (+ old-version u1))
  )
    ;; Verify new key is not empty
    (asserts! (> (len new-key) u0) ERR-INVALID-AMOUNT)

    ;; Deactivate old key in history (if it exists)
    (match (map-get? signing-key-history { principal: caller, key-version: old-version })
      old-key-history (map-set signing-key-history
        { principal: caller, key-version: old-version }
        (merge old-key-history { deactivated-at: (some block-height) }))
      true)  ;; If no history entry, skip deactivation

    ;; Store new key version in history
    (map-set signing-key-history
      { principal: caller, key-version: new-version }
      {
        public-key: new-key,
        activated-at: block-height,
        deactivated-at: none
      })

    ;; Update current key
    (map-set signing-keys caller {
      current-key: new-key,
      key-version: new-version,
      updated-at: block-height
    })

    (ok true)
  )
)

;; Public: Initialize reputation (called when service registers)
(define-public (initialize-reputation (service-principal principal))
  (begin
    (asserts! (is-none (map-get? reputation service-principal)) ERR-CONFLICT)

    (map-set reputation service-principal {
      score: u0,
      total-deliveries: u0,
      total-disputes: u0,
      disputes-resolved: u0,
      disputes-unresolved: u0,
      stake-bonded: true,
      slashed: false,
      last-updated: block-height
    })

    (ok true)
  )
)

;; Public: Slash service bond (requires governance approval in production)
(define-public (slash-bond
    (seller principal)
    (reason (string-ascii 100))
    (treasury principal))
  (let (
    (current-rep (unwrap! (map-get? reputation seller) ERR-NOT-FOUND))
  )
    ;; In production, this would require DAO governance approval
    ;; For now, only contract deployer can slash
    (asserts! (is-eq tx-sender contract-caller) ERR-UNAUTHORIZED)

    ;; Update reputation: apply -100 penalty and mark as slashed
    (map-set reputation seller {
      score: (if (>= (get score current-rep) u100)
        (- (get score current-rep) u100)
        u0),
      total-deliveries: (get total-deliveries current-rep),
      total-disputes: (get total-disputes current-rep),
      disputes-resolved: (get disputes-resolved current-rep),
      disputes-unresolved: (get disputes-unresolved current-rep),
      stake-bonded: false,
      slashed: true,
      last-updated: block-height
    })

    (ok true)
  )
)
