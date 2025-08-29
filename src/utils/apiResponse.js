function apiResponse({
  data = null,
  message = "Success",
  meta = undefined,
  status = "success",
}) {
  const response = { status, message, data };
  if (meta !== undefined) response.meta = meta;
  return response;
}

module.exports = apiResponse;
