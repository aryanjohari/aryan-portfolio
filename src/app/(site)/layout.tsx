export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <main id="main" className="site-main">{children}</main>;
}
