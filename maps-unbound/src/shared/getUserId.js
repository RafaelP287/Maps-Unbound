export const getUserId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return getUserId(value._id);
  if (value.id) return getUserId(value.id);
  if (value.$oid) return value.$oid;
  const stringValue = value.toString?.();
  return stringValue && stringValue !== "[object Object]" ? stringValue : "";
};
