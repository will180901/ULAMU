-- Rappels de médicaments (M14) — CRUD propre au patient.
CREATE TABLE "MedicationReminder" (
    "id" TEXT NOT NULL,
    "patientAccountId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "dosage" TEXT,
    "times" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastTakenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MedicationReminder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MedicationReminder_patientAccountId_active_idx" ON "MedicationReminder"("patientAccountId", "active");
