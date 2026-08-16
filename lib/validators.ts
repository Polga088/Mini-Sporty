import { z } from "zod";

export const moneySchema = z.coerce.number().positive().multipleOf(0.01);

export const matchStatusValues = ["DRAFT", "OPEN", "FULL", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;
export const editableMatchStatusValues = ["DRAFT", "OPEN", "FULL", "CONFIRMED", "COMPLETED"] as const;
export const participantAttendanceValues = ["ATTENDED", "ABSENT"] as const;

export const matchStatusSchema = z.enum(matchStatusValues);
export const editableMatchStatusSchema = z.enum(editableMatchStatusValues);
export const participantAttendanceSchema = z.enum(participantAttendanceValues);

const createMatchFieldsSchema = z.object({
  title: z.string().min(3),
  matchDate: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  location: z.string().min(2),
  bookingReference: z.string().optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(1),
  participationFee: moneySchema.optional(),
  cancellationDeadline: z.string().optional().or(z.literal("")),
  status: editableMatchStatusSchema.default("OPEN"),
  notes: z.string().optional().or(z.literal(""))
});

const updateMatchFieldsSchema = createMatchFieldsSchema.extend({
  status: matchStatusSchema
});

export const createMatchSchema = createMatchFieldsSchema;

export const updateMatchSchema = updateMatchFieldsSchema.extend({
  matchId: z.string().min(1)
});

export const cancelMatchSchema = z.object({
  matchId: z.string().min(1)
});

export const matchParticipantActionSchema = z.object({
  matchId: z.string().min(1),
  userId: z.string().min(1)
});

export const promoteWaitlistedParticipantSchema = z.object({
  participantId: z.string().min(1),
  matchId: z.string().min(1)
});

export const participantAttendanceSchemaInput = z.object({
  participantId: z.string().min(1),
  matchId: z.string().min(1),
  attendanceStatus: participantAttendanceSchema
});

export const createContributionSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  amountPerPlayer: moneySchema,
  targetAmount: moneySchema.optional(),
  dueDate: z.string().optional().or(z.literal("")),
  automaticDebit: z.string().optional()
});

export const topUpSchema = z.object({
  userId: z.string().min(1),
  amount: moneySchema,
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "MOBILE_PAYMENT", "OTHER"]),
  note: z.string().optional().or(z.literal("")),
  proofUrl: z.string().url().optional().or(z.literal(""))
});

export const topUpIdSchema = z.object({
  topUpId: z.string().min(1)
});

export const createPlayerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(3).optional().or(z.literal("")),
  temporaryPassword: z.string().min(6),
  initialBalance: z.coerce.number().min(0).multipleOf(0.01).optional()
});

export const publicPlayerRegistrationSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères.").max(80),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(120),
  phone: z.string().trim().min(6, "Téléphone trop court.").max(30),
  password: z.string().min(10, "Mot de passe trop court.").regex(/[A-Z]/, "Ajoute une majuscule.").regex(/[a-z]/, "Ajoute une minuscule.").regex(/[0-9]/, "Ajoute un chiffre."),
  confirmPassword: z.string().min(1),
  acceptRules: z.literal("on", { message: "Tu dois accepter les règles internes." })
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "Les mots de passe ne correspondent pas."
});

export const registrationAdminActionSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().trim().max(240).optional().or(z.literal(""))
});

export const updatePlayerSchema = z.object({
  playerId: z.string().min(1),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(3).optional().or(z.literal("")),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true")
});

export const manualWalletAdjustmentSchema = z.object({
  playerId: z.string().min(1),
  adjustmentType: z.enum(["CREDIT", "DEBIT"]),
  amount: moneySchema,
  reason: z.string().min(3)
});

export const confirmParticipantSchema = z.object({
  matchId: z.string().min(1),
  userId: z.string().min(1)
});

export const createExpenseSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  category: z.enum(["FIELD", "BALL", "BIBS", "WATER", "REFEREE", "EQUIPMENT", "OTHER"]),
  amount: moneySchema,
  expenseDate: z.string().min(1),
  matchId: z.string().optional().or(z.literal("")),
  contributionId: z.string().optional().or(z.literal("")),
  receiptUrl: z.string().url().optional().or(z.literal(""))
});

export const pollStatusValues = ["DRAFT", "OPEN", "PAUSED", "CLOSED", "CANCELLED"] as const;
export const pollResponseValues = ["PRESENT", "ABSENT", "MAYBE"] as const;

export const pollStatusSchema = z.enum(pollStatusValues);
export const pollResponseSchema = z.enum(pollResponseValues);

export const createPollSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional().or(z.literal("")),
  matchTitle: z.string().min(3),
  matchDate: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  location: z.string().min(2),
  capacity: z.coerce.number().int().min(1),
  matchAmount: moneySchema.optional(),
  allowResponseChanges: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  manualControl: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  opensAt: z.string().optional().or(z.literal("")),
  closesAt: z.string().optional().or(z.literal("")),
  status: pollStatusSchema.default("DRAFT")
});

export const updatePollSchema = createPollSchema.extend({
  pollId: z.string().min(1)
});

export const pollCapacitySchema = z.object({
  pollId: z.string().min(1),
  capacity: z.coerce.number().int().min(1)
});

export const pollRespondSchema = z.object({
  pollId: z.string().min(1),
  response: pollResponseSchema
});

export const pollManageParticipantSchema = z.object({
  pollId: z.string().min(1),
  userId: z.string().min(1)
});

export const pollMoveParticipantSchema = z.object({
  pollId: z.string().min(1),
  userId: z.string().min(1),
  target: z.enum(["PRESENT", "ABSENT", "WAITLISTED"])
});

export const appSettingsSchema = z.object({
  singletonKey: z.string().min(1),
  organizationName: z.string().min(2),
  logoUrl: z.string().url().optional().or(z.literal("")),
  defaultGround: z.string().min(2),
  defaultMatchPrice: moneySchema,
  defaultCapacity: z.coerce.number().int().min(1),
  walletAlertThreshold: moneySchema,
  whatsappTemplate: z.string().min(20)
});
