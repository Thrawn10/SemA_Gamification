import type { ComponentFixture } from '@angular/core/testing';

/** Polls change detection until an asynchronous page has rendered. */
export async function warteBis(
  fixture: ComponentFixture<unknown>,
  pruefung: () => void,
): Promise<void> {
  await vi.waitFor(
    () => {
      fixture.detectChanges();
      pruefung();
    },
    { timeout: 5000 },
  );
}

export function element(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}
