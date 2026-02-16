;; service-registry.clar
;; Service Directory Registry
;;
;; Manages service listings, registration, and updates for stxact-enabled services.
;; PRD Reference: Section 13 - Service Directory

;; Error codes
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-CONFLICT (err u409))
(define-constant ERR-INVALID-STAKE (err u422))
(define-constant ERR-UNAUTHORIZED (err u403))
(define-constant ERR-INVALID-INPUT (err u400))

;; Minimum stake requirement: 100 STX = 100,000,000 microSTX
(define-constant MIN-STAKE-AMOUNT u100000000)

;; Services map
;; Maps principal (service operator) to service metadata
;; PRD Reference: Section 12 (lines 1822-1834)
(define-map services
  principal
  {
    endpoint-hash: (buff 32),
    policy-hash: (buff 32),
    bns-name: (optional (string-ascii 255)),
    registered-at: uint,
    stake-amount: uint,
    active: bool,
    updated-at: uint
  }
)

;; Read-only: Get service by principal
(define-read-only (get-service (service-principal principal))
  (ok (map-get? services service-principal))
)

;; Read-only: Check if service is active
(define-read-only (is-service-active (service-principal principal))
  (match (map-get? services service-principal)
    service (ok (get active service))
    ERR-NOT-FOUND
  )
)

;; Public: Register a new service
;; PRD Reference: Section 13 (lines 2180-2223)
(define-public (register-service
    (endpoint-hash (buff 32))
    (policy-hash (buff 32))
    (bns-name (optional (string-ascii 255)))
    (stake-amount uint))
  (let (
    (caller tx-sender)
  )
    ;; Verify caller is not already registered
    (asserts! (is-none (map-get? services caller)) ERR-CONFLICT)

    ;; Verify minimum stake
    (asserts! (>= stake-amount MIN-STAKE-AMOUNT) ERR-INVALID-STAKE)

    ;; Verify hashes are not empty
    (asserts! (> (len endpoint-hash) u0) ERR-INVALID-INPUT)
    (asserts! (> (len policy-hash) u0) ERR-INVALID-INPUT)

    ;; Lock stake - transfer from caller to this contract's principal
    ;; (as-contract tx-sender) evaluates to the contract's own principal for holding escrow
    (try! (stx-transfer? stake-amount caller (as-contract tx-sender)))

    ;; Store service
    (map-set services caller {
      endpoint-hash: endpoint-hash,
      policy-hash: policy-hash,
      bns-name: bns-name,
      registered-at: block-height,
      stake-amount: stake-amount,
      active: true,
      updated-at: block-height
    })

    (ok true)
  )
)

;; Public: Update service metadata
;; Can update endpoint-hash, policy-hash, or bns-name
;; Cannot change stake-amount (must unstake and re-register)
(define-public (update-service
    (new-endpoint-hash (optional (buff 32)))
    (new-policy-hash (optional (buff 32)))
    (new-bns-name (optional (string-ascii 255))))
  (let (
    (caller tx-sender)
    (existing-service (unwrap! (map-get? services caller) ERR-NOT-FOUND))
  )
    ;; Update service with new values (or keep existing if none provided)
    (map-set services caller {
      endpoint-hash: (default-to (get endpoint-hash existing-service) new-endpoint-hash),
      policy-hash: (default-to (get policy-hash existing-service) new-policy-hash),
      bns-name: (if (is-some new-bns-name) new-bns-name (get bns-name existing-service)),
      registered-at: (get registered-at existing-service),
      stake-amount: (get stake-amount existing-service),
      active: (get active existing-service),
      updated-at: block-height
    })

    (ok true)
  )
)

;; Public: Deactivate service
(define-public (deactivate-service)
  (let (
    (caller tx-sender)
    (existing-service (unwrap! (map-get? services caller) ERR-NOT-FOUND))
  )
    (map-set services caller (merge existing-service {
      active: false,
      updated-at: block-height
    }))

    (ok true)
  )
)

;; Public: Reactivate service
(define-public (reactivate-service)
  (let (
    (caller tx-sender)
    (existing-service (unwrap! (map-get? services caller) ERR-NOT-FOUND))
  )
    (map-set services caller (merge existing-service {
      active: true,
      updated-at: block-height
    }))

    (ok true)
  )
)

;; Public: Withdraw stake (only if service is deactivated)
(define-public (withdraw-stake)
  (let (
    (caller tx-sender)
    (service (unwrap! (map-get? services caller) ERR-NOT-FOUND))
    (stake-amount (get stake-amount service))
  )
    ;; Can only withdraw if service is deactivated
    (asserts! (not (get active service)) ERR-UNAUTHORIZED)

    ;; Transfer stake back to caller
    (try! (as-contract (stx-transfer? stake-amount (as-contract tx-sender) caller)))

    ;; Remove service from map
    (map-delete services caller)

    (ok stake-amount)
  )
)
