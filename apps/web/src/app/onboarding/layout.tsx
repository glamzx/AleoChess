export default function OnboardingLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-pale via-white to-pale">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-8 pt-8">
        {children}
      </div>
    </div>
  );
}
