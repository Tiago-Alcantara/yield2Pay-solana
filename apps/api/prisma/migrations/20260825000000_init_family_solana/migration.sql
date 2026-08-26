-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SubCategory" AS ENUM ('streaming', 'utility', 'education', 'other');

-- CreateTable
CREATE TABLE "households" (
    "id" TEXT NOT NULL,
    "privy_user_id" TEXT NOT NULL,
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_owner" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "solana_address" TEXT NOT NULL,
    "usdc_token_account" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposits" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "tx_signature" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subs" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "member_id" TEXT,
    "name" TEXT NOT NULL,
    "monthly_cost" BIGINT NOT NULL,
    "category" "SubCategory" NOT NULL DEFAULT 'streaming',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vault_positions" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "protocol" TEXT NOT NULL DEFAULT 'kamino',
    "reserve_address" TEXT,
    "shares" BIGINT NOT NULL DEFAULT 0,
    "underlying_value" BIGINT NOT NULL DEFAULT 0,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vault_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yield_snapshots" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "vault_value" BIGINT NOT NULL,
    "principal" BIGINT NOT NULL,
    "spendable" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "yield_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "households_privy_user_id_key" ON "households"("privy_user_id");

-- CreateIndex
CREATE INDEX "members_household_id_idx" ON "members"("household_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_household_id_key" ON "wallets"("household_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_solana_address_key" ON "wallets"("solana_address");

-- CreateIndex
CREATE UNIQUE INDEX "deposits_tx_signature_key" ON "deposits"("tx_signature");

-- CreateIndex
CREATE INDEX "deposits_household_id_idx" ON "deposits"("household_id");

-- CreateIndex
CREATE INDEX "subs_household_id_priority_idx" ON "subs"("household_id", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "vault_positions_household_id_key" ON "vault_positions"("household_id");

-- CreateIndex
CREATE INDEX "yield_snapshots_household_id_created_at_idx" ON "yield_snapshots"("household_id", "created_at");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subs" ADD CONSTRAINT "subs_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subs" ADD CONSTRAINT "subs_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_positions" ADD CONSTRAINT "vault_positions_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yield_snapshots" ADD CONSTRAINT "yield_snapshots_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

