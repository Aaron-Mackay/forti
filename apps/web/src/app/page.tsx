import React from "react";
import LinkButton from "@/components/LinkButton";
import {getServerSession} from "next-auth/next";
import {redirect} from "next/navigation";

export default async function PublicPage() {
  const session = await getServerSession()
  if (session) redirect("/user")
  return (
    <>
      <h1 className="text-2xl font-bold mb-4">{"Public Page for non-signed in users"}</h1>
      <LinkButton
        href={'/login'}
        variant="contained"
      >
        Go to Login
      </LinkButton>
    </>
  );
}