import { env } from '@/lib/env';
import { localRepo } from './local';
// import { httpRepo } from './http';  // enable in STEP-13
import type { Repository } from './repository';

export const repo: Repository = env.useApi ? localRepo : localRepo;
