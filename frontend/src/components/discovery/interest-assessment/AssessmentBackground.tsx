export function AssessmentBackground() {
  return (
    <div className="absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-200 rounded-full opacity-20 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-200 rounded-full opacity-20 blur-3xl animate-pulse" />
    </div>
  );
}
