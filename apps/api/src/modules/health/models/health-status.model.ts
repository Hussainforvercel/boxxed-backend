import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum DependencyStatus {
  OK = 'OK',
  ERROR = 'ERROR',
}

registerEnumType(DependencyStatus, { name: 'DependencyStatus' });

@ObjectType({ description: 'Same checks as GET /health/ready.' })
export class HealthStatus {
  @Field(() => DependencyStatus)
  status!: DependencyStatus;

  @Field(() => DependencyStatus)
  db!: DependencyStatus;

  @Field(() => DependencyStatus)
  redis!: DependencyStatus;
}
