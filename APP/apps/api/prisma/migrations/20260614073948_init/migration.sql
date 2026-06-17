-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('PATIENT', 'PROFESSIONAL', 'FACILITY_MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ProfessionalCategory" AS ENUM ('GENERAL_PRACTITIONER', 'SPECIALIST', 'DENTIST', 'MIDWIFE', 'NURSE', 'COMMUNITY_HEALTH_WORKER');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN_FINANCE', 'ADMIN_VERIFICATION', 'ADMIN_MAP');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('REGISTRATION', 'PASSWORD_RESET', 'PHONE_CHANGE_OLD', 'PHONE_CHANGE_NEW', 'SENSITIVE_ACTION');

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('PHARMACY', 'LABORATORY');

-- CreateEnum
CREATE TYPE "FacilityStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FacilityMemberRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'VERIFIED', 'REJECTED', 'NEEDS_INFO', 'REVOKED');

-- CreateEnum
CREATE TYPE "RecordEntryType" AS ENUM ('CONSULTATION_REPORT', 'PRESCRIPTION', 'LAB_RESULTS', 'VITALS', 'ALLERGY', 'MEDICAL_HISTORY', 'VACCINATION', 'PERSONAL_NOTE');

-- CreateEnum
CREATE TYPE "RecordProvenance" AS ENUM ('DECLARED_BY_PATIENT', 'RECORDED_BY_PROFESSIONAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SubProfileStatus" AS ENUM ('DEPENDENT', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "CareOfferKind" AS ENUM ('STANDARD', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "PresenceState" AS ENUM ('ONLINE', 'DO_NOT_DISTURB', 'OFFLINE');

-- CreateEnum
CREATE TYPE "HandshakeStatus" AS ENUM ('INITIATED', 'CONFIRMED', 'PAID', 'EXPIRED', 'REFUSED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "CareSessionStatus" AS ENUM ('PREPARING', 'ACTIVE', 'ENDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SessionMessageKind" AS ENUM ('TEXT', 'PHOTO', 'VOICE', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "PaymentOperator" AS ENUM ('MTN_MOMO', 'AIRTEL_MONEY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "EarningsHolderType" AS ENUM ('PROFESSIONAL', 'FACILITY');

-- CreateEnum
CREATE TYPE "EarningsEntryType" AS ENUM ('CREDIT', 'WITHDRAWAL', 'REVERSAL');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'EXECUTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ManualRefundStatus" AS ENUM ('PENDING_SECOND_APPROVAL', 'EXECUTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'DISMISSED', 'ACTION_TAKEN');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('PROFILE', 'FACILITY', 'SESSION_MESSAGE');

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('ACTIVE', 'PARTIALLY_DISPENSED', 'DISPENSED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('ENTRY', 'EXIT', 'DISPENSE', 'CORRECTION');

-- CreateEnum
CREATE TYPE "DisclosureStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'SERVED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'SERVED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "StrikeStatus" AS ENUM ('ACTIVE', 'CONTESTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SanctionType" AS ENUM ('SUSPENSION', 'REACTIVATION', 'BAN');

-- CreateEnum
CREATE TYPE "SanctionStatus" AS ENUM ('EXECUTED', 'PENDING_SECOND_APPROVAL', 'REVERSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SupportProcedureType" AS ENUM ('PHONE_CHANGE', 'OWNER_UNREACHABLE', 'RECORD_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "SupportProcedureStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PlatformParameter" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformParameter_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "key" TEXT NOT NULL,
    "actorId" TEXT,
    "endpoint" TEXT NOT NULL,
    "resultHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "email" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientProfile" (
    "accountId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "sex" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "emergencyContact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientProfile_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "ProfessionalProfile" (
    "accountId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "category" "ProfessionalCategory" NOT NULL,
    "specialty" TEXT,
    "biography" TEXT,
    "district" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalProfile_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "AdminRoleAssignment" (
    "accountId" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminRoleAssignment_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "LoginSession" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "deviceLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "LoginSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "client" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentVersion" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TotpSecret" (
    "accountId" TEXT NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "enabledAt" TIMESTAMP(3),

    CONSTRAINT "TotpSecret_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "TotpBackupCode" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "TotpBackupCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "type" "FacilityType" NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "hours" TEXT,
    "status" "FacilityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityMember" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "role" "FacilityMemberRole" NOT NULL,
    "rights" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityMemberProfile" (
    "accountId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityMemberProfile_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "OwnershipTransferIntent" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "toMemberId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnershipTransferIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityInvitation" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "proposedRights" TEXT[],
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "FacilityInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationCase" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT,
    "facilityId" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportingDocument" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationDecision" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reasons" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalAgreement" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigitalAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementVersion" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "commissionPct" INTEGER NOT NULL,
    "bodyHash" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3),
    "signedBy" TEXT,
    "effectiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthRecord" (
    "id" TEXT NOT NULL,
    "patientAccountId" TEXT,
    "subProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthRecordEntry" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "type" "RecordEntryType" NOT NULL,
    "provenance" "RecordProvenance" NOT NULL,
    "authorId" TEXT,
    "sourceRef" TEXT,
    "payload" JSONB NOT NULL,
    "supersedesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthRecordEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubProfileClaimIntent" (
    "id" TEXT NOT NULL,
    "subProfileId" TEXT NOT NULL,
    "guardianAccountId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubProfileClaimIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubProfile" (
    "id" TEXT NOT NULL,
    "guardianAccountId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "sex" TEXT NOT NULL,
    "status" "SubProfileStatus" NOT NULL DEFAULT 'DEPENDENT',
    "transferredToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareOffer" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "priceXaf" INTEGER NOT NULL,
    "kind" "CareOfferKind" NOT NULL DEFAULT 'STANDARD',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresenceStatus" (
    "accountId" TEXT NOT NULL,
    "state" "PresenceState" NOT NULL DEFAULT 'OFFLINE',
    "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PresenceStatus_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "ProfessionalStats" (
    "professionalId" TEXT NOT NULL,
    "initiationsTotal" INTEGER NOT NULL DEFAULT 0,
    "confirmedTotal" INTEGER NOT NULL DEFAULT 0,
    "confirmDelaySumS" INTEGER NOT NULL DEFAULT 0,
    "ratingSum" INTEGER NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "incidentsTotal" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalStats_pkey" PRIMARY KEY ("professionalId")
);

-- CreateTable
CREATE TABLE "AvailabilityAlert" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "AvailabilityAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Handshake" (
    "id" TEXT NOT NULL,
    "patientAccountId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "subProfileId" TEXT,
    "status" "HandshakeStatus" NOT NULL DEFAULT 'INITIATED',
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "confirmExpiresAt" TIMESTAMP(3),
    "refusalReason" TEXT,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "Handshake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareSession" (
    "id" TEXT NOT NULL,
    "handshakeId" TEXT NOT NULL,
    "patientAccountId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "subProfileId" TEXT,
    "status" "CareSessionStatus" NOT NULL DEFAULT 'PREPARING',
    "durationMin" INTEGER NOT NULL,
    "orderRef" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "extensionTotalSec" INTEGER NOT NULL DEFAULT 0,
    "reportDepositedAt" TIMESTAMP(3),

    CONSTRAINT "CareSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "kind" "SessionMessageKind" NOT NULL,
    "body" TEXT,
    "fileKey" TEXT,
    "clientMsgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "SessionMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreConsultation" (
    "sessionId" TEXT NOT NULL,
    "symptoms" TEXT NOT NULL,
    "sinceWhen" TEXT,
    "attachments" TEXT[],
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreConsultation_pkey" PRIMARY KEY ("sessionId")
);

-- CreateTable
CREATE TABLE "SessionRating" (
    "sessionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionRating_pkey" PRIMARY KEY ("sessionId")
);

-- CreateTable
CREATE TABLE "SessionRecordAccess" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "SessionRecordAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderRef" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "amountXaf" INTEGER NOT NULL,
    "operator" "PaymentOperator" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "aggregatorRef" TEXT,
    "failReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSplit" (
    "paymentId" TEXT NOT NULL,
    "holderType" "EarningsHolderType",
    "holderId" TEXT,
    "grossXaf" INTEGER NOT NULL,
    "commissionXaf" INTEGER NOT NULL,
    "netXaf" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentSplit_pkey" PRIMARY KEY ("paymentId")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "seq" SERIAL NOT NULL,
    "paymentId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "EarningsAccount" (
    "id" TEXT NOT NULL,
    "holderType" "EarningsHolderType" NOT NULL,
    "holderId" TEXT NOT NULL,
    "availableXaf" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EarningsAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarningsEntry" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "EarningsEntryType" NOT NULL,
    "amountXaf" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EarningsEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "amountXaf" INTEGER NOT NULL,
    "operator" "PaymentOperator" NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "netXaf" INTEGER,
    "feeXaf" INTEGER,
    "aggregatorRef" TEXT,
    "failReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualRefundRequest" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "status" "ManualRefundStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "ManualRefundRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "seq" BIGSERIAL NOT NULL,
    "actorId" TEXT,
    "actorType" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "context" JSONB,
    "prevHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "UserReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "reasonText" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationDecision" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reasons" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicament" (
    "id" TEXT NOT NULL,
    "dci" TEXT NOT NULL,
    "commercialNames" TEXT[],
    "form" TEXT,
    "dosage" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medicament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "prescriberId" TEXT NOT NULL,
    "patientAccountId" TEXT NOT NULL,
    "subProfileId" TEXT,
    "qrToken" TEXT NOT NULL,
    "bodyHash" TEXT NOT NULL,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionLine" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "medicamentId" TEXT,
    "freeText" TEXT,
    "posology" TEXT NOT NULL,
    "durationDays" INTEGER,
    "qtyPrescribed" INTEGER NOT NULL,
    "qtyDispensed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PrescriptionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispensation" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispensation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispensationLine" (
    "id" TEXT NOT NULL,
    "dispensationId" TEXT NOT NULL,
    "prescriptionLineId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "DispensationLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllergyOverride" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "lineLabel" TEXT NOT NULL,
    "allergyLabel" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "prescriberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllergyOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferentialEnrichmentItem" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "flaggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ReferentialEnrichmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "medicamentId" TEXT NOT NULL,
    "lotCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "priceXaf" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "reference" TEXT,
    "memberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockThreshold" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "medicamentId" TEXT NOT NULL,
    "lowStock" INTEGER NOT NULL,

    CONSTRAINT "StockThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreshnessConfirmation" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "confirmedBy" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FreshnessConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityStockState" (
    "facilityId" TEXT NOT NULL,
    "lastFreshAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityStockState_pkey" PRIMARY KEY ("facilityId")
);

-- CreateTable
CREATE TABLE "Disclosure" (
    "id" TEXT NOT NULL,
    "patientAccountId" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "facilityId" TEXT,
    "orderRef" TEXT NOT NULL,
    "status" "DisclosureStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "requestedItems" JSONB NOT NULL,
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "servedAt" TIMESTAMP(3),
    "supersedesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Disclosure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "disclosureId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "servedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationLine" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "medicamentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "ReservationLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReliabilityStrike" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "disclosureId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "StrikeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReliabilityStrike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAvailabilityAlert" (
    "id" TEXT NOT NULL,
    "patientAccountId" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "medicamentIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "ProductAvailabilityAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountSanction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "SanctionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "status" "SanctionStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "AccountSanction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParameterChange" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "changedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParameterChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportProcedure" (
    "id" TEXT NOT NULL,
    "type" "SupportProcedureType" NOT NULL,
    "accountId" TEXT,
    "steps" JSONB NOT NULL,
    "justification" TEXT NOT NULL,
    "executedBy" TEXT NOT NULL,
    "status" "SupportProcedureStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SupportProcedure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutboxEvent_processedAt_createdAt_idx" ON "OutboxEvent"("processedAt", "createdAt");

-- CreateIndex
CREATE INDEX "IdempotencyKey_createdAt_idx" ON "IdempotencyKey"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Account_phone_key" ON "Account"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "LoginSession_tokenHash_key" ON "LoginSession"("tokenHash");

-- CreateIndex
CREATE INDEX "LoginSession_accountId_revokedAt_idx" ON "LoginSession"("accountId", "revokedAt");

-- CreateIndex
CREATE INDEX "OtpCode_phone_purpose_createdAt_idx" ON "OtpCode"("phone", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_phone_createdAt_idx" ON "LoginAttempt"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "FacilityMember_accountId_active_idx" ON "FacilityMember"("accountId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityMember_facilityId_accountId_key" ON "FacilityMember"("facilityId", "accountId");

-- CreateIndex
CREATE INDEX "OwnershipTransferIntent_facilityId_consumedAt_idx" ON "OwnershipTransferIntent"("facilityId", "consumedAt");

-- CreateIndex
CREATE INDEX "FacilityInvitation_phone_status_idx" ON "FacilityInvitation"("phone", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationCase_professionalId_key" ON "VerificationCase"("professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationCase_facilityId_key" ON "VerificationCase"("facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalAgreement_caseId_key" ON "DigitalAgreement"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "AgreementVersion_agreementId_version_key" ON "AgreementVersion"("agreementId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "HealthRecord_patientAccountId_key" ON "HealthRecord"("patientAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "HealthRecord_subProfileId_key" ON "HealthRecord"("subProfileId");

-- CreateIndex
CREATE INDEX "HealthRecordEntry_recordId_type_createdAt_idx" ON "HealthRecordEntry"("recordId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "SubProfileClaimIntent_subProfileId_consumedAt_idx" ON "SubProfileClaimIntent"("subProfileId", "consumedAt");

-- CreateIndex
CREATE INDEX "SubProfile_guardianAccountId_status_idx" ON "SubProfile"("guardianAccountId", "status");

-- CreateIndex
CREATE INDEX "CareOffer_professionalId_active_idx" ON "CareOffer"("professionalId", "active");

-- CreateIndex
CREATE INDEX "AvailabilityAlert_professionalId_notifiedAt_idx" ON "AvailabilityAlert"("professionalId", "notifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilityAlert_patientId_professionalId_key" ON "AvailabilityAlert"("patientId", "professionalId");

-- CreateIndex
CREATE INDEX "Handshake_professionalId_status_idx" ON "Handshake"("professionalId", "status");

-- CreateIndex
CREATE INDEX "Handshake_patientAccountId_status_idx" ON "Handshake"("patientAccountId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CareSession_handshakeId_key" ON "CareSession"("handshakeId");

-- CreateIndex
CREATE UNIQUE INDEX "CareSession_orderRef_key" ON "CareSession"("orderRef");

-- CreateIndex
CREATE INDEX "CareSession_professionalId_status_idx" ON "CareSession"("professionalId", "status");

-- CreateIndex
CREATE INDEX "CareSession_patientAccountId_status_idx" ON "CareSession"("patientAccountId", "status");

-- CreateIndex
CREATE INDEX "SessionMessage_sessionId_createdAt_idx" ON "SessionMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SessionMessage_sessionId_clientMsgId_key" ON "SessionMessage"("sessionId", "clientMsgId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderRef_key" ON "Payment"("orderRef");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_aggregatorRef_key" ON "Payment"("aggregatorRef");

-- CreateIndex
CREATE INDEX "Payment_payerId_createdAt_idx" ON "Payment"("payerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_number_key" ON "Receipt"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_paymentId_kind_key" ON "Receipt"("paymentId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "EarningsAccount_holderType_holderId_key" ON "EarningsAccount"("holderType", "holderId");

-- CreateIndex
CREATE INDEX "EarningsEntry_accountId_createdAt_idx" ON "EarningsEntry"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "Withdrawal_accountId_requestedAt_idx" ON "Withdrawal"("accountId", "requestedAt");

-- CreateIndex
CREATE INDEX "Withdrawal_status_requestedAt_idx" ON "Withdrawal"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "Notification_accountId_createdAt_idx" ON "Notification"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_status_priority_idx" ON "Notification"("status", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_accountId_category_key" ON "NotificationPreference"("accountId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvent_hash_key" ON "AuditEvent"("hash");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "AuditEvent"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_action_createdAt_idx" ON "AuditEvent"("action", "createdAt");

-- CreateIndex
CREATE INDEX "UserReport_status_createdAt_idx" ON "UserReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Medicament_dci_idx" ON "Medicament"("dci");

-- CreateIndex
CREATE UNIQUE INDEX "Prescription_qrToken_key" ON "Prescription"("qrToken");

-- CreateIndex
CREATE INDEX "Prescription_patientAccountId_status_idx" ON "Prescription"("patientAccountId", "status");

-- CreateIndex
CREATE INDEX "Prescription_status_expiresAt_idx" ON "Prescription"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "PrescriptionLine_prescriptionId_idx" ON "PrescriptionLine"("prescriptionId");

-- CreateIndex
CREATE INDEX "Dispensation_prescriptionId_createdAt_idx" ON "Dispensation"("prescriptionId", "createdAt");

-- CreateIndex
CREATE INDEX "Dispensation_facilityId_createdAt_idx" ON "Dispensation"("facilityId", "createdAt");

-- CreateIndex
CREATE INDEX "AllergyOverride_prescriptionId_idx" ON "AllergyOverride"("prescriptionId");

-- CreateIndex
CREATE INDEX "ReferentialEnrichmentItem_resolvedAt_idx" ON "ReferentialEnrichmentItem"("resolvedAt");

-- CreateIndex
CREATE INDEX "StockItem_facilityId_medicamentId_idx" ON "StockItem"("facilityId", "medicamentId");

-- CreateIndex
CREATE INDEX "StockItem_medicamentId_expiryDate_idx" ON "StockItem"("medicamentId", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_facilityId_medicamentId_lotCode_key" ON "StockItem"("facilityId", "medicamentId", "lotCode");

-- CreateIndex
CREATE INDEX "StockMovement_stockItemId_createdAt_idx" ON "StockMovement"("stockItemId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_facilityId_createdAt_idx" ON "StockMovement"("facilityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StockThreshold_facilityId_medicamentId_key" ON "StockThreshold"("facilityId", "medicamentId");

-- CreateIndex
CREATE INDEX "FreshnessConfirmation_facilityId_confirmedAt_idx" ON "FreshnessConfirmation"("facilityId", "confirmedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Disclosure_orderRef_key" ON "Disclosure"("orderRef");

-- CreateIndex
CREATE INDEX "Disclosure_patientAccountId_status_idx" ON "Disclosure"("patientAccountId", "status");

-- CreateIndex
CREATE INDEX "Disclosure_status_expiresAt_idx" ON "Disclosure"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_disclosureId_key" ON "Reservation"("disclosureId");

-- CreateIndex
CREATE INDEX "Reservation_facilityId_status_idx" ON "Reservation"("facilityId", "status");

-- CreateIndex
CREATE INDEX "Reservation_status_expiresAt_idx" ON "Reservation"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "ReliabilityStrike_facilityId_status_createdAt_idx" ON "ReliabilityStrike"("facilityId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ProductAvailabilityAlert_notifiedAt_idx" ON "ProductAvailabilityAlert"("notifiedAt");

-- CreateIndex
CREATE INDEX "AccountSanction_accountId_createdAt_idx" ON "AccountSanction"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "AccountSanction_status_createdAt_idx" ON "AccountSanction"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ParameterChange_key_createdAt_idx" ON "ParameterChange"("key", "createdAt");

-- CreateIndex
CREATE INDEX "SupportProcedure_type_status_idx" ON "SupportProcedure"("type", "status");

-- AddForeignKey
ALTER TABLE "PatientProfile" ADD CONSTRAINT "PatientProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRoleAssignment" ADD CONSTRAINT "AdminRoleAssignment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginSession" ADD CONSTRAINT "LoginSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TotpSecret" ADD CONSTRAINT "TotpSecret_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TotpBackupCode" ADD CONSTRAINT "TotpBackupCode_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TotpSecret"("accountId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityMember" ADD CONSTRAINT "FacilityMember_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityMember" ADD CONSTRAINT "FacilityMember_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityMemberProfile" ADD CONSTRAINT "FacilityMemberProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityInvitation" ADD CONSTRAINT "FacilityInvitation_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationCase" ADD CONSTRAINT "VerificationCase_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("accountId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationCase" ADD CONSTRAINT "VerificationCase_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportingDocument" ADD CONSTRAINT "SupportingDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "VerificationCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDecision" ADD CONSTRAINT "VerificationDecision_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "VerificationCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalAgreement" ADD CONSTRAINT "DigitalAgreement_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "VerificationCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementVersion" ADD CONSTRAINT "AgreementVersion_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "DigitalAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthRecord" ADD CONSTRAINT "HealthRecord_subProfileId_fkey" FOREIGN KEY ("subProfileId") REFERENCES "SubProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthRecordEntry" ADD CONSTRAINT "HealthRecordEntry_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "HealthRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareSession" ADD CONSTRAINT "CareSession_handshakeId_fkey" FOREIGN KEY ("handshakeId") REFERENCES "Handshake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionMessage" ADD CONSTRAINT "SessionMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CareSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreConsultation" ADD CONSTRAINT "PreConsultation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CareSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionRating" ADD CONSTRAINT "SessionRating_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CareSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionRecordAccess" ADD CONSTRAINT "SessionRecordAccess_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CareSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSplit" ADD CONSTRAINT "PaymentSplit_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarningsEntry" ADD CONSTRAINT "EarningsEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "EarningsAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "EarningsAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationDecision" ADD CONSTRAINT "ModerationDecision_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "UserReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionLine" ADD CONSTRAINT "PrescriptionLine_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispensation" ADD CONSTRAINT "Dispensation_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispensationLine" ADD CONSTRAINT "DispensationLine_dispensationId_fkey" FOREIGN KEY ("dispensationId") REFERENCES "Dispensation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispensationLine" ADD CONSTRAINT "DispensationLine_prescriptionLineId_fkey" FOREIGN KEY ("prescriptionLineId") REFERENCES "PrescriptionLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_disclosureId_fkey" FOREIGN KEY ("disclosureId") REFERENCES "Disclosure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationLine" ADD CONSTRAINT "ReservationLine_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
