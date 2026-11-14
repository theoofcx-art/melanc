import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/messages_/$userId")({
  beforeLoad: ({ params }) => { throw redirect({ to: "/direct/$userId", params: { userId: params.userId } }); },
});
