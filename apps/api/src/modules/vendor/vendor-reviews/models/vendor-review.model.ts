import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Customer feedback and verified drop review' })
export class VendorReviewItemModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  customerName!: string;

  @Field(() => Int, { description: '1-5 star rating' })
  rating!: number;

  @Field(() => String)
  date!: string;

  @Field(() => String)
  boxName!: string;

  @Field(() => String)
  comment!: string;

  @Field(() => [String])
  tags!: string[];

  @Field(() => String, { nullable: true, description: 'Official response from the kitchen' })
  reply?: string | null;
}

@ObjectType({ description: 'Audit breakdown category score' })
export class VendorCulinaryAuditScoreModel {
  @Field(() => String)
  label!: string;

  @Field(() => String)
  score!: string;

  @Field(() => Int)
  percent!: number;
}

@ObjectType({ description: 'Guest satisfaction summary and sensory temperature metrics' })
export class VendorReviewMetricsModel {
  @Field(() => Float, { description: 'Average rating out of 5.0' })
  overallRating!: number;

  @Field(() => Int)
  totalReviewCount!: number;

  @Field(() => Float, { description: 'Percentage of positive guest recommendations' })
  positiveRecommendationPercent!: number;

  @Field(() => Float, { description: 'Temperature retention and seal satisfaction' })
  tasteScorePercent!: number;

  @Field(() => Float, { description: 'Average handover speed under 45s compliance' })
  speedScorePercent!: number;

  @Field(() => [VendorCulinaryAuditScoreModel])
  auditBreakdown!: VendorCulinaryAuditScoreModel[];
}
