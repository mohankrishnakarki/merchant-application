# Merchant Onboarding & Risk Management API

A secure merchant onboarding platform built using NestJS,
TypeScript, PostgreSQL, MongoDB, Redis, and BullMQ.

## Overview

This API manages the complete merchant onboarding lifecycle:

1. Merchant application creation
2. Application updates and validation
3. Application submission
4. Asynchronous KYB risk evaluation
5. Reviewer assignment
6. Approval, rejection, or information requests
7. Audit logging

## Authentication

The API uses JWT Bearer authentication.

To access protected endpoints:

1. Authenticate and obtain a JWT token.
2. Click **Authorize** in Swagger.
3. Enter the JWT token.
4. Execute API requests.

## User Roles

### ADMIN

- Manage merchant applications.
- Assign reviewers.
- Monitor onboarding operations.

### SALES

- Create merchant applications.
- View applications they created.
- Update eligible applications they own.
- Submit applications for review.

### REVIEWER

- Access assigned applications.
- Review merchant information.
- Approve, reject, or request additional information.

## Application Lifecycle

DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED / REJECTED

Applications may transition to NEEDS_INFO when additional
merchant information is required.

## Risk Review Lifecycle

NOT_STARTED → PENDING → PROCESSING → COMPLETED

Technical processing failures may transition to FAILED
after retry attempts are exhausted.

Risk review processing runs asynchronously through BullMQ.

## Optimistic Locking

Application updates use version-based concurrency protection.

Example request header:

    If-Match: "3"

If the version does not match, the API returns HTTP 409.

## Audit Logging

Business operations are recorded in MongoDB.

Events include:

- CREATE_APPLICATION
- UPDATE_APPLICATION
- SUBMIT_APPLICATION
- ASSIGN_REVIEWER
- RECORD_DECISION
- RISK_EVALUATION

## HTTP Response Codes

| Status | Description |
|--------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Invalid request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict |
| 500 | Internal server error |