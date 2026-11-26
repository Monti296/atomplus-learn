import { SetMetadata } from '@nestjs/common';

export const ALLOW_DURING_PASSWORD_CHANGE_KEY = 'allowDuringPasswordChange';

// Routes without this marker are refused while the user must change their password (SR-2).
export const AllowDuringPasswordChange = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ALLOW_DURING_PASSWORD_CHANGE_KEY, true);
