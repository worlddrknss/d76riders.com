import { createNewsPostAction } from "@/app/admin/content/new/actions";
import { CreateNewsPostForm } from "@/components/admin/create-news-post-form";

export default function AdminNewsNewPage() {
  return (
    <CreateNewsPostForm
      action={createNewsPostAction}
      heading="Create News Post"
      description="Publish a new public news article to the District 76 site using the same WYSIWYG foundation as Vara Performance."
      submitLabel="Publish News Post"
    />
  );
}
