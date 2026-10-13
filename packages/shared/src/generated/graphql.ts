export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: string; output: string; }
};

export type AcceptConsentsInput = {
  privacyVersion: Scalars['String']['input'];
  termsVersion: Scalars['String']['input'];
  whatsappMarketing: Scalars['Boolean']['input'];
};

/** Authentication payload for Super Admin session */
export type AdminAuthPayload = {
  __typename?: 'AdminAuthPayload';
  accessToken: Scalars['String']['output'];
  adminUser: AdminUserModel;
};

/** Branch-level catalog item availability override */
export type AdminBranchMenuOverrideModel = {
  __typename?: 'AdminBranchMenuOverrideModel';
  branchId: Scalars['String']['output'];
  customPriceMinor: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  isAvailable: Scalars['Boolean']['output'];
  masterItem: Maybe<AdminMasterMenuItemModel>;
  masterMenuItemId: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/** Branch summary on a box drop */
export type AdminDropBranchSummaryModel = {
  __typename?: 'AdminDropBranchSummaryModel';
  id: Scalars['ID']['output'];
  internalCode: Scalars['String']['output'];
  name: Scalars['String']['output'];
  restaurantId: Scalars['String']['output'];
};

/** Administrative box drop entity */
export type AdminDropModel = {
  __typename?: 'AdminDropModel';
  branch: Maybe<AdminDropBranchSummaryModel>;
  branchId: Scalars['String']['output'];
  categoryTag: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  currency: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  discountTier: Scalars['String']['output'];
  headlineItem: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  imageUrl: Maybe<Scalars['String']['output']>;
  originalPriceMinor: Scalars['Int']['output'];
  pickupEnd: Scalars['DateTime']['output'];
  pickupSlotDuration: Maybe<Scalars['String']['output']>;
  pickupStart: Scalars['DateTime']['output'];
  postmortemNotes: Maybe<Scalars['String']['output']>;
  priceMinor: Scalars['Int']['output'];
  publishedAt: Maybe<Scalars['DateTime']['output']>;
  remainingQuantity: Scalars['Int']['output'];
  sku: Scalars['String']['output'];
  status: DropStatus;
  title: Scalars['String']['output'];
  totalQuantity: Scalars['Int']['output'];
};

/** Waste reduction and salvage postmortem on expired drops */
export type AdminDropPostmortemModel = {
  __typename?: 'AdminDropPostmortemModel';
  dropId: Scalars['ID']['output'];
  notes: Maybe<Scalars['String']['output']>;
  revenueMinor: Scalars['Int']['output'];
  salvageRatePercent: Scalars['Float']['output'];
  soldQuantity: Scalars['Int']['output'];
  totalQuantity: Scalars['Int']['output'];
  unsoldQuantity: Scalars['Int']['output'];
  wasteKgEstimated: Scalars['Float']['output'];
};

/** Reservation claim record on a box drop */
export type AdminDropReservationModel = {
  __typename?: 'AdminDropReservationModel';
  collectedAt: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  customerName: Scalars['String']['output'];
  customerPhone: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  orderNumber: Scalars['String']['output'];
  priceMinor: Scalars['Int']['output'];
  quantity: Scalars['Int']['output'];
  referenceCode: Scalars['String']['output'];
  status: OrderStatus;
};

/** Real-time fulfillment gauge for current operational window */
export type AdminLiveTodayModel = {
  __typename?: 'AdminLiveTodayModel';
  awaitingPickupPercent: Scalars['Float']['output'];
  noShowPercent: Scalars['Float']['output'];
  pickedUpPercent: Scalars['Float']['output'];
  totalReservations: Scalars['Int']['output'];
};

/** Credentials for admin authentication */
export type AdminLoginInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

/** Master canonical menu item */
export type AdminMasterMenuItemModel = {
  __typename?: 'AdminMasterMenuItemModel';
  basePriceMinor: Scalars['Int']['output'];
  category: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  gstRateBasisPoints: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  imageUrl: Maybe<Scalars['String']['output']>;
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  restaurantId: Scalars['String']['output'];
  sku: Scalars['String']['output'];
  specNarrative: Scalars['String']['output'];
};

/** Immediate operational alerts requiring admin intervention */
export type AdminNeedsAttentionModel = {
  __typename?: 'AdminNeedsAttentionModel';
  expiringSoonDropsCount: Scalars['Int']['output'];
  pendingComplaintsCount: Scalars['Int']['output'];
  zeroDropsBranchesCount: Scalars['Int']['output'];
};

/** Executive operational KPIs for admin dashboard */
export type AdminOverviewKpisModel = {
  __typename?: 'AdminOverviewKpisModel';
  activeBoxesCount: Scalars['Int']['output'];
  activeRestaurantsCount: Scalars['Int']['output'];
  noShowsTodayCount: Scalars['Int']['output'];
  todayReservationsCount: Scalars['Int']['output'];
};

/** Role-based access level within Super Admin console */
export type AdminRole =
  | 'COMPLIANCE_AUDITOR'
  | 'FINANCE_VIEWER'
  | 'OPERATIONS'
  | 'SUPER_ADMIN';

/** Super Admin User Profile */
export type AdminUserModel = {
  __typename?: 'AdminUserModel';
  email: Scalars['String']['output'];
  fullName: Scalars['String']['output'];
  hqLocation: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  lastLoginAt: Maybe<Scalars['DateTime']['output']>;
  role: AdminRole;
  title: Maybe<Scalars['String']['output']>;
};

export type AuthPayload = {
  __typename?: 'AuthPayload';
  accessToken: Scalars['String']['output'];
  accessTokenExpiresAt: Scalars['DateTime']['output'];
  isNewUser: Scalars['Boolean']['output'];
  refreshToken: Scalars['String']['output'];
  user: User;
};

export type BillingCadence =
  | 'CALENDAR_MONTH'
  | 'FOUR_WEEKS';

/** Physical branch node with real-time operational metrics */
export type BranchDetailModel = {
  __typename?: 'BranchDetailModel';
  activeDropsCount: Scalars['Int']['output'];
  address: Scalars['String']['output'];
  email: Scalars['String']['output'];
  geofenceRadiusKm: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  internalCode: Scalars['String']['output'];
  isThrottled: Scalars['Boolean']['output'];
  latitude: Scalars['Float']['output'];
  liveBoxesCount: Scalars['Int']['output'];
  locationArea: Scalars['String']['output'];
  longitude: Scalars['Float']['output'];
  maxOrdersPerHour: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  orderIngestionEnabled: Scalars['Boolean']['output'];
  phone: Scalars['String']['output'];
  prepBufferMinutes: Scalars['Int']['output'];
  restaurant: Maybe<BranchRestaurantSummaryModel>;
  restaurantId: Scalars['String']['output'];
  schedules: Maybe<Array<BranchOperatingScheduleModel>>;
  slug: Scalars['String']['output'];
  status: BranchStatus;
  todayReservationsCount: Scalars['Int']['output'];
};

/** Physical branch node */
export type BranchModel = {
  __typename?: 'BranchModel';
  address: Scalars['String']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  internalCode: Scalars['String']['output'];
  isThrottled: Scalars['Boolean']['output'];
  locationArea: Scalars['String']['output'];
  name: Scalars['String']['output'];
  orderIngestionEnabled: Scalars['Boolean']['output'];
  phone: Scalars['String']['output'];
  prepBufferMinutes: Scalars['Int']['output'];
  schedules: Maybe<Array<Maybe<BranchOperatingScheduleModel>>>;
  slug: Scalars['String']['output'];
  status: BranchStatus;
};

/** Branch operating schedule day */
export type BranchOperatingScheduleModel = {
  __typename?: 'BranchOperatingScheduleModel';
  closeTime: Scalars['String']['output'];
  dayOfWeek: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  isClosed: Scalars['Boolean']['output'];
  openTime: Scalars['String']['output'];
};

/** Restaurant parent brief for branch */
export type BranchRestaurantSummaryModel = {
  __typename?: 'BranchRestaurantSummaryModel';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  partnerNumber: Scalars['String']['output'];
  slug: Scalars['String']['output'];
};

/** Day operating schedule input */
export type BranchScheduleDayInput = {
  closeTime: Scalars['String']['input'];
  dayOfWeek: Scalars['Int']['input'];
  isClosed?: Scalars['Boolean']['input'];
  openTime: Scalars['String']['input'];
};

/** Branch staff membership record */
export type BranchStaffModel = {
  __typename?: 'BranchStaffModel';
  branchId: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  role: StaffRole;
  status: StaffStatus;
};

export type BranchStatus =
  | 'ACTIVE'
  | 'BUSY_THROTTLED'
  | 'CLOSED_EMERGENCY'
  | 'INACTIVE';

export type ConsentKind =
  | 'PRIVACY'
  | 'TERMS'
  | 'WHATSAPP_MARKETING';

export type ConsentState = {
  __typename?: 'ConsentState';
  granted: Scalars['Boolean']['output'];
  kind: ConsentKind;
  updatedAt: Scalars['DateTime']['output'];
  version: Scalars['String']['output'];
};

/** Payload for creating a new mystery box drop */
export type CreateDropInput = {
  branchId: Scalars['String']['input'];
  categoryTag: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  discountTier?: Scalars['String']['input'];
  headlineItem: Scalars['String']['input'];
  originalPriceMinor: Scalars['Int']['input'];
  pickupEnd: Scalars['DateTime']['input'];
  pickupSlotDuration?: InputMaybe<Scalars['String']['input']>;
  pickupStart: Scalars['DateTime']['input'];
  priceMinor: Scalars['Int']['input'];
  title: Scalars['String']['input'];
  totalQuantity: Scalars['Int']['input'];
};

/** Initial master dish input */
export type CreateInitialMasterItemInput = {
  basePriceMinor: Scalars['Int']['input'];
  category: Scalars['String']['input'];
  gstRateBasisPoints?: Scalars['Int']['input'];
  name: Scalars['String']['input'];
  specNarrative: Scalars['String']['input'];
};

/** Payload for adding a canonical dish to master catalog */
export type CreateMasterMenuItemInput = {
  basePriceMinor: Scalars['Int']['input'];
  category: Scalars['String']['input'];
  gstRateBasisPoints?: Scalars['Int']['input'];
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  specNarrative: Scalars['String']['input'];
};

/** Payload for complete multi-step restaurant onboarding wizard */
export type CreateRestaurantOnboardingInput = {
  address: Scalars['String']['input'];
  altPhone?: InputMaybe<Scalars['String']['input']>;
  billingCadence?: BillingCadence;
  branchEmail?: InputMaybe<Scalars['String']['input']>;
  branchName?: InputMaybe<Scalars['String']['input']>;
  branchPhone?: InputMaybe<Scalars['String']['input']>;
  commissionRateBasisPoints?: Scalars['Int']['input'];
  contactEmail: Scalars['String']['input'];
  contactName: Scalars['String']['input'];
  contactPhone: Scalars['String']['input'];
  cuisine: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  geofenceRadiusKm?: Scalars['Float']['input'];
  gstRateBasisPoints?: Scalars['Int']['input'];
  gstRegistrationNumber?: InputMaybe<Scalars['String']['input']>;
  hqLedgerNotes?: InputMaybe<Scalars['String']['input']>;
  latitude?: Scalars['Float']['input'];
  locationArea: Scalars['String']['input'];
  longitude?: Scalars['Float']['input'];
  masterMenuItems?: InputMaybe<Array<CreateInitialMasterItemInput>>;
  monthlyFeeMinor?: Scalars['Int']['input'];
  name: Scalars['String']['input'];
  ntnNumber?: InputMaybe<Scalars['String']['input']>;
  onboardingFeeMinor?: Scalars['Int']['input'];
  onboardingFeeSettled?: Scalars['Boolean']['input'];
  schedules?: InputMaybe<Array<BranchScheduleDayInput>>;
};

export type DependencyStatus =
  | 'ERROR'
  | 'OK';

/** Lifecycle state of a box inventory drop */
export type DropStatus =
  | 'ACTIVE_DROP'
  | 'CANCELLED'
  | 'DRAFT_REVIEW'
  | 'SOLD_OUT'
  | 'UNSOLD_EXPIRED';

/** Same checks as GET /health/ready. */
export type HealthStatus = {
  __typename?: 'HealthStatus';
  db: DependencyStatus;
  redis: DependencyStatus;
  status: DependencyStatus;
};

/** Payload for inviting a branch staff member */
export type InviteBranchStaffInput = {
  branchId: Scalars['String']['input'];
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  role?: StaffRole;
};

export type LegalDocument = {
  __typename?: 'LegalDocument';
  kind: LegalDocumentKind;
  url: Scalars['String']['output'];
  version: Scalars['String']['output'];
};

export type LegalDocumentKind =
  | 'PRIVACY'
  | 'TERMS';

/** Master menu catalog dish */
export type MasterMenuItemModel = {
  __typename?: 'MasterMenuItemModel';
  basePriceMinor: Scalars['Int']['output'];
  category: Scalars['String']['output'];
  gstRateBasisPoints: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  sku: Scalars['String']['output'];
  specNarrative: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  acceptConsents: User;
  /** Emergency drop cancellation and reservation refund trigger */
  adminCancelDrop: AdminDropModel;
  /** Create draft box drop allocation with pricing and pickup slot */
  adminCreateDrop: AdminDropModel;
  /** Add canonical item to master catalog */
  adminCreateMasterMenuItem: AdminMasterMenuItemModel;
  /** Onboards a new restaurant partner and its primary branch atomically */
  adminCreateRestaurantWithBranch: RestaurantModel;
  /** Emergency shutdown: cancel active drops and close intake */
  adminEmergencyBranchShutdown: BranchDetailModel;
  /** Invite new staff member to branch management roster */
  adminInviteBranchStaff: BranchStaffModel;
  /** Authenticate Super Admin / Operations user and obtain administrative JWT */
  adminLogin: AdminAuthPayload;
  /** Publish draft drop to live customer application */
  adminPublishDrop: AdminDropModel;
  /** Toggle branch-level inclusion or exclusion of dish from mystery boxes */
  adminToggleBranchMenuItem: AdminBranchMenuOverrideModel;
  /** Instant killswitch toggle for customer reservations on a branch */
  adminToggleOrderIngestion: BranchDetailModel;
  /** Update rush-hour prep buffer minutes and throttling on branch */
  adminUpdateBranchThrottle: BranchDetailModel;
  refreshSession: AuthPayload;
  requestOtp: OtpChallenge;
  signInWithGoogle: AuthPayload;
  signOut: Scalars['Boolean']['output'];
  updateProfile: User;
  verifyOtp: AuthPayload;
};


export type MutationAcceptConsentsArgs = {
  input: AcceptConsentsInput;
};


export type MutationAdminCancelDropArgs = {
  dropId: Scalars['String']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};


export type MutationAdminCreateDropArgs = {
  input: CreateDropInput;
};


export type MutationAdminCreateMasterMenuItemArgs = {
  input: CreateMasterMenuItemInput;
  restaurantId: Scalars['String']['input'];
};


export type MutationAdminCreateRestaurantWithBranchArgs = {
  input: CreateRestaurantOnboardingInput;
};


export type MutationAdminEmergencyBranchShutdownArgs = {
  branchId: Scalars['String']['input'];
};


export type MutationAdminInviteBranchStaffArgs = {
  input: InviteBranchStaffInput;
};


export type MutationAdminLoginArgs = {
  input: AdminLoginInput;
};


export type MutationAdminPublishDropArgs = {
  dropId: Scalars['String']['input'];
};


export type MutationAdminToggleBranchMenuItemArgs = {
  branchId: Scalars['String']['input'];
  isAvailable: Scalars['Boolean']['input'];
  masterMenuItemId: Scalars['String']['input'];
};


export type MutationAdminToggleOrderIngestionArgs = {
  branchId: Scalars['String']['input'];
  enabled: Scalars['Boolean']['input'];
};


export type MutationAdminUpdateBranchThrottleArgs = {
  input: UpdateBranchThrottleInput;
};


export type MutationRefreshSessionArgs = {
  input: RefreshSessionInput;
};


export type MutationRequestOtpArgs = {
  input: RequestOtpInput;
};


export type MutationSignInWithGoogleArgs = {
  input: SignInWithGoogleInput;
};


export type MutationSignOutArgs = {
  input: SignOutInput;
};


export type MutationUpdateProfileArgs = {
  input: UpdateProfileInput;
};


export type MutationVerifyOtpArgs = {
  input: VerifyOtpInput;
};

export type OnboardingStep =
  | 'COMPLETE'
  | 'CONSENT'
  | 'PROFILE';

/** Customer order & reservation fulfillment state */
export type OrderStatus =
  | 'CANCELLED'
  | 'COMPLETED'
  | 'IN_KITCHEN'
  | 'NO_SHOW'
  | 'PENDING'
  | 'READY_FOR_PICKUP'
  | 'REFUNDED';

export type OtpChallenge = {
  __typename?: 'OtpChallenge';
  channel: OtpChannel;
  codeLength: Scalars['Int']['output'];
  expiresAt: Scalars['DateTime']['output'];
  maskedDestination: Scalars['String']['output'];
  resendAvailableAt: Scalars['DateTime']['output'];
};

export type OtpChannel =
  | 'EMAIL'
  | 'PHONE';

export type PartnerStatus =
  | 'ACTIVE'
  | 'INACTIVE_SEASONAL'
  | 'ONBOARDING'
  | 'SUSPENDED';

export type Query = {
  __typename?: 'Query';
  /** Detailed operational view of a physical branch */
  adminBranchDetail: BranchDetailModel;
  /** Weekly 7-day operating schedule for branch */
  adminBranchSchedule: Array<BranchOperatingScheduleModel>;
  /** Paginated list of branches with operational metrics */
  adminBranches: Array<BranchDetailModel>;
  /** Waste analysis and salvage report for drop */
  adminDropPostmortem: AdminDropPostmortemModel;
  /** Counter claim reservations ledger for a drop */
  adminDropReservations: Array<AdminDropReservationModel>;
  /** Filterable list of box drops with allocation details */
  adminDrops: Array<AdminDropModel>;
  /** Real-time fulfillment gauge across all branches for today */
  adminLiveToday: AdminLiveTodayModel;
  /** Fetch canonical menu items for brand */
  adminMasterMenu: Array<AdminMasterMenuItemModel>;
  /** Fetch current authenticated admin operator profile */
  adminMe: AdminUserModel;
  /** Critical operational issues needing immediate HQ intervention */
  adminNeedsAttention: AdminNeedsAttentionModel;
  /** High-level executive KPIs on inventory, reservations, and partner counts */
  adminOverviewKpis: AdminOverviewKpisModel;
  /** Fetch full 360 profile for a restaurant partner by ID or Slug */
  adminRestaurantDetail: RestaurantModel;
  /** List restaurant partners with optional search and status filtering */
  adminRestaurants: Array<RestaurantModel>;
  health: HealthStatus;
  legalDocuments: Array<LegalDocument>;
  me: User;
};


export type QueryAdminBranchDetailArgs = {
  id: Scalars['String']['input'];
};


export type QueryAdminBranchScheduleArgs = {
  branchId: Scalars['String']['input'];
};


export type QueryAdminBranchesArgs = {
  limit?: Scalars['Int']['input'];
  page?: Scalars['Int']['input'];
  restaurantId?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<BranchStatus>;
};


export type QueryAdminDropPostmortemArgs = {
  dropId: Scalars['String']['input'];
};


export type QueryAdminDropReservationsArgs = {
  dropId: Scalars['String']['input'];
};


export type QueryAdminDropsArgs = {
  branchId?: InputMaybe<Scalars['String']['input']>;
  discountTier?: InputMaybe<Scalars['String']['input']>;
  limit?: Scalars['Int']['input'];
  page?: Scalars['Int']['input'];
  status?: InputMaybe<DropStatus>;
};


export type QueryAdminMasterMenuArgs = {
  restaurantId: Scalars['String']['input'];
};


export type QueryAdminRestaurantDetailArgs = {
  id: Scalars['String']['input'];
};


export type QueryAdminRestaurantsArgs = {
  limit?: Scalars['Int']['input'];
  page?: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<PartnerStatus>;
};

export type RefreshSessionInput = {
  refreshToken: Scalars['String']['input'];
};

export type RequestOtpInput = {
  channel: OtpChannel;
  destination: Scalars['String']['input'];
};

/** Partner restaurant entity */
export type RestaurantModel = {
  __typename?: 'RestaurantModel';
  altPhone: Maybe<Scalars['String']['output']>;
  avatarBg: Maybe<Scalars['String']['output']>;
  avatarLetter: Scalars['String']['output'];
  billingCadence: BillingCadence;
  branches: Maybe<Array<Maybe<BranchModel>>>;
  branchesCount: Scalars['Int']['output'];
  commissionRateBasisPoints: Scalars['Int']['output'];
  contactEmail: Scalars['String']['output'];
  contactName: Scalars['String']['output'];
  contactPhone: Scalars['String']['output'];
  cuisine: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  gstRateBasisPoints: Scalars['Int']['output'];
  gstRegistrationNumber: Maybe<Scalars['String']['output']>;
  hqLedgerNotes: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  masterMenuItems: Maybe<Array<Maybe<MasterMenuItemModel>>>;
  monthlyFeeMinor: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  ntnNumber: Maybe<Scalars['String']['output']>;
  onboardingDate: Scalars['DateTime']['output'];
  onboardingFeeMinor: Scalars['Int']['output'];
  onboardingFeeSettled: Scalars['Boolean']['output'];
  partnerNumber: Scalars['String']['output'];
  slug: Scalars['String']['output'];
  status: PartnerStatus;
  subscription: SubscriptionTier;
};

export type SignInWithGoogleInput = {
  idToken: Scalars['String']['input'];
};

export type SignOutInput = {
  refreshToken: Scalars['String']['input'];
};

/** Branch staff authorization tier */
export type StaffRole =
  | 'BRANCH_MANAGER'
  | 'DISPATCH_OPERATOR'
  | 'KITCHEN_STAFF';

/** Staff invitation or activation lifecycle status */
export type StaffStatus =
  | 'ACTIVE'
  | 'INVITATION_PENDING'
  | 'REVOKED';

export type SubscriptionTier =
  | 'ACTIVE'
  | 'ENTERPRISE'
  | 'PAUSED'
  | 'TRIAL';

/** Payload for adjusting operational throttles */
export type UpdateBranchThrottleInput = {
  branchId: Scalars['String']['input'];
  isThrottled: Scalars['Boolean']['input'];
  prepBufferMinutes: Scalars['Int']['input'];
};

export type UpdateProfileInput = {
  fullName: Scalars['String']['input'];
};

export type User = {
  __typename?: 'User';
  consents: Array<ConsentState>;
  email: Maybe<Scalars['String']['output']>;
  emailVerified: Scalars['Boolean']['output'];
  fullName: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  onboardingStep: OnboardingStep;
  phoneE164: Maybe<Scalars['String']['output']>;
  phoneVerified: Scalars['Boolean']['output'];
  role: UserRole;
};

export type UserRole =
  | 'ADMIN'
  | 'CUSTOMER'
  | 'VENDOR_STAFF';

export type VerifyOtpInput = {
  channel: OtpChannel;
  code: Scalars['String']['input'];
  destination: Scalars['String']['input'];
};
