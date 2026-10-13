import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Historical or scheduled batch disbursement record' })
export class VendorPayoutRecordModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { description: 'Batch week interval e.g. Oct 17 – Oct 23, 2025' })
  period!: string;

  @Field(() => Float, { description: 'Gross sales value in PKR' })
  grossSales!: number;

  @Field(() => Float, { description: 'Platform fee percentage basis e.g. 0.12' })
  platformFeeRate!: number;

  @Field(() => Float, { description: 'Deducted platform fee amount in PKR' })
  platformFeeAmount!: number;

  @Field(() => Float, { description: 'Sindh SRB withholding in PKR' })
  srbTax!: number;

  @Field(() => Float, { description: 'Net disbursed PKR deposit into merchant account' })
  netPayout!: number;

  @Field(() => String, { description: 'SCHEDULED | SETTLED | PROCESSING' })
  status!: string;

  @Field(() => String, { description: 'Banking transaction reference wire' })
  referenceId!: string;

  @Field(() => String)
  disbursementDate!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Disbursement target account e.g. HBL • *4092',
  })
  bankAccount?: string | null;
}

@ObjectType({ description: 'Executive sales and disbursement ledger summary' })
export class VendorPayoutSummaryModel {
  @Field(() => Float, { description: 'Next scheduled direct credit amount in PKR' })
  nextPayoutAmount!: number;

  @Field(() => String, { nullable: true, description: 'Next scheduled settlement date' })
  nextPayoutDate?: string | null;

  @Field(() => Float, { description: "Current calendar month's net earnings in PKR" })
  monthNetEarnings!: number;

  @Field(() => Float, { description: 'Flat marketplace take rate percentage (12%)' })
  platformFeePercent!: number;

  @Field(() => String, { nullable: true })
  bankAccountSummary?: string | null;
}

@ObjectType({ description: 'Vendor earnings summary for commission and net payout' })
export class VendorEarningsSummaryModel {
  @Field(() => Float, { description: 'Gross sales value in PKR' })
  grossSales!: number;

  @Field(() => Float, { description: 'Platform fee deductions in PKR' })
  platformFeeDeductions!: number;

  @Field(() => Float, { description: 'Net payable amount in PKR' })
  netPayable!: number;

  @Field(() => Float, { description: 'Commission basis points e.g. 1500' })
  platformCommissionBasisPoints!: number;
}
