import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { VendorReviewItemModel, VendorReviewMetricsModel } from './models/vendor-review.model';
import { VendorReviewsService } from './vendor-reviews.service';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentVendor } from '../vendor-auth/decorators/current-vendor.decorator';
import { VendorAuthGuard } from '../vendor-auth/guards/vendor-auth.guard';

import type { AuthVendorUser } from '../vendor-auth/auth-vendor-user';

@Resolver()
export class VendorReviewsResolver {
  constructor(private readonly reviewsService: VendorReviewsService) {}

  @Public()
  @UseGuards(VendorAuthGuard)
  @Query(() => [VendorReviewItemModel], {
    name: 'vendorReviews',
    description: 'List verified customer reviews for restaurant or branch',
  })
  async vendorReviews(
    @CurrentVendor() user: AuthVendorUser,
    @Args('restaurantId', { nullable: true }) restaurantId?: string,
    @Args('branchId', { nullable: true }) branchId?: string,
  ): Promise<VendorReviewItemModel[]> {
    const targetRestaurantId = restaurantId || user.restaurantId;
    return this.reviewsService.listReviews(targetRestaurantId, branchId);
  }

  @Public()
  @UseGuards(VendorAuthGuard)
  @Query(() => VendorReviewMetricsModel, {
    name: 'vendorReviewMetrics',
    description: 'Culinary quality scores, sensory temperature retention, and speed ratings',
  })
  async vendorReviewMetrics(
    @CurrentVendor() user: AuthVendorUser,
    @Args('restaurantId', { nullable: true }) restaurantId?: string,
  ): Promise<VendorReviewMetricsModel> {
    const targetRestaurantId = restaurantId || user.restaurantId;
    return this.reviewsService.getReviewMetrics(targetRestaurantId);
  }

  @Public()
  @UseGuards(VendorAuthGuard)
  @Mutation(() => VendorReviewItemModel, {
    name: 'vendorReplyReview',
    description: 'Post official kitchen reply to guest review',
  })
  async vendorReplyReview(
    @Args('reviewId') reviewId: string,
    @Args('reply') reply: string,
  ): Promise<VendorReviewItemModel> {
    return this.reviewsService.replyToReview(reviewId, reply);
  }
}
