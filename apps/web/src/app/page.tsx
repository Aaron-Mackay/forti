import React from "react";
import Link from "next/link";
import Button from "@mui/material/Button";
import {getServerSession} from "next-auth/next";
import {redirect} from "next/navigation";

export default async function PublicPage() {
  const session = await getServerSession()
  if (session) redirect("/user")
  return (
    <>
      <h1 className="text-2xl font-bold mb-4">{"Public Page for non-signed in users"}</h1>
      <Button
        component={Link}
        href={'/login'}
        variant="contained"
      >
        Go to Login
      </Button>
    </>
  );
}