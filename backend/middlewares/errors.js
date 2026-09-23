export function errors(error, req, res, next) {
  if (res.headersSent) return next(error);
  console.error('Request failed:', req.method, req.path, error.name);
  res.status(500).json({ message: 'The application could not load its data. Check the source files and try again.' });
}
