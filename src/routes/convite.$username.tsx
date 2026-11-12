import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/convite/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} te convidou para a Melan 🍉` },
      { name: "description", content: "Entre na Melan pelo convite e ganhe a moldura Arco-íris." },
      { property: "og:title", content: `@${params.username} te convidou para a Melan 🍉` },
      { property: "og:description", content: "Entre na Melan pelo convite e ganhe a moldura Arco-íris." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Invite,
});

function Invite() {
  const { username } = Route.useParams();
  const [done, setDone] = useState(false);
  useEffect(() => {
    localStorage.setItem("melan-ref", username.toLowerCase());
    setDone(true);
  }, [username]);
  if (!done) return <p className="p-10 text-center text-muted-foreground">Abrindo convite…</p>;
  return <Navigate to="/auth" search={{ mode: "signup" }} replace />;
}
