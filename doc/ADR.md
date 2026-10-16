# ADR-001: Merchant Application System – Technical Assessment and Recommendations

**Project:** Merchant Payments API  
**Status:** Technical Assessment and Recommendations

---

## 1. Overview

As part of the technical assessment, I developed the Merchant Payments API using the technology stack and requirements provided by the company.

The technology decisions were already established, and my implementation follows those requirements.

This document explains my implementation approach and highlights architectural improvements I would recommend for a production-grade fintech system.

My recommendations are not intended to change the current assessment requirements. They reflect how I would approach scalability, security, reliability, maintainability, and operational readiness in a production environment.

---

## 2. Current Implementation

Based on the provided requirements, I implemented the application using:

- **NestJS and TypeScript:** REST APIs and business logic.
- **PostgreSQL and TypeORM:** Database operations and optimistic locking.
- **Redis and BullMQ:** Asynchronous risk review processing.
- **JWT and Role-Based Guards:** Authentication and authorization.
- **AuditService:** Tracking important business activities.
- **Jest and Supertest:** Automated testing.

The merchant application follows the required workflow:

```text
DRAFT → SUBMITTED → UNDER_REVIEW
                           |
                           +→ APPROVED
                           +→ REJECTED
                           +→ NEEDS_INFO
```

The implementation focuses on following the requirements while maintaining clear separation between controllers, services, data validation, and business logic.

---

## 3. My Recommendations for a Production Environment

The following are architectural improvements I would consider when deploying the application as part of a larger production fintech platform.

### 3.1 Managed Messaging for Risk Review

**Current implementation:** Redis and BullMQ.

**My recommendation:** For a larger distributed environment, I would evaluate managed messaging services such as **Azure Service Bus or AWS SNS/SQS**.

These services provide capabilities such as message retries, dead-letter queues, and managed infrastructure, helping reduce operational overhead.

I would also consider implementing the **Transactional Outbox Pattern** to prevent events from being lost when a database transaction succeeds but message publishing fails.

Consumers should support idempotent processing to handle duplicate messages safely.

For the current assessment, BullMQ is suitable. I would consider managed messaging when transaction volume, system complexity, or operational requirements justify the change.

### 3.2 Secure Two-Way Webhook Communication

**My recommendation:** For integrations with payment providers, risk assessment services, or other third-party systems, I would implement **HMAC-SHA256 signature verification**.

Each outgoing webhook would include a signature generated from the raw request payload using a shared secret.

The receiving system would independently calculate and verify the signature before processing the request.

I would also implement:

- HTTPS for secure data transmission.
- Timestamp validation and unique event identifiers.
- Replay attack prevention.
- Secure webhook secret storage and rotation.
- Idempotent webhook processing.

For two-way communication, both systems would sign outgoing requests and validate incoming requests.

This would help ensure message authenticity and integrity across external integrations.

### 3.3 Centralized Logging with Fluent Bit

**Current implementation:** Application-level audit logging.

**My recommendation:** In production, I would use **Fluent Bit to collect structured JSON logs from Docker containers** and forward them to centralized storage, such as MongoDB through an appropriate ingestion integration.

One concern with relying entirely on application-level logging is that unexpected application failures may prevent some operational logs from being persisted.

Fluent Bit can collect logs already written to Docker's standard output independently of the application process.

```text
NestJS Application
        |
        v
Docker JSON Logs
        |
        v
     Fluent Bit
        |
        v
Centralized Log Storage
        |
        v
Monitoring and Analysis
```

I would configure buffering, retries, and retention policies to reduce the risk of losing logs during temporary failures.

For critical financial audit records, I would maintain durable database persistence, preferably coordinated with the business transaction.

Fluent Bit would complement the authoritative audit trail rather than replace it.

### 3.4 Secure Secrets Management Using a Vault

**Current implementation:** Application and database configuration can be provided through environment variables.

**My recommendation:** For a production fintech system, I would avoid storing sensitive credentials in `.env` files, Docker Compose configurations, source code, or application configuration files.

Instead, I would introduce **centralized secrets management using Azure Key Vault, AWS Secrets Manager, or HashiCorp Vault**, depending on the selected cloud infrastructure.

Sensitive information would include:

- PostgreSQL and MongoDB credentials.
- Redis authentication credentials.
- JWT signing secrets or private keys.
- External payment provider API credentials.
- Webhook signing secrets.
- Encryption keys and certificates.
- Third-party service authentication tokens.

My preferred approach would be to use **managed identities or workload identities** so applications can authenticate to the vault without storing long-lived credentials.

#### Proposed Architecture

```text
             Cloud Infrastructure
                      |
                      v
        Managed Identity / IAM Role
                      |
                      v
          Centralized Secrets Vault
                      |
             +--------+--------+
             |                 |
             v                 v
      NestJS Application   Background Workers
             |                 |
             +--------+--------+
                      |
                      v
             Database / Redis
             External Services
```

The application would retrieve required secrets securely during initialization or through an approved runtime integration.

#### Azure-Based Infrastructure

For an Azure deployment, I would consider Azure Key Vault with Managed Identity.

```text
NestJS Application
        |
        v
Azure Managed Identity
        |
        v
Azure Key Vault
        |
        +--> Database Credentials
        +--> JWT Signing Keys
        +--> Redis Credentials
        +--> Webhook Secrets
        +--> External API Credentials
```

#### AWS-Based Infrastructure

For an AWS deployment, I would consider AWS Secrets Manager with IAM roles.

```text
NestJS Application
        |
        v
AWS IAM Role
        |
        v
AWS Secrets Manager
        |
        +--> Database Credentials
        +--> JWT Signing Keys
        +--> Redis Credentials
        +--> Webhook Secrets
        +--> External API Credentials
```

#### Security Principles

**1. No sensitive credentials in `.env` files**

Environment variables may still be used for non-sensitive configuration, such as application ports, service names, and environment identifiers.

Sensitive values would be retrieved from the secrets management platform rather than maintained in local configuration files.

**2. Identity-Based Authentication**

Applications would use Azure Managed Identity, AWS IAM roles, or equivalent workload identities to access secrets.

This reduces the need to distribute permanent credentials across containers and servers.

**3. Least-Privilege Access**

Each application or worker would receive access only to the secrets required for its responsibilities.

For example, a risk assessment worker should not automatically have access to unrelated payment provider credentials.

**4. Secret Rotation**

Database passwords, API credentials, signing keys, and webhook secrets should support controlled rotation without requiring manual updates across multiple servers.

Where supported, I would prefer short-lived credentials and identity-based database authentication over static passwords.

**5. Audit and Monitoring**

Secret access should be monitored through the vault provider's audit capabilities, with alerts for suspicious access attempts or unauthorized activity.

**6. Preventing Accidental Exposure**

Secrets must never appear in application logs, exception messages, HTTP responses, or audit payloads.

I would also ensure that secrets are not included in Docker image layers or committed to source control.

#### Additional Considerations

I would not recommend making a network request to the vault for every database query or API operation.

Instead, I would use an appropriate retrieval and caching strategy while supporting secret rotation and avoiding unnecessary exposure of credentials.

The selected approach would depend on the hosting platform, operational requirements, and security policies.

**My preferred direction:**

- **Azure:** Azure Key Vault with Managed Identity.
- **AWS:** AWS Secrets Manager with IAM roles.
- **Cloud-independent infrastructure:** HashiCorp Vault with workload authentication.

For the current technical assessment, I would retain the configuration approach required by the company. Centralized secrets management would be a production security recommendation.

### 3.5 Monitoring and Service Health

**My recommendation:** For production operations, I would introduce application health monitoring and observability.

This would include:

- Application liveness and readiness checks.
- Background worker health and heartbeats.
- Queue depth, processing latency, and failure monitoring.
- Database connectivity and performance monitoring.
- Centralized error tracking and alerting.
- Distributed tracing across services.
- Vault access failure and authentication monitoring.

Depending on the infrastructure, I would consider **Prometheus, Grafana, and OpenTelemetry**.

The objective would be to identify failures early and simplify troubleshooting across distributed services.

---

## 4. Testing and Reliability

For the technical assessment, I used Jest and Supertest to validate application workflows, including authentication, authorization, request validation, application updates, risk review submission, and reviewer decisions.

For a production environment, I would extend testing to include:

- Database transaction failures and rollback behavior.
- Message delivery failures and retry handling.
- Duplicate event and idempotency scenarios.
- Webhook signature validation and replay protection.
- Secrets vault availability and access failures.
- Secret rotation without unnecessary service interruption.
- Application restart and recovery scenarios.
- Authorization and privilege escalation tests.

I believe testing failure scenarios is just as important as testing successful business operations, particularly in financial applications.

---

## 5. Final Thoughts

I followed the technology stack and architectural requirements provided for this assessment. My focus was to deliver a functional, maintainable implementation without introducing unnecessary complexity beyond the requested scope.

From my perspective, the current architecture is suitable for the assessment and provides a good starting point.

However, for a production-grade fintech system, I would place additional emphasis on **five architectural areas**:

| Area | My Recommendation | Expected Benefit |
|------|-------------------|------------------|
| **Reliable Messaging** | Azure Service Bus or AWS SNS/SQS with transactional outbox and idempotent consumers | Reliable asynchronous processing |
| **Integration Security** | HMAC-SHA256 webhook signatures, timestamp validation, and replay protection | Secure external integrations |
| **Centralized Logging** | Fluent Bit with structured Docker logs and centralized storage | Better operational visibility and troubleshooting |
| **Secrets Management** | Azure Key Vault, AWS Secrets Manager, or HashiCorp Vault with workload identity | Reduced credential exposure and centralized security controls |
| **Monitoring and Observability** | Prometheus, Grafana, OpenTelemetry, health checks, and alerts | Early failure detection and improved reliability |

### My Approach to Technology Selection

I would not introduce additional infrastructure simply because it is available.

I would evaluate each technology based on actual transaction volume, infrastructure, security requirements, operational costs, compliance obligations, and long-term maintainability.

**My priority for a production fintech application would be to ensure that sensitive credentials are managed securely, financial transactions are processed reliably, external integrations are authenticated, and the system remains observable and recoverable during failures.**
