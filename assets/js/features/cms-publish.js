import { supabase, getUser } from "../supabase.js";

function slugify(text) {
  return String(text || "artikel")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function publishToCMS(article) {
  const user = await getUser();
  if (!user) throw new Error("User belum login.");

  const payload = {
    user_id: user.id,
    article_id: article.id || null,
    title: article.title,
    slug: slugify(article.title),
    content: article.body,
    excerpt: article.lead || "",
    seo_keywords: article.seo_keywords || [],
    status: "published",
    published_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("cms_posts")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
