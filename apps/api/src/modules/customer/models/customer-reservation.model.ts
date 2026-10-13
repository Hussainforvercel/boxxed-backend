import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

import { CustomerDropModel } from './customer-drop.model';

@ObjectType({ description: 'Customer booking confirmation and reservation pass' })
export class CustomerReservationModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { description: 'Reference order number e.g. BX-9042' })
  orderNumber!: string;

  @Field(() => String, { description: 'Booking reference code e.g. BX-9042' })
  referenceCode!: string;

  @Field(() => String, { description: '4-digit pickup OTP pass e.g. 4819' })
  pickupOtp!: string;

  @Field(() => String, { description: 'Station rack allocation e.g. Rack #01' })
  rackLocation!: string;

  @Field(() => String, { description: 'Order fulfillment status e.g. READY_FOR_PICKUP' })
  status!: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Int, { description: 'Total price in minor units (e.g. 65000)' })
  priceMinor!: number;

  @Field(() => Float, { description: 'Total price in PKR (e.g. 650)' })
  price!: number;

  @Field(() => String)
  currency!: string;

  @Field(() => Date)
  holdExpiresAt!: Date;

  @Field(() => Int, { description: 'Units remaining in drop after reservation (e.g. 7)' })
  remainingQuantity!: number;

  @Field(() => String)
  customerName!: string;

  @Field(() => String)
  customerPhone!: string;

  @Field(() => CustomerDropModel)
  drop!: CustomerDropModel;
}
