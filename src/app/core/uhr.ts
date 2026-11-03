import { InjectionToken } from '@angular/core';

/** Returns the current point in time. Tests and the seed replace it with a fixed clock. */
export type UhrFn = () => Date;

export const UHR = new InjectionToken<UhrFn>('Uhr', {
  providedIn: 'root',
  factory: () => () => new Date(),
});
