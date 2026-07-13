import { redirect } from "next/navigation";

export default function VideosIndexPage() {
  redirect("/videos/mine");
}
