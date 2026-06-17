import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const permissions = [
  { key: "dashboard.view", name: "View Dashboard" },
  { key: "procurement.view", name: "View Procurements" },
  { key: "procurement.create", name: "Create Procurements" },
  { key: "procurement.edit", name: "Edit Procurements" },
  { key: "procurement.delete", name: "Delete Procurements" },
  { key: "procurement.transition", name: "Manage Procurement Workflow" },
  { key: "procurement.export", name: "Export Procurements" },
  { key: "settings.view", name: "View Settings" },
  { key: "settings.manage", name: "Manage Settings" },
  { key: "users.view", name: "View Users" },
  { key: "users.manage", name: "Manage Users" },
  { key: "users.permissions.manage", name: "Manage User Permissions" },
  { key: "templates.manage", name: "Manage Document Templates" },
  { key: "audit.view", name: "View Audit Logs" },
];

const defaultSettings: Array<{ key: string; value: unknown }> = [
  { key: "vatPercent", value: 13 },
  { key: "bsfMinPercent", value: 2 },
  { key: "bsfMaxPercent", value: 3 },
  { key: "bsfDefaultPercent", value: 2.5 },
  { key: "prebidOffsetDays", value: 15 },
  { key: "completionBufferDays", value: 30 },
  { key: "loaDelayDays", value: 7 },
  { key: "pgDiscountThresholdPercent", value: 15 },
  { key: "pgLowDiscountRatePercent", value: 5 },
  { key: "pgFrontLoadingCostFactor", value: 0.85 },
  { key: "pgFrontLoadingRate", value: 0.5 },
  { key: "pgValidityExtensionDays", value: 0 },
  { key: "defaultPrebidTime", value: "12:00" },
  { key: "defaultBidSubmissionTime", value: "16:00" },
  { key: "defaultBidOpenTime", value: "14:00" },
  { key: "weeklyDefaultOffDays", value: [0, 6] },
  {
    key: "bidFeeTiers",
    value: [
      { maxInclusive: 2000000, fee: 1000 },
      { maxInclusive: 20000000, fee: 3000 },
      { maxInclusive: 100000000, fee: 5000 },
      { maxInclusive: 250000000, fee: 10000 },
      { maxInclusive: null, fee: 20000 },
    ],
  },
  {
    key: "validityTiers",
    value: [
      { maxInclusive: 100000000, days: 90 },
      { maxInclusive: null, days: 120 },
    ],
  },
  { key: "letterDefaultCcLines", value: [] },
];

async function main() {
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { name: perm.name },
      create: perm,
    });
  }

  const allPerms = await prisma.permission.findMany();
  for (const role of [Role.ADMIN, Role.USER] as Role[]) {
    for (const perm of allPerms) {
      const allowed =
        role === Role.ADMIN
          ? perm.key !== "users.view" &&
            perm.key !== "users.manage" &&
            perm.key !== "audit.view"
          : perm.key === "dashboard.view" || perm.key === "procurement.view";
      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: { role, permissionId: perm.id },
        },
        update: { allowed },
        create: { role, permissionId: perm.id, allowed },
      });
    }
  }

  for (const setting of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      // Only insert missing keys; never overwrite values the user saved in Settings.
      update: {},
      create: { key: setting.key, value: setting.value as object },
    });
  }

  const passwordHash = await hash("Testing@123", 12);
  const superadmin = await prisma.user.upsert({
    where: { email: "superadmin@nac.com.np" },
    update: { passwordHash, fullName: "Super Admin", role: Role.SUPERADMIN, isActive: true },
    create: {
      email: "superadmin@nac.com.np",
      fullName: "Super Admin",
      passwordHash,
      role: Role.SUPERADMIN,
      isActive: true,
    },
  });

  for (const perm of allPerms) {
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: { userId: superadmin.id, permissionId: perm.id },
      },
      update: { allowed: true },
      create: { userId: superadmin.id, permissionId: perm.id, allowed: true },
    });
  }

  const refTypes = ["IFB", "RFP", "EOI", "PQ"];
  for (let i = 0; i < refTypes.length; i++) {
    await prisma.referenceType.upsert({
      where: { code: refTypes[i] },
      update: { name: refTypes[i], sortOrder: i },
      create: { name: refTypes[i], code: refTypes[i], sortOrder: i },
    });
  }

  const milestones = [
    {
      milestoneKey: "prebidDate",
      label: "Pre-bid meeting",
      dateField: "prebidDate",
      milestoneType: "FIXED_DATE",
      sortOrder: 0,
    },
    {
      milestoneKey: "bidFeeSubmissionDate",
      label: "Bid fee submission deadline",
      dateField: "bidFeeSubmissionDate",
      milestoneType: "FIXED_DATE",
      sortOrder: 1,
    },
    {
      milestoneKey: "bidOpenDate",
      label: "Bid opening",
      dateField: "bidOpenDate",
      milestoneType: "FIXED_DATE",
      sortOrder: 2,
    },
    {
      milestoneKey: "priceBidOpenDate",
      label: "Price bid opening",
      dateField: "priceBidOpenDate",
      milestoneType: "FIXED_DATE",
      sortOrder: 3,
    },
    {
      milestoneKey: "loaDueAfterLoi",
      label: "LOA issuance (after LOI)",
      milestoneType: "OFFSET_FROM_ANCHOR",
      anchorDateField: "loiIssuedDate",
      sortOrder: 4,
    },
    {
      milestoneKey: "bidValidityDate",
      label: "Bid validity expiry",
      dateField: "bidValidityDate",
      milestoneType: "FIXED_DATE",
      sortOrder: 5,
    },
    {
      milestoneKey: "scheduledInitiationDate",
      label: "Work initiation",
      dateField: "scheduledInitiationDate",
      milestoneType: "FIXED_DATE",
      sortOrder: 6,
    },
    {
      milestoneKey: "scheduledCompletionDate",
      label: "Work completion",
      dateField: "scheduledCompletionDate",
      milestoneType: "FIXED_DATE",
      sortOrder: 7,
    },
  ];
  for (const m of milestones) {
    await prisma.reminderRule.upsert({
      where: { milestoneKey: m.milestoneKey },
      update: m,
      create: {
        ...m,
        enabled: true,
        upcomingDays: 7,
        almostDueDays: 3,
        criticalDays: 1,
        remindDaysBefore: [14, 7, 3, 1, 0],
        repeatEveryDays: 0,
        notifyInApp: true,
        sendEmail: true,
      },
    });
  }

  const categories = ["Ex-work", "FOB", "CIFPOD", "at Site"];
  for (let i = 0; i < categories.length; i++) {
    const existing = await prisma.workDayCategory.findFirst({ where: { name: categories[i] } });
    if (!existing) {
      await prisma.workDayCategory.create({ data: { name: categories[i], sortOrder: i } });
    }
  }

  const currencies = [
    { code: "NPR", name: "Nepalese Rupee", symbol: "NPR", sortOrder: 0 },
    { code: "USD", name: "US Dollar", symbol: "USD", sortOrder: 1 },
  ];
  for (const currency of currencies) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: { name: currency.name, symbol: currency.symbol, sortOrder: currency.sortOrder },
      create: currency,
    });
  }

  const paymentConditions = [
    { code: "ADVANCE", name: "Advance payment", sortOrder: 0 },
    { code: "ON_DELIVERY", name: "On delivery", sortOrder: 1 },
    { code: "MILESTONE", name: "Milestone based", sortOrder: 2 },
  ];
  for (const item of paymentConditions) {
    await prisma.paymentCondition.upsert({
      where: { code: item.code },
      update: { name: item.name, sortOrder: item.sortOrder },
      create: item,
    });
  }

  const bidderFields = [
    { key: "name", label: "Bidder Name", required: true, sortOrder: 0 },
    { key: "address", label: "Address", required: true, sortOrder: 1 },
    { key: "phone", label: "Phone", required: false, sortOrder: 2 },
  ];
  for (const field of bidderFields) {
    await prisma.bidderFieldDefinition.upsert({
      where: { key: field.key },
      update: field,
      create: field,
    });
  }

  await prisma.emailTemplate.upsert({
    where: { key: "reminder" },
    update: {},
    create: {
      key: "reminder",
      subject: "PPMS Reminder: {{milestone}}",
      bodyHtml:
        "<p>Dear team,</p><p>The procurement <strong>{{title}}</strong> has an upcoming milestone: <strong>{{milestone}}</strong> on <strong>{{date}}</strong>.</p><p>Severity: {{severity}}</p>",
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });


