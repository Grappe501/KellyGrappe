
// app/src/shared/utils/visitorId.ts
export function getVisitorId(): string {
  const key = "KG_VISITOR_ID_v1";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
    document.cookie = `kg_vid=${id}; path=/; max-age=31536000`;
  }
  return id;
}
