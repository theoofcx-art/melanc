import { render, cleanup } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: { component: ComponentType }) => ({
    options,
    useParams: () => ({ userId: "recipient" }),
  }),
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [], isSuccess: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@/lib/auth", () => ({ useMe: () => ({ user: { id: "sender" } }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: vi.fn(),
  },
}));
vi.mock("@/components/melan/Avatar", () => ({ UserAvatar: () => null, Verified: () => null }));
vi.mock("@/components/melan/Stickers", () => ({ Sticker: () => null, StickerPicker: () => null }));
vi.mock("@/components/melan/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { Route as DirectRoute } from "@/routes/_authenticated/direct.$userId";
import { Route as WypRoute } from "@/routes/_authenticated/wyp";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Chat scrolling effect cleanup", () => {
  for (const [name, route] of [["Direct", DirectRoute], ["Wyp", WypRoute]] as const) {
    it(`${name} unmounts safely when scrollIntoView is wrapped by the browser`, () => {
      // Some browser wrappers return a Promise instead of the native undefined.
      const scroll = vi.fn(() => Promise.resolve());
      Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: scroll });
      const Component = route.options.component as ComponentType;
      const view = render(<Component />);
      expect(scroll).toHaveBeenCalledWith({ behavior: "smooth" });
      expect(() => view.unmount()).not.toThrow();
    });
  }
});