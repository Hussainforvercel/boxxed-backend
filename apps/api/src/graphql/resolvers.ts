import { AdminAnalyticsResolver } from '../modules/admin/admin-analytics/admin-analytics.resolver';
import { AdminAuthResolver } from '../modules/admin/admin-auth/admin-auth.resolver';
import { AdminBranchesResolver } from '../modules/admin/admin-branches/admin-branches.resolver';
import { AdminCatalogResolver } from '../modules/admin/admin-catalog/admin-catalog.resolver';
import { AdminDropsResolver } from '../modules/admin/admin-drops/admin-drops.resolver';
import { AdminRestaurantsResolver } from '../modules/admin/admin-restaurants/admin-restaurants.resolver';
import { AuthResolver } from '../modules/auth/auth.resolver';
import { ConsentResolver } from '../modules/consent/consent.resolver';
import { CustomerResolver } from '../modules/customer/customer.resolver';
import { HealthResolver } from '../modules/health/health.resolver';
import { UsersResolver } from '../modules/users/users.resolver';
import { VendorAuthResolver } from '../modules/vendor/vendor-auth/vendor-auth.resolver';
import { VendorDropsResolver } from '../modules/vendor/vendor-drops/vendor-drops.resolver';
import { VendorMenuResolver } from '../modules/vendor/vendor-menu/vendor-menu.resolver';
import { VendorOrdersResolver } from '../modules/vendor/vendor-orders/vendor-orders.resolver';
import { VendorOverviewResolver } from '../modules/vendor/vendor-overview/vendor-overview.resolver';
import { VendorPayoutsResolver } from '../modules/vendor/vendor-payouts/vendor-payouts.resolver';
import { VendorProfileResolver } from '../modules/vendor/vendor-profile/vendor-profile.resolver';
import { VendorReviewsResolver } from '../modules/vendor/vendor-reviews/vendor-reviews.resolver';

/**
 * Every resolver class, used by `schema:emit` to print the schema without booting the app.
 * An integration test asserts the running app's schema equals the emitted file, so a
 * resolver missing here fails CI.
 */
export const RESOLVERS = [
  HealthResolver,
  AuthResolver,
  UsersResolver,
  ConsentResolver,
  CustomerResolver,
  AdminAuthResolver,
  AdminRestaurantsResolver,
  AdminBranchesResolver,
  AdminDropsResolver,
  AdminCatalogResolver,
  AdminAnalyticsResolver,
  VendorAuthResolver,
  VendorOverviewResolver,
  VendorDropsResolver,
  VendorOrdersResolver,
  VendorMenuResolver,
  VendorPayoutsResolver,
  VendorReviewsResolver,
  VendorProfileResolver,
];
