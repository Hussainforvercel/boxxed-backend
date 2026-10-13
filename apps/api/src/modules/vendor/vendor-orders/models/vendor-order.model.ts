import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Order ticket for counter pickup fulfillment' })
export class VendorOrderItemModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { description: 'Ticket number e.g. BX-9042 or ORD-9401' })
  orderNumber!: string;

  @Field(() => String)
  customerName!: string;

  @Field(() => String)
  customerPhone!: string;

  @Field(() => String)
  boxTitle!: string;

  @Field(() => String)
  boxSeries!: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Float, { description: 'Total settlement amount in PKR' })
  totalAmount!: number;

  @Field(() => String, { description: '4-digit guest verification pass' })
  otp!: string;

  @Field(() => String, { description: 'Counter rack slot assignment' })
  rackLocation!: string;

  @Field(() => String, { description: 'PREPARING | AWAITING_PICKUP | COMPLETED | NO_SHOW' })
  status!: string;

  @Field(() => String)
  scheduledTime!: string;

  @Field(() => String)
  orderTime!: string;

  @Field(() => String, { nullable: true })
  completedTime?: string | null;
}

@ObjectType({ description: 'Counter QR pass or ticket verification result' })
export class VendorOrderVerificationResultModel {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;

  @Field(() => VendorOrderItemModel, { nullable: true })
  order?: VendorOrderItemModel | null;
}
