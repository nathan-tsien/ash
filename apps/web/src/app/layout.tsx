/** Root passes through localized layouts under `[locale]` (fonts, globals, tooltip, intl). */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
