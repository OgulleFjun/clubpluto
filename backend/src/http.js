export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function asyncRoute(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function param(value) {
  return Array.isArray(value) ? value[0] : value;
}
