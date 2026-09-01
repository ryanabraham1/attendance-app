import { redirect } from "next/navigation";
import { isLead } from "@/lib/auth";

export default async function Home() {
  redirect((await isLead()) ? "/members" : "/login");
}
