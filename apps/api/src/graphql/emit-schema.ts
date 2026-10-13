import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { NestFactory } from '@nestjs/core';
import { GraphQLSchemaBuilderModule, GraphQLSchemaFactory } from '@nestjs/graphql';

import { printSchema } from './print-schema';
import { RESOLVERS } from './resolvers';

/** Writes packages/shared/schema.graphql from the code-first definitions. No DB/Redis needed. */
async function emit(): Promise<void> {
  const app = await NestFactory.createApplicationContext(GraphQLSchemaBuilderModule, {
    logger: false,
  });
  const schema = await app.get(GraphQLSchemaFactory).create(RESOLVERS);
  const target = resolve(__dirname, '../../../../packages/shared/schema.graphql');
  writeFileSync(target, printSchema(schema));
  await app.close();
}

void emit();
