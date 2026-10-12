# ADR-001: Merchant Application System – Technical Assessment and Recommendations

**Project:** Merchant Payments API  
**Status:** Technical Assessment and Recommendations

## 1. Overview

As part of the technical assessment, I developed the Merchant Payments API using the technology stack and requirements provided by the company.

The existing technology decisions were already established, and my implementation follows those requirements.

This document briefly explains my implementation approach and highlights a few architectural improvements I would consider for a production-grade fintech system.

My recommendations are not intended to change the current requirements but to demonstrate how I would approach scalability, security, reliability, and maintainability in a production environment.

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

The implementation focuses on following the given requirements while maintaining clear separation between controllers, services, data validation, and business logic.

## 3. My Recommendations for a Production Environment

The following are improvements I would consider if the application were deployed as part of a larger production fintech platform.

### 3.1 Managed Messaging for Risk Review

**Current implementation:** Redis and BullMQ.

**My recommendation:** For a larger distributed environment, I would evaluate managed messaging services such as **Azure Service Bus or AWS SNS/SQS**.

These services provide features such as message retries, dead-letter queues, and managed infrastructure, which can reduce operational overhead.

I would also consider implementing the **Transactional Outbox Pattern** to prevent messages from being lost when a database transaction succeeds but event publishing fails.

Consumers should support idempotent processing to handle duplicate messages safely.

I would retain BullMQ for the current scope unless production requirements justify introducing managed messaging.

### 3.2 Secure Two-Way Webhook Communication

**My recommendation:** For integrations with external payment providers, risk assessment services, or other third-party systems, I would implement **HMAC-SHA256 signature verification**.

Each outgoing webhook would include a signature generated from the request payload using a shared secret.

The receiving system would independently calculate and validate the signature before processing the request.

I would also include timestamp validation, unique request identifiers, HTTPS, and replay protection.

For two-way communication, both systems would sign outgoing requests and validate incoming requests.

This would help ensure message authenticity and integrity during external service communication.

### 3.3 Centralized Logging with Fluent Bit

**Current implementation:** Application-level audit logging.

**My recommendation:** In production, I would consider using **Fluent Bit to collect structured JSON logs from Docker containers** and forward them to centralized storage, such as MongoDB through a suitable ingestion integration.

One concern with relying entirely on application-level logging is that unexpected application failures may prevent some operational logs from being saved.

With Fluent Bit, logs already written to Docker's standard output can be collected independently of the application process.

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

I would configure buffering, retries, and log retention to reduce the possibility of losing logs during temporary failures.

For critical financial audit records, I would still maintain reliable database persistence, preferably within the business transaction. Fluent Bit would complement this by providing centralized operational logging rather than replacing the authoritative audit trail.

### 3.4 Monitoring and Service Health

**My recommendation:** For production operations, I would introduce proper health monitoring and observability.

This would include application health checks, worker heartbeats, queue monitoring, error tracking, and alerts.

Depending on the infrastructure, I would consider Prometheus, Grafana, and OpenTelemetry.

The objective would be to identify failures early and make troubleshooting easier across multiple services.

## 4. Testing and Reliability

For the technical assessment, I used Jest and Supertest to validate the application workflows, including authentication, authorization, request validation, application updates, risk review submission, and reviewer decisions.

For a production environment, I would extend testing to include database transactions, queue failures, duplicate message handling, webhook signature validation, and recovery scenarios.

I believe testing failure scenarios is just as important as testing successful business operations, particularly in financial applications.

## 5. Final Thoughts

I followed the technology stack and architectural requirements provided for this assessment. My focus was to deliver a functional, maintainable implementation without introducing unnecessary complexity beyond the requested scope.

**From my perspective, the current architecture is suitable for the assessment and provides a good starting point. However, for a production-grade fintech system, I would place additional emphasis on four areas:**

1. **Reliable messaging:** Evaluate Azure Service Bus or AWS SNS/SQS, supported by transactional outbox and idempotent processing.
2. **Integration security:** Implement HMAC-SHA256 signatures and replay protection for secure webhook communication.
3. **Centralized logging:** Use Fluent Bit to collect Docker logs and forward them to centralized storage, while maintaining durable business audit records.
4. **Operational visibility:** Introduce health checks, monitoring, distributed tracing, and proactive alerts.

These are recommendations I would evaluate based on actual transaction volume, infrastructure, business requirements, operational costs, and compliance needs.